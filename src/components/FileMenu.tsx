import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { X, Plus, File, Trash2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useFileSystemActions } from "../hooks/useFileSystem";
import { useFocusTrap } from "../hooks/useFocusTrap";
export function FileMenu() {
  const { t } = useTranslation();
  const fileMenuOpen = useAppStore((s) => s.fileMenuOpen);
  const setFileMenuOpen = useAppStore((s) => s.setFileMenuOpen);
  const documents = useAppStore((s) => s.documents);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const { switchFile, createNewFile, deleteFile } = useFileSystemActions();
  const panelRef = useFocusTrap<HTMLDivElement>(fileMenuOpen, () =>
    setFileMenuOpen(false),
  );

  return (
    <AnimatePresence>
      {fileMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/50 backdrop-blur-sm"
          onClick={() => setFileMenuOpen(false)}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="file-menu-title"
            tabIndex={-1}
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute top-0 bottom-0 left-0 w-80 bg-app-card shadow-2xl border-r border-app-border flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="h-14 border-b shrink-0 border-app-border flex items-center justify-between px-6">
              <span
                id="file-menu-title"
                className="font-sans font-semibold text-sm tracking-wide text-app-text-primary"
              >
                {t("Your Documents")}
              </span>
              <button
                onClick={() => setFileMenuOpen(false)}
                className="p-1.5 text-app-text-muted hover:text-app-text-primary rounded"
                aria-label="Close documents panel"
              >
                <X size={16} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              <button
                onClick={() => createNewFile()}
                className="w-full flex items-center justify-center gap-2 p-3 bg-app-accent/10 hover:bg-app-accent/20 text-app-accent border border-app-accent/20 rounded-lg transition-colors font-medium mb-4"
              >
                <Plus size={16} /> {t("New Document")}
              </button>
              {[...documents]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((doc) => {
                  const isActive = doc.id === activeFileId;
                  return (
                    <div
                      key={doc.id}
                      className={`group flex items-center justify-between gap-2 rounded-lg border transition-all ${isActive ? "bg-app-accent/5 border-app-accent/30 shadow-sm" : "bg-transparent border-transparent hover:bg-app-bg hover:border-app-border "}`}
                    >
                      <button
                        type="button"
                        onClick={() => switchFile(doc.id)}
                        aria-current={isActive ? "true" : undefined}
                        className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                      >
                        <File
                          size={16}
                          className={
                            isActive ? "text-app-accent" : "text-app-text-muted"
                          }
                        />
                        <div className="flex flex-col min-w-0">
                          <span
                            className={`text-sm font-medium truncate ${isActive ? "text-app-accent" : "text-app-text-secondary"}`}
                          >
                            {doc.title}
                          </span>
                          <span className="text-[10px] text-app-text-muted capitalize">
                            {new Date(doc.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            • {new Date(doc.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          useAppStore
                            .getState()
                            .openConfirm(
                              t(
                                "Are you sure you want to delete this document?",
                              ),
                              () => {
                                deleteFile(doc.id);
                              },
                            );
                        }}
                        className="mr-3 p-1.5 text-app-text-muted opacity-100 transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        title={t("Delete file")}
                        aria-label={`${t("Delete file")}: ${doc.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
