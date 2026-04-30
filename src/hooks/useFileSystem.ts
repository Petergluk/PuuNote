import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { toast } from "sonner";
import { DocumentService, normalizeNodes } from "../domain/documentService";
import type { PuuDocument, PuuDocumentMetadata } from "../types";

const pendingSave: {
  timer: ReturnType<typeof setTimeout> | null;
  fileId: string;
  nodes: typeof INITIAL_NODES;
} = { timer: null, fileId: "", nodes: [] };

let isHydratingFile = false;

const cleanTitle = (value: string) => {
  const stripped = value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^>\s*/, "")
    .replace(/^[*_`~]+|[*_`~]+$/g, "")
    .trim();
  const bracketMatch = stripped.match(/^\[(.+)\]$/);
  return (bracketMatch?.[1] || stripped).trim();
};

export const deriveDocumentTitle = (
  nodes: typeof INITIAL_NODES,
  fallback = "Untitled",
) => {
  const roots = nodes
    .filter((node) => node.parentId === null)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const firstNode = roots[0] || nodes[0];
  if (!firstNode) return fallback;

  const firstMeaningfulLine =
    firstNode.content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) || "";
  const title = cleanTitle(firstMeaningfulLine);
  if (!title) return fallback;

  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
};

const updateDocumentTitleInStore = (
  fileId: string,
  nodes: typeof INITIAL_NODES,
  fallback?: string,
) => {
  const newTitle = deriveDocumentTitle(nodes, fallback);
  useAppStore.setState((state) => ({
    documents: state.documents.some(
      (document) => document.id === fileId && document.title !== newTitle,
    )
      ? state.documents.map((document) =>
          document.id === fileId ? { ...document, title: newTitle } : document,
        )
      : state.documents,
  }));
};

export const flushPendingSave = async () => {
  if (pendingSave.timer) {
    clearTimeout(pendingSave.timer);
    pendingSave.timer = null;
    const { fileId, nodes } = pendingSave;
    if (fileId && nodes.length > 0) {
      try {
        DocumentService.storeActiveFileId(fileId);
      } catch (err) {
        console.error("Failed to store active file", err);
      }
      await DocumentService.saveNodes(fileId, nodes).catch((err) => {
        console.error("Failed to save data into dexie", err);
        if (
          err?.name === "QuotaExceededError" ||
          err?.message?.includes("Quota")
        ) {
          toast.error("Storage space is full. Could not save your notes.");
        }
      });
    }
  }
};

