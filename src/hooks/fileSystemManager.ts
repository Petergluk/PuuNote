import { PuuNode } from "../types";
import { DocumentService } from "../domain/documentService";
import { useAppStore } from "../store/useAppStore";
import { flushPendingTextareas } from "../components/textareaFlushRegistry";
import { isQuotaError } from "../utils/storage";
import { toast } from "sonner";
import { updateDocumentMetadataInStore } from "./fileSystemUtils";

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
    const scheduledFileId = fileId;
    const scheduledNodes = nodes;
    this.timer = setTimeout(() => {
      this.timer = null;
      onSave(scheduledFileId, scheduledNodes);
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
