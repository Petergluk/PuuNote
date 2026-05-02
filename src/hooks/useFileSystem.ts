import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { toast } from "sonner";
import { DocumentService, normalizeNodes } from "../domain/documentService";
import type { PuuDocument, PuuNode, PuuDocumentMetadata } from "../types";
import { flushPendingTextareas } from "../components/textareaFlushRegistry";
import { fitColumnWidthToDocumentDepth } from "../utils/columnSizing";

class FileSystemManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  public fileId: string = "";
  public nodes: PuuNode[] = [];
  public isHydratingFile = false;
  public switchController: AbortController | null = null;

  public scheduleSave(
    fileId: string,
    nodes: PuuNode[],
    onSave: (fileId: string, nodes: PuuNode[]) => void,
  ) {
    if (this.timer) clearTimeout(this.timer);
    this.fileId = fileId;
    this.nodes = nodes;
    this.timer = setTimeout(() => {
      this.timer = null;
      onSave(this.fileId, this.nodes);
    }, 1000);
  }

  public clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  public hasTimer() {
    return this.timer !== null;
  }
}

export const fsManager = new FileSystemManager();

import { isQuotaError } from "../utils/storage";

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

const updateDocumentMetadataInStore = (
  fileId: string,
  nodes: typeof INITIAL_NODES,
  options: { fallback?: string; touchUpdatedAt?: boolean } = {},
) => {
  const now = Date.now();
  useAppStore.setState((state) => {
    let didChange = false;
    const documents = state.documents.map((document) => {
      if (document.id !== fileId) return document;

      const newTitle = deriveDocumentTitle(
        nodes,
        options.fallback || document.title || "Untitled",
      );
      const shouldUpdateTitle = document.title !== newTitle;
      if (!shouldUpdateTitle && !options.touchUpdatedAt) return document;

      didChange = true;
      return {
        ...document,
        title: shouldUpdateTitle ? newTitle : document.title,
        updatedAt: options.touchUpdatedAt ? now : document.updatedAt,
      };
    });

    return didChange ? { documents } : state;
  });
};

export const flushPendingSave = async () => {
  flushPendingTextareas();
  if (fsManager.hasTimer()) {
    fsManager.clearTimer();
    const { fileId, nodes } = fsManager;
    if (fileId) {
      useAppStore.setState({ saveStatus: "saving" });
      try {
        DocumentService.storeActiveFileId(fileId);
        await DocumentService.saveNodes(fileId, nodes);
        updateDocumentMetadataInStore(fileId, nodes, { touchUpdatedAt: true });
        useAppStore.setState({ saveStatus: "saved" });
      } catch (err) {
        console.error("Failed to save data into dexie", err);
        useAppStore.setState({ saveStatus: "error" });
        if (isQuotaError(err)) {
          toast.error("Storage space is full. Could not save your notes.");
        }
      }
    }
  }
};

