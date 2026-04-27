import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "../store/useAppStore";
import { useFileSystemActions } from "../hooks/useFileSystem";
import { Search, Palette, FileText, Plus, Trash2 } from "lucide-react";

export function CommandPalette() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const nodes = useAppStore((s) => s.nodes);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);

  const { createNewFile, deleteFile } = useFileSystemActions();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "f")) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const results = nodes
    .filter((n) => n.content.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 10);

  const closePalette = () => {
    setIsOpen(false);
    setQuery("");
  };

  const handleSelectNode = (id: string) => {
    setActiveId(id);
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
                  {results.length === 0 ? (
                    <div className="px-4 py-3 text-app-text-secondary text-sm">
                      {t("No results")}
                    </div>
                  ) : (
                    results.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => handleSelectNode(node.id)}
                        className="w-full text-left px-4 py-3 hover:bg-app-card-hover flex flex-col gap-1 border-b border-app-border/50 last:border-0"
                      >
                        <span className="text-app-text-primary truncate">
                          {node.content.split("\n")[0] || "Untitled"}
                        </span>
                        <span className="text-xs text-app-text-muted truncate">
                          {node.content}
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
                        () =>
                          activeFileId &&
                          deleteFile(
                            { stopPropagation: () => {} } as React.MouseEvent,
                            activeFileId,
                          ),
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
