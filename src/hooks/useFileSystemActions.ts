import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { INITIAL_NODES } from "../constants";
import { toast } from "sonner";
import { DocumentService, normalizeNodes } from "../domain/documentService";
import type { PuuDocument, PuuDocumentMetadata } from "../types";
import { fitColumnWidthToDocumentDepth } from "../utils/columnSizing";
import { fsManager, flushPendingSave } from "./fileSystemManager";
import { deriveDocumentTitle, updateDocumentMetadataInStore } from "./fileSystemUtils";

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
    fsManager.switchController?.abort();
    fsManager.switchController = new AbortController();
    const signal = fsManager.switchController.signal;

    await flushPendingSave();
    if (signal.aborted) return;

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

    if (signal.aborted || !newDoc) return;

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
