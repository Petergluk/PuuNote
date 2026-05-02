import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import Fuse from "fuse.js";
import { useAppStore } from "../store/useAppStore";
import { useFileSystemActions } from "../hooks/useFileSystem";
import {
  Search,
  Palette,
  FileText,
  Plus,
  Trash2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  DocumentService,
  type ActiveSearchDocument,
  type SearchDocumentNode,
} from "../domain/documentService";
import { runMockExpandSelectedCard } from "../domain/aiOperations";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useClickOutside } from "../hooks/useClickOutside";

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void | Promise<void>;
  destructive?: boolean;
}

export function CommandPalette() {
  const { t } = useTranslation();
  const isOpen = useAppStore((s) => s.commandPaletteOpen);
  const setIsOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchDocs, setSearchDocs] = useState<SearchDocumentNode[]>([]);
  const [searchResults, setSearchResults] = useState<SearchDocumentNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const documents = useAppStore((s) => s.documents);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const nodes = useAppStore((s) => s.nodes);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);

  const { createNewFile, deleteFile, switchFile } = useFileSystemActions();

  const closePalette = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setSearchResults([]);
    setActiveIndex(0);
  }, [setIsOpen]);

  const paletteRef = useFocusTrap<HTMLDivElement>(isOpen, closePalette);
  useClickOutside(paletteRef, closePalette);

  const activeDocument = useMemo<ActiveSearchDocument | null>(() => {
    if (!activeFileId) return null;

    const document = documents.find((doc) => doc.id === activeFileId);
    if (!document) return null;

    return {
      fileId: document.id,
      fileTitle: document.title,
      nodes,
    };
  }, [activeFileId, documents, nodes]);

  const fuse = useMemo(() => {
    if (searchDocs.length === 0) return null;
    return new Fuse(searchDocs, {
      keys: ["content", "fileTitle"],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [searchDocs]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadSearchDocs = async () => {
      const docs = await DocumentService.getSearchNodes(
        documents,
        activeDocument,
      );
      if (!cancelled) setSearchDocs(docs);
    };

    void loadSearchDocs();

    return () => {
      cancelled = true;
    };
  }, [isOpen, documents, activeDocument]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (query.trim() && fuse) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSearching(true);
      timer = setTimeout(() => {
        setSearchResults(
          fuse
            .search(query)
            .slice(0, 15)
            .map((res) => res.item),
        );
        setIsSearching(false);
      }, 300);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [query, fuse]);

  const commandItems = useMemo<CommandItem[]>(
    () => [
      {
        id: "toggle-theme",
        label: t("Toggle Theme"),
        icon: Palette,
        run: toggleTheme,
      },
      {
        id: "toggle-expand",
        label: t("Toggle Expand"),
        icon: FileText,
        run: toggleCardsCollapsed,
      },
      {
        id: "open-timeline",
        label: t("Open Timeline View"),
        icon: Search,
        run: () => setTimelineOpen(true),
      },
      {
        id: "new-document",
        label: t("New Document"),
        icon: Plus,
        run: createNewFile,
      },
      {
        id: "ai-draft-child-cards",
        label: t("AI Draft Child Cards"),
        icon: Sparkles,
        run: () => {
          const store = useAppStore.getState();
          runMockExpandSelectedCard({
            targetNodeId: store.activeId,
            getNodes: () => useAppStore.getState().nodes,
            setNodes: store.setNodes,
            setActiveIds: (activeId, selectedIds) => {
              useAppStore.setState({ activeId, selectedIds });
            },
          });
        },
      },
      {
        id: "delete-file",
        label: t("Delete file"),
        icon: Trash2,
        destructive: true,
        run: () => {
          if (!activeFileId) return;
          useAppStore
            .getState()
            .openConfirm(
              t("Are you sure you want to delete this document?"),
              () => {
                deleteFile(activeFileId);
              },
            );
        },
      },
    ],
    [
      activeFileId,
      createNewFile,
      deleteFile,
      setTimelineOpen,
      t,
      toggleCardsCollapsed,
      toggleTheme,
    ],
  );

  const activeListLength = query.trim()
    ? searchResults.length
    : commandItems.length;
  const safeActiveIndex =
    activeListLength === 0 ? 0 : Math.min(activeIndex, activeListLength - 1);

  useEffect(() => {
    if (!isOpen) return;
    const item = document.getElementById(
      `command-palette-item-${safeActiveIndex}`,
    );
    if (item) {
      item.scrollIntoView({ block: "nearest" });
    }
  }, [safeActiveIndex, isOpen]);

  const handleSelectNode = async (fileId: string, nodeId: string) => {
    if (fileId !== activeFileId) {
      await switchFile(fileId);
      const state = useAppStore.getState();
      if (state.activeId !== nodeId) {
        setActiveId(nodeId);
      }
    } else {
      setActiveId(nodeId);
    }
    closePalette();
  };

  const handleExecuteCommand = (cmd: () => void | Promise<void>) => {
    void cmd();
    closePalette();
  };

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      closePalette();
      return;
    }

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (activeListLength === 0) return;
      e.preventDefault();
      setActiveIndex((index) => {
        const delta = e.key === "ArrowDown" ? 1 : -1;
        return (index + delta + activeListLength) % activeListLength;
      });
      return;
    }

    if (e.key === "Enter") {
      if (activeListLength === 0) return;
      e.preventDefault();
      if (query.trim()) {
        const result = searchResults[safeActiveIndex];
        if (result) void handleSelectNode(result.fileId, result.id);
      } else {
        const command = commandItems[safeActiveIndex];
        if (command) handleExecuteCommand(command.run);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
        >
          <motion.div
            ref={paletteRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("Command Palette")}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="w-full max-w-xl bg-app-panel border border-app-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center px-4 py-3 border-b border-app-border">
              <Search className="text-app-text-muted mr-3" size={20} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder={t("Search")}
                className="flex-1 bg-transparent border-none outline-none text-app-text-primary text-lg"
                autoFocus
                aria-activedescendant={
                  activeListLength > 0
                    ? `command-palette-item-${safeActiveIndex}`
                    : undefined
                }
                data-autofocus
                onKeyDown={handlePaletteKeyDown}
              />
            </div>

            <div
              className="max-h-[60vh] overflow-y-auto"
              role="listbox"
              aria-label={
                query.length > 0 ? t("Search Results") : t("Commands")
              }
            >
              {query.length > 0 && (
                <div className="py-2">
                  <div className="px-4 py-1 text-xs font-semibold text-app-text-muted uppercase tracking-wider">
                    {t("Search Results")}
                  </div>
                  {searchResults.length === 0 ? (
                    <div className="px-4 py-3 text-app-text-secondary text-sm flex items-center gap-2">
                      {isSearching && (
                        <div className="w-4 h-4 rounded-full border-2 border-app-accent border-r-transparent animate-spin" />
                      )}
                      {isSearching ? t("Searching...") : t("No results")}
                    </div>
                  ) : (
                    searchResults.map((result, index) => (
                      <button
                        key={`${result.fileId}-${result.id}`}
                        id={`command-palette-item-${index}`}
                        role="option"
                        aria-selected={safeActiveIndex === index}
                        onClick={() =>
                          handleSelectNode(result.fileId, result.id)
                        }
                        className={`w-full text-left px-4 py-3 flex flex-col gap-1 border-b border-app-border/50 last:border-0 ${
                          safeActiveIndex === index
                            ? "bg-app-card-hover"
                            : "hover:bg-app-card-hover"
                        }`}
                      >
                        <span className="text-app-text-primary truncate">
                          {result.fileTitle} &rsaquo;{" "}
                          {result.content.split("\n")[0] || "Untitled"}
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
                    {t("Commands")}
                  </div>
                  {commandItems.map((command, index) => {
                    const Icon = command.icon;
                    const isActive = safeActiveIndex === index;
                    return (
                      <button
                        key={command.id}
                        id={`command-palette-item-${index}`}
                        role="option"
                        aria-selected={isActive}
                        onClick={() => handleExecuteCommand(command.run)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
                          command.destructive
                            ? "text-red-500 hover:bg-red-500/10"
                            : "text-app-text-primary"
                        } ${isActive ? "bg-app-card-hover" : "hover:bg-app-card-hover"}`}
                      >
                        <Icon
                          size={16}
                          className={
                            command.destructive ? "" : "text-app-accent"
                          }
                        />
                        {command.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