export function useFileSystemInit() {
  const setNodesRaw = useAppStore((s) => s.setNodesRaw);

  useEffect(() => {
    async function init() {
      let savedDocs: PuuDocument[] = [];
      try {
        await DocumentService.migrateLegacyLocalStorage();
        savedDocs = await DocumentService.listDocuments();
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

      let active = DocumentService.readActiveFileId();

      if (!active || !savedDocs.find((d) => d.id === active)) {
        active = savedDocs[0].id;
      }
      useAppStore.setState({ activeFileId: active });
      try {
        DocumentService.storeActiveFileId(active);
      } catch (err) {
        console.error(
          "Failed to save active file reference to localStorage",
          err,
        );
      }

      let newNodes = INITIAL_NODES;
      try {
        await DocumentService.restoreDirtySave();

        const savedNodes = await DocumentService.loadNodes(active);
        if (savedNodes && savedNodes.length > 0) newNodes = savedNodes;
      } catch (err) {
        console.error("Failed to load active file nodes", err);
      }

      isHydratingFile = true;
      setNodesRaw(newNodes);
      useAppStore.setState({
        activeId: newNodes[0]?.id || null,
      });
      isHydratingFile = false;
      if (active) updateDocumentTitleInStore(active, newNodes);
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
        if (isHydratingFile) return;

        const { activeFileId, nodes } = state;
        if (!activeFileId || nodes.length === 0) return;

        // Save active file changes tracking
        if (pendingSave.timer) clearTimeout(pendingSave.timer);

        pendingSave.fileId = activeFileId;
        pendingSave.nodes = nodes;

        pendingSave.timer = setTimeout(() => {
          pendingSave.timer = null;
          try {
            DocumentService.storeActiveFileId(activeFileId);
          } catch (err) {
            console.error("Failed to update active file in ls", err);
          }
          DocumentService.saveNodes(activeFileId, nodes).catch((err) => {
            console.error("Failed to save data into dexie", err);
          });
        }, 1000);

        // Update document title if needed
        const newTitle = deriveDocumentTitle(nodes);

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
          DocumentService.saveDocuments(state.documents).catch((err) => {
            console.error("Failed to save documents metadata", err);
          });
        }
      }
    });

    const saveCurrentStateToDirtyBackup = () => {
      const { activeFileId, nodes } = useAppStore.getState();
      const fileId = activeFileId || pendingSave.fileId;
      const nodesToSave = nodes.length > 0 ? nodes : pendingSave.nodes;
      if (!fileId || nodesToSave.length === 0) return;

      if (pendingSave.timer) {
        clearTimeout(pendingSave.timer);
        pendingSave.timer = null;
      }

      try {
        DocumentService.saveDirtyNodes(fileId, nodesToSave);
      } catch (e) {
        console.error("Failed to stringify dirty save", e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentStateToDirtyBackup();
      }
    };

    window.addEventListener("beforeunload", saveCurrentStateToDirtyBackup);
    window.addEventListener("pagehide", saveCurrentStateToDirtyBackup);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      flushPendingSave();
      window.removeEventListener("beforeunload", saveCurrentStateToDirtyBackup);
      window.removeEventListener("pagehide", saveCurrentStateToDirtyBackup);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
    let didFail = false;
    try {
      const saved = await DocumentService.loadNodes(fileId);
      if (saved && saved.length > 0) {
        newNodes = saved;
      } else {
        didFail = true;
      }
    } catch {
      didFail = true;
    }

    if (didFail && fileId !== "default") {
      useAppStore
        .getState()
        .openConfirm(
          "Failed to read file from storage. It might be corrupted or missing.",
          () => {},
        );
      return;
    }

    isHydratingFile = true;
    useAppStore.getState().setNodesRaw(newNodes);
    useAppStore.setState({
      activeFileId: fileId,
      fileMenuOpen: false,
      activeId: newNodes[0]?.id || null,
      selectedIds: newNodes[0] ? [newNodes[0].id] : [],
      editingId: null,
    });
    isHydratingFile = false;
    try {
      DocumentService.storeActiveFileId(fileId);
    } catch (err) {
      console.error("Failed to store active file", err);
    }
    updateDocumentTitleInStore(fileId, newNodes);
  };

  const createNewFile = async (
    initialNodes?: typeof INITIAL_NODES,
    title?: string,
    metadata?: PuuDocumentMetadata,
  ) => {
    await flushPendingSave();

    const nodesToUse = initialNodes || [
      {
        id: generateId(),
        content: "# New Document\n\n...",
        parentId: null,
        order: 0,
      },
    ];
    const normalizedNodes = normalizeNodes(nodesToUse);
    let newDoc: PuuDocument | null = null;

    try {
      newDoc = await DocumentService.createDocument({
        title: deriveDocumentTitle(normalizedNodes, title || "New Document"),
        nodes: normalizedNodes,
        metadata,
      });
    } catch (err) {
      console.error("Failed to insert new file into db", err);
      if (
        err instanceof Error &&
        (err.name === "QuotaExceededError" || err.message.includes("Quota"))
      ) {
        toast.error("Storage space is full. Could not save your new document.");
      } else {
        toast.error("Failed to create new file.");
      }
      return;
    }

    if (!newDoc) return;

    isHydratingFile = true;
    useAppStore.getState().setNodesRaw(normalizedNodes);
    useAppStore.setState((s) => ({
      documents: [newDoc, ...s.documents],
      activeFileId: newDoc.id,
      fileMenuOpen: false,
      activeId: normalizedNodes[0]?.id || null,
      selectedIds: normalizedNodes[0] ? [normalizedNodes[0].id] : [],
      editingId: null,
    }));
    isHydratingFile = false;
    try {
      DocumentService.storeActiveFileId(newDoc.id);
    } catch (err) {
      console.error("Failed to store active file", err);
    }
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
      await DocumentService.deleteDocument(fileId);
    } catch (err) {
      console.error("Failed to delete from db", err);
      toast.error("Failed to delete the file.");
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