export function useFileSystemInit() {
  const setNodesRaw = useAppStore((s) => s.setNodesRaw);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      let savedDocs: PuuDocument[] = [];
      try {
        await DocumentService.migrateLegacyLocalStorage();
        if (cancelled) return;
        savedDocs = await DocumentService.listDocuments();
      } catch (err) {
        console.error("Failed to init documents from db", err);
      }
      if (cancelled) return;

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
      fsManager.isHydratingFile = true;
      fsManager.clearTimer();
      try {
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
          if (cancelled) return;

          const savedNodes = await DocumentService.loadNodes(active);
          if (savedNodes !== null) newNodes = savedNodes;
        } catch (err) {
          console.error("Failed to load active file nodes", err);
        }
        if (cancelled) return;

        fsManager.fileId = active;
        fsManager.nodes = newNodes;
        setNodesRaw(newNodes);
        useAppStore.setState({
          activeId: newNodes[0]?.id || null,
          colWidth: fitColumnWidthToDocumentDepth(newNodes),
          saveStatus: "saved",
        });
        if (active) updateDocumentMetadataInStore(active, newNodes);
      } finally {
        fsManager.isHydratingFile = false;
      }
    }
    init();

    return () => {
      cancelled = true;
    };
  }, [setNodesRaw]);

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      // Handle nodes or active file changing
      if (
        state.nodes !== prevState.nodes ||
        state.activeFileId !== prevState.activeFileId
      ) {
        if (!state.activeFileId) return;

        // KEEP IN SYNC EVEN DURING HYDRATION
        fsManager.nodes = state.nodes;

        if (fsManager.isHydratingFile) return;

        const { activeFileId, nodes } = state;
        useAppStore.setState({ saveStatus: "unsaved" });

        // Save active file changes tracking
        fsManager.scheduleSave(activeFileId, nodes, (fileId, nodesToSave) => {
          useAppStore.setState({ saveStatus: "saving" });
          try {
            DocumentService.storeActiveFileId(fileId);
          } catch (err) {
            console.error("Failed to update active file in ls", err);
          }
          DocumentService.saveNodes(fileId, nodesToSave)
            .then(() => {
              updateDocumentMetadataInStore(fileId, nodesToSave, {
                touchUpdatedAt: true,
              });
              useAppStore.setState({ saveStatus: "saved" });
            })
            .catch((err) => {
              console.error("Failed to save data into dexie", err);
              useAppStore.setState({ saveStatus: "error" });
              if (isQuotaError(err)) {
                toast.error(
                  "Storage space is full. Could not save your notes.",
                );
              } else {
                toast.error("Failed to save your notes.");
              }
            });
        });
      }

      // Handle documents metadata changing
      if (state.documents !== prevState.documents) {
        if (state.documents.length > 0) {
          DocumentService.saveDocuments(state.documents).catch((err) => {
            console.error("Failed to save documents metadata", err);
            useAppStore.setState({ saveStatus: "error" });
            toast.error("Failed to save document list.");
          });
        }
      }
    });

    const saveCurrentStateToDirtyBackup = () => {
      flushPendingTextareas();
      const { activeFileId, nodes } = useAppStore.getState();
      const fileId = activeFileId || fsManager.fileId;
      const nodesToSave = activeFileId ? nodes : fsManager.nodes;
      if (!fileId) return;

      try {
        DocumentService.saveDirtyNodes(fileId, nodesToSave);
      } catch (e) {
        console.error("Failed to stringify dirty save", e);
        useAppStore.setState({ saveStatus: "error" });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveCurrentStateToDirtyBackup();
        void flushPendingSave();
      }
    };

    const handlePageHide = () => {
      saveCurrentStateToDirtyBackup();
      void flushPendingSave();
    };

    window.addEventListener("beforeunload", saveCurrentStateToDirtyBackup);
    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      flushPendingSave();
      window.removeEventListener("beforeunload", saveCurrentStateToDirtyBackup);
      window.removeEventListener("pagehide", handlePageHide);
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

    fsManager.switchController?.abort();
    fsManager.switchController = new AbortController();
    const signal = fsManager.switchController.signal;

    await flushPendingSave();
    if (signal.aborted) return;

    let newNodes = INITIAL_NODES;
    let didFail = false;
    try {
      const saved = await DocumentService.loadNodes(fileId);
      if (saved !== null) {
        newNodes = saved;
      } else {
        didFail = true;
      }
    } catch {
      didFail = true;
    }

    if (signal.aborted) return;

    if (didFail && fileId !== "default") {
      useAppStore
        .getState()
        .openConfirm(
          "Failed to read file from storage. It might be corrupted or missing.",
          () => {},
        );
      return;
    }

    fsManager.isHydratingFile = true;
    useAppStore.getState().setNodesRaw(newNodes);
    useAppStore.setState({
      activeFileId: fileId,
      fileMenuOpen: false,
      activeId: newNodes[0]?.id || null,
      selectedIds: newNodes[0] ? [newNodes[0].id] : [],
      editingId: null,
      colWidth: fitColumnWidthToDocumentDepth(newNodes),
      saveStatus: "saved",
    });
    fsManager.isHydratingFile = false;
    try {
      DocumentService.storeActiveFileId(fileId);
    } catch (err) {
      console.error("Failed to store active file", err);
    }
    updateDocumentMetadataInStore(fileId, newNodes);
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

    fsManager.isHydratingFile = true;
    useAppStore.getState().setNodesRaw(normalizedNodes);
    useAppStore.setState((s) => ({
      documents: [newDoc, ...s.documents],
      activeFileId: newDoc.id,
      fileMenuOpen: false,
      activeId: normalizedNodes[0]?.id || null,
      selectedIds: normalizedNodes[0] ? [normalizedNodes[0].id] : [],
      editingId: null,
      colWidth: fitColumnWidthToDocumentDepth(normalizedNodes),
      saveStatus: "saved",
    }));
    fsManager.isHydratingFile = false;
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
      fsManager.clearTimer();
    } else {
      await flushPendingSave();
    }

    // Explicitly delete from DB BEFORE changing state
    try {
      await DocumentService.deleteDocument(fileId);
    } catch (err) {
      console.error("Failed to delete from db", err);
      toast.error("Failed to delete the file.");
      return;
    }

    const newDocs = state.documents.filter((d) => d.id !== fileId);

    if (newDocs.length === 0) {
      await createNewFile();
      // createNewFile already functional-updates the state with the new doc.
      // Now remove the deleted file functionally so we don't overwrite the new doc.
      useAppStore.setState((s) => ({
        documents: s.documents.filter((d) => d.id !== fileId),
      }));
    } else {
      useAppStore.setState((s) => ({
        documents: s.documents.filter((d) => d.id !== fileId),
      }));
      if (state.activeFileId === fileId) {
        await switchFile(newDocs[0].id);
      }
    }
  };

  return { switchFile, createNewFile, deleteFile };
}
