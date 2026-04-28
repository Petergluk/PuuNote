import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { validateNodes } from "../utils/schema";
import { db } from "../db/db";

const pendingSave: {
  timer: ReturnType<typeof setTimeout> | null;
  fileId: string;
  nodes: typeof INITIAL_NODES;
} = { timer: null, fileId: "", nodes: [] };

export const flushPendingSave = async () => {
  if (pendingSave.timer) {
    clearTimeout(pendingSave.timer);
    pendingSave.timer = null;
    const { fileId, nodes } = pendingSave;
    if (fileId && nodes.length > 0) {
      try {
        localStorage.setItem("puu_active_file", fileId);
      } catch (err) {
        console.error("Failed to store active file", err);
      }
      await db.files.put({ id: fileId, nodes }).catch((err) => {
        console.error("Failed to save data into dexie", err);
      });
    }
  }
};

export function useFileSystemInit() {
  const setNodesRaw = useAppStore((s) => s.setNodesRaw);

  useEffect(() => {
    async function init() {
      let savedDocs: Array<{ id: string; title: string; updatedAt: number }> =
        [];
      try {
        // Run one-time migration if needed
        if (localStorage.getItem("puu_documents") !== null) {
          try {
            const lsDocs = JSON.parse(
              localStorage.getItem("puu_documents") || "[]",
            );
            if (Array.isArray(lsDocs)) {
              for (const doc of lsDocs) {
                // Ignore missing document IDs
                if (!doc || !doc.id) continue;

                let nodesData = null;
                const lsStr = localStorage.getItem(`puu_file_${doc.id}`);
                if (lsStr) {
                  nodesData = JSON.parse(lsStr);
                } else if (doc.id === "default") {
                  const scribeStr = localStorage.getItem("scribe_nodes");
                  if (scribeStr) nodesData = JSON.parse(scribeStr);
                }

                if (nodesData && Array.isArray(nodesData)) {
                  await db.files.put({ id: doc.id, nodes: nodesData });
                }
              }
              const mappedDocs = lsDocs.map((d) => ({
                ...d,
                updatedAt: parseInt(String(d.updatedAt), 10) || Date.now(),
              }));
              await db.documents.bulkPut(mappedDocs);

              // Only remove legacy keys if all Dexie writes succeeded
              for (const doc of lsDocs) {
                if (!doc || !doc.id) continue;
                localStorage.removeItem(`puu_file_${doc.id}`);
              }
              localStorage.removeItem("puu_documents");
              localStorage.removeItem("scribe_nodes");
            }
          } catch (err) {
            console.error("Migration error: ", err);
          }
        }

        const stored = await db.documents.toArray();
        if (stored && stored.length > 0) {
          savedDocs = stored.map((d) => ({
            ...d,
            updatedAt:
              parseInt(d.updatedAt as unknown as string, 10) || Date.now(),
          }));
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
        savedDocs = savedDocs.reduce(
          (
            acc: Array<{ id: string; title: string; updatedAt: number }>,
            doc: { id: string; title: string; updatedAt: number },
          ) => {
            let id = doc.id;
            if (seenDocIds.has(id)) {
              id = generateId();
            }
            seenDocIds.add(id);
            acc.push({ ...doc, id });
            return acc;
          },
          [],
        );
      }
      useAppStore.setState({ documents: savedDocs });

      let active = localStorage.getItem("puu_active_file"); // migrate or use ls for active id

      if (!active || !savedDocs.find((d) => d.id === active)) {
        active = savedDocs[0].id;
      }
      useAppStore.setState({ activeFileId: active });
      try {
        localStorage.setItem("puu_active_file", active); // persist active id in ls since it's just one string
      } catch (err) {
        console.error(
          "Failed to save active file reference to localStorage",
          err,
        );
      }

      let newNodes = INITIAL_NODES;
      try {
        const fileData = await db.files.get(active);
        const savedNodes = fileData?.nodes;

        if (savedNodes) {
          const validated = validateNodes(savedNodes);
          if (validated.length > 0) {
            const seenIds = new Set<string>();
            newNodes = validated.reduce(
              (
                acc: typeof INITIAL_NODES,
                n: (typeof INITIAL_NODES)[0],
                i: number,
              ) => {
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
              },
              [],
            );
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
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Handle nodes or active file changing
      if (
        state.nodes !== prevState.nodes ||
        state.activeFileId !== prevState.activeFileId
      ) {
        const { activeFileId, nodes } = state;
        if (!activeFileId || nodes.length === 0) return;

        // Save active file changes tracking
        if (pendingSave.timer) clearTimeout(pendingSave.timer);

        pendingSave.fileId = activeFileId;
        pendingSave.nodes = nodes;

        pendingSave.timer = setTimeout(() => {
          pendingSave.timer = null;
          try {
            localStorage.setItem("puu_active_file", activeFileId);
          } catch (err) {
            console.error("Failed to update active file in ls", err);
          }
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
          db.documents
            .bulkPut(
              state.documents.map((d) => ({
                ...d,
                updatedAt: String(d.updatedAt),
              })),
            )
            .catch((err) => {
              console.error("Failed to save documents metadata", err);
            });
        }
      }
    });

    const handleBeforeUnload = () => {
      flushPendingSave();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribe();
      flushPendingSave();
      window.removeEventListener("beforeunload", handleBeforeUnload);
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

    await flushPendingSave();

    let newNodes = INITIAL_NODES;
    try {
      const fileData = await db.files.get(fileId);
      const saved = fileData?.nodes;

      if (saved && Array.isArray(saved) && saved.length > 0) {
        const seenIds = new Set<string>();
        newNodes = saved.reduce(
          (
            acc: typeof INITIAL_NODES,
            n: (typeof INITIAL_NODES)[0],
            i: number,
          ) => {
            let id = n.id;
            if (seenIds.has(id)) {
              id = generateId();
            }
            seenIds.add(id);
            acc.push({ ...n, id, order: n.order ?? i });
            return acc;
          },
          [],
        );
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

  const createNewFile = async (
    initialNodes?: typeof INITIAL_NODES,
    title?: string,
  ) => {
    await flushPendingSave();

    const newId = generateId();
    const newDoc = {
      id: newId,
      title: title || "New Document",
      updatedAt: Date.now(),
    };
    const nodesToUse = initialNodes || [
      {
        id: generateId(),
        content: "# New Document\n\n...",
        parentId: null,
        order: 0,
      },
    ];

    try {
      await db.documents.put({
        ...newDoc,
        updatedAt: String(newDoc.updatedAt),
      });
      await db.files.put({ id: newId, nodes: nodesToUse });
    } catch (err) {
      console.error("Failed to insert new file into db", err);
    }

    useAppStore.setState((s) => ({
      documents: [newDoc, ...s.documents],
      activeFileId: newId,
      fileMenuOpen: false,
      activeId: nodesToUse[0]?.id || null,
    }));
    useAppStore.getState().setNodesRaw(nodesToUse);
  };

  const deleteFile = async (fileId: string) => {
    // If the file we are deleting is the currently active file, cancel any pending saves
    const state = useAppStore.getState();
    if (state.activeFileId === fileId) {
      if (pendingSave.timer) clearTimeout(pendingSave.timer);
      pendingSave.timer = null;
    } else {
      await flushPendingSave();
    }

    // Explicitly delete from DB BEFORE changing state
    try {
      await db.files.delete(fileId);
      await db.documents.delete(fileId);
      localStorage.removeItem(`puu_file_${fileId}`); // cleanup legacy
    } catch (err) {
      console.error("Failed to delete from db", err);
    }

    const newDocs = state.documents.filter((d) => d.id !== fileId);

    if (newDocs.length === 0) {
      await createNewFile();
      useAppStore.setState((s) => ({
        documents: s.documents.filter((d) => d.id !== fileId),
      }));
    } else {
      useAppStore.setState({ documents: newDocs });
      if (state.activeFileId === fileId) {
        await switchFile(newDocs[0].id);
      }
    }
  };

  return { switchFile, createNewFile, deleteFile };
}
