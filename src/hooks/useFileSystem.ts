import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { validateNodes } from "../utils/schema";
import { db } from "../db/db";

export function useFileSystemInit() {
  const setNodesRaw = useAppStore((s) => s.setNodesRaw);

  useEffect(() => {
    async function init() {
      let savedDocs: Array<{ id: string; title: string; updatedAt: number }> = [];
      try {
        const stored = await db.documents.toArray();
        if (stored && stored.length > 0) {
          savedDocs = stored.map(d => ({ ...d, updatedAt: parseInt(d.updatedAt, 10) || Date.now() }));
        } else {
          // migrate from localstorage
          const ls = localStorage.getItem("puu_documents");
          if (ls) savedDocs = JSON.parse(ls);
        }
      } catch (err) {
        console.error("Failed to init documents from db", err);
      }

      if (savedDocs.length === 0) {
        savedDocs = [
          { id: "default", title: "New Document", updatedAt: Date.now() },
        ];
      } else {
        const seenDocIds = new Set<string>();
        savedDocs = savedDocs.reduce((acc: Array<{ id: string; title: string; updatedAt: number }>, doc: { id: string; title: string; updatedAt: number }) => {
          let id = doc.id;
          if (seenDocIds.has(id)) {
            id = generateId();
          }
          seenDocIds.add(id);
          acc.push({ ...doc, id });
          return acc;
        }, []);
      }
      useAppStore.setState({ documents: savedDocs });

      let active = localStorage.getItem("puu_active_file"); // migrate or use ls for active id

      if (!active || !savedDocs.find((d) => d.id === active)) {
        active = savedDocs[0].id;
      }
      useAppStore.setState({ activeFileId: active });
      localStorage.setItem("puu_active_file", active); // persist active id in ls since it's just one string

      let newNodes = INITIAL_NODES;
      try {
        const fileData = await db.files.get(active);
        let savedNodes = fileData?.nodes;
        if (!savedNodes) {
          const lsStr = localStorage.getItem(`puu_file_${active}`);
          if (lsStr) {
            savedNodes = JSON.parse(lsStr);
          } else if (active === "default") {
            const scribeStr = localStorage.getItem("scribe_nodes");
            if (scribeStr) savedNodes = JSON.parse(scribeStr);
          }
        }

        if (savedNodes) {
          const validated = validateNodes(savedNodes);
          if (validated.length > 0) {
            const seenIds = new Set<string>();
            newNodes = validated.reduce((acc: typeof INITIAL_NODES, n: (typeof INITIAL_NODES)[0], i: number) => {
              let id = n.id;
              if (seenIds.has(id)) {
                id = generateId();
              }
              seenIds.add(id);
              acc.push({
                ...n,
                id,
                order: n.order ?? i,
              });
              return acc;
            }, []);
          }
        }
      } catch (err) {
        console.error("Failed to load active file nodes", err);
      }

      setNodesRaw(newNodes);
      useAppStore.setState({ activeId: newNodes[0]?.id || null });
    }
    init();
  }, [setNodesRaw]);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Handle nodes or active file changing
      if (
        state.nodes !== prevState.nodes ||
        state.activeFileId !== prevState.activeFileId
      ) {
        const { activeFileId, nodes } = state;
        if (!activeFileId || nodes.length === 0) return;

        // Save active file changes tracking
        clearTimeout(timer);
        timer = setTimeout(() => {
          localStorage.setItem("puu_active_file", activeFileId);
          db.files.put({ id: activeFileId, nodes }).catch((err) => {
            console.error("Failed to save data into dexie", err);
          });
        }, 1000);

        // Update document title if needed
        const firstNode =
          nodes.find(
            (n) =>
              n.parentId === null && (n.order === 0 || n.order === undefined),
          ) || nodes[0];
        let newTitle = "Untitled";
        if (firstNode) {
          const lines = firstNode.content.split("\n");
          const firstHeading = lines.find((l) => l.startsWith("# "));
          if (firstHeading) {
            newTitle = firstHeading.replace(/^#\s+/, "").trim();
          } else {
            newTitle =
              firstNode.content.substring(0, 30).trim() +
              (firstNode.content.length > 30 ? "..." : "");
          }
        }
        if (!newTitle) newTitle = "Untitled";

        const docs = state.documents;
        const existing = docs.find((d) => d.id === activeFileId);
        if (!existing || existing.title !== newTitle) {
          setTimeout(() => {
            useAppStore.setState({
              documents: useAppStore
                .getState()
                .documents.map((d) =>
                  d.id === activeFileId
                    ? { ...d, title: newTitle, updatedAt: Date.now() }
                    : d,
                ),
            });
          }, 0);
        }
      }

      // Handle documents metadata changing
      if (state.documents !== prevState.documents) {
        if (state.documents.length > 0) {
          db.documents.bulkPut(
            state.documents.map(d => ({ ...d, updatedAt: String(d.updatedAt) }))
          ).catch(err => {
            console.error("Failed to save documents metadata", err);
          });
        }
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, []);
}

export function useFileSystemActions() {
  const switchFile = async (fileId: string) => {
    const state = useAppStore.getState();
    if (fileId === state.activeFileId) {
      useAppStore.setState({ fileMenuOpen: false });
      return;
    }

    let newNodes = INITIAL_NODES;
    try {
      const fileData = await db.files.get(fileId);
      let saved = fileData?.nodes;
      if (!saved) {
        const ls = localStorage.getItem(`puu_file_${fileId}`);
        if (ls) saved = JSON.parse(ls);
      }
      if (saved && Array.isArray(saved) && saved.length > 0) {
        const seenIds = new Set<string>();
        newNodes = saved.reduce((acc: typeof INITIAL_NODES, n: (typeof INITIAL_NODES)[0], i: number) => {
          let id = n.id;
          if (seenIds.has(id)) {
            id = generateId();
          }
          seenIds.add(id);
          acc.push({ ...n, id, order: n.order ?? i });
          return acc;
        }, []);
      }
    } catch {
      // ignore
    }

    useAppStore.setState({
      activeFileId: fileId,
      fileMenuOpen: false,
      activeId: newNodes[0]?.id || null,
    });
    useAppStore.getState().setNodesRaw(newNodes);
  };

  const createNewFile = () => {
    const newId = generateId();
    const newDoc = { id: newId, title: "New Document", updatedAt: Date.now() };
    const initialNewNodes = [
      {
        id: generateId(),
        content: "# New Document\n\n...",
        parentId: null,
        order: 0,
      },
    ];

    useAppStore.setState((s) => ({
      documents: [newDoc, ...s.documents],
      activeFileId: newId,
      fileMenuOpen: false,
      activeId: initialNewNodes[0].id,
    }));
    useAppStore.getState().setNodesRaw(initialNewNodes);
  };

  const deleteFile = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    const state = useAppStore.getState();
    const newDocs = state.documents.filter((d) => d.id !== fileId);
    if (newDocs.length === 0) {
      createNewFile();
      useAppStore.setState((s) => ({
        documents: s.documents.filter((d) => d.id !== fileId),
      }));
    } else {
      useAppStore.setState({ documents: newDocs });
      if (state.activeFileId === fileId) {
        switchFile(newDocs[0].id);
      }
    }

    db.files.delete(fileId).catch(() => {});
    db.documents.delete(fileId).catch(() => {});
    localStorage.removeItem(`puu_file_${fileId}`); // cleanup legacy
  };

  return { switchFile, createNewFile, deleteFile };
}
