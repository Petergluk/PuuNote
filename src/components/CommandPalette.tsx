import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useFileSystemActions } from "../hooks/useFileSystem";
import { Search, Palette, FileText, Plus, Trash2 } from "lucide-react";
import { db } from "../db/db";

export function CommandPalette() {
  const { t } = useTranslation();
  const isOpen = useAppStore((s) => s.commandPaletteOpen);
  const setIsOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchResults, setSearchResults] = useState<{ id: string; content: string; fileId: string; fileTitle: string }[]>([]);
  const documents = useAppStore((s) => s.documents);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);

  const { createNewFile, deleteFile, switchFile } = useFileSystemActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Global escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      
      const lowerQuery = query.toLowerCase();
      const allFiles = await db.files.toArray();
      const results: { id: string; content: string; fileId: string; fileTitle: string }[] = [];
      
      for (const file of allFiles) {
        const doc = documents.find((d) => d.id === file.id);
        const title = doc ? doc.title : "Unknown Document";
        
        for (const node of file.nodes) {
          if (node.content.toLowerCase().includes(lowerQuery)) {
            results.push({
              id: node.id,
              content: node.content,
              fileId: file.id,
              fileTitle: title,
            });
            if (results.length >= 15) break; 
          }
        }
        if (results.length >= 15) break;
      }
      
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, documents]);

  const closePalette = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectNode = async (fileId: string, nodeId: string) => {
    if (fileId !== activeFileId) {
      await switchFile(fileId);
    }
    setActiveId(nodeId);
    closePalette();
  };

  const handleExecuteCommand = (cmd: () => void) => {
    cmd();
    closePalette();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
          onClick={() => closePalette()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-xl bg-app-panel border border-app-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 border-b border-app-border">
              <Search className="text-app-text-muted mr-3" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("Search")}
                className="flex-1 bg-transparent border-none outline-none text-app-text-primary text-lg"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Escape") closePalette();
                }}
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {query.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                    Search Results
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-app-text-secondary text-sm">
                      {t("No results")}
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={`${result.fileId}-${result.id}`}
                        onClick={() => handleSelectNode(result.fileId, result.id)}
                        className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex flex-col gap-1 border-b border-app-border/50 last:border-0"
                      >
                        <span className="text-app-text-primary truncate">
                           {result.fileTitle} &rsaquo; {result.content.split("\n")[0] || "Untitled"}
                        </span>
                        <span className="text-xs text-app-text-muted truncate">
                           {result.content}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {query.length === 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                    Commands
                  </div>
                  <button
                    onClick={() => handleExecuteCommand(toggleTheme)}
                    className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex items-center gap-3 text-app-text-primary"
                  >
                    <Palette size={16} className="text-app-accent" />
                    {t("Toggle Theme")}
                  </button>
                  <button
                    onClick={() => handleExecuteCommand(toggleCardsCollapsed)}
                    className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex items-center gap-3 text-app-text-primary"
                  >
                    <FileText size={16} className="text-app-accent" />
                    {t("Toggle Expand")}
                  </button>
                  <button
                    onClick={() =>
                      handleExecuteCommand(() => setTimelineOpen(true))
                    }
                    className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex items-center gap-3 text-app-text-primary"
                  >
                    <Search size={16} className="text-app-accent" />
                    {t("Open Timeline View")}
                  </button>
                  <button
                    onClick={() => handleExecuteCommand(createNewFile)}
                    className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex items-center gap-3 text-app-text-primary"
                  >
                    <Plus size={16} className="text-app-accent" />
                    {t("New Document")}
                  </button>
                  <button
                    onClick={() =>
                      handleExecuteCommand(
                        () => {
                          if (activeFileId) {
                            useAppStore.getState().openConfirm(t("Are you sure you want to delete this document?"), () => {
                              deleteFile(activeFileId);
                            });
                          }
                        }
                      )
                    }
                    className="w-full text-left px-4 py-3 hover:bg-red-500/10 flex items-center gap-3 text-red-500"
                  >
                    <Trash2 size={16} />
                    {t("Delete file")}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
