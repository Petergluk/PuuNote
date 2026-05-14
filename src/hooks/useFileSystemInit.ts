import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { toast } from "sonner";
import { DocumentService } from "../domain/documentService";
import type { PuuDocument } from "../types";
import { flushPendingTextareas } from "../components/textareaFlushRegistry";
import { fitColumnWidthToDocumentDepth } from "../utils/columnSizing";
import { fsManager, flushPendingSave } from "./fileSystemManager";
import { updateDocumentMetadataInStore } from "./fileSystemUtils";
import { isQuotaError } from "../utils/storage";

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
