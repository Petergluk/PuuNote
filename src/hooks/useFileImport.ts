import { toast } from "sonner";
import { useAppStore } from "../store/useAppStore";
import { parseImportFile } from "../domain/documentExport";
import { useFileSystemActions } from "./useFileSystem";
import { MAX_FILE_SIZE_BYTES } from "../constants";

export function useFileImport() {
  const { createNewFile } = useFileSystemActions();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error("File is too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const mdText = event.target?.result as string;
      if (!mdText) return;
      try {
        const imported = parseImportFile(file.name, mdText);
        if (imported.nodes.length > 0) {
          useAppStore
            .getState()
            .openConfirm("Import will create a new document. Proceed?", () => {
              createNewFile(imported.nodes, imported.title, imported.metadata);
            });
        }
      } catch (err) {
        console.error("Failed to validate imported nodes", err);
        toast.error("Import failed", {
          description:
            err instanceof Error
              ? err.message
              : "Imported file is invalid or corrupted.",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = ""; /* reset input */
  };

  return { handleImport };
}
