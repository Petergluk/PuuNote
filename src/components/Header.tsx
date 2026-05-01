import { useRef, useState, useEffect } from "react";
import {
  Upload,
  Download,
  FileJson,
  Undo2,
  Redo2,
  Network,
  ScrollText,
  FoldVertical,
  UnfoldVertical,
  Folder,
  Palette,
  Search,
  Maximize,
  Minimize,
  Settings,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { useClickOutside } from "../hooks/useClickOutside";
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
} from "../utils/fullscreen";

interface HeaderProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Header({ handleImport }: HeaderProps) {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileMenuOpen = useAppStore((s) => s.fileMenuOpen);
  const setFileMenuOpen = useAppStore((s) => s.setFileMenuOpen);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const setTimelineOpen = useAppStore((s) => s.setTimelineOpen);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
  const exportToMarkdown = useAppStore((s) => s.exportToMarkdown);
  const exportToStructuredMarkdown = useAppStore(
    (s) => s.exportToStructuredMarkdown,
  );
  const exportToJson = useAppStore((s) => s.exportToJson);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  const uiMode = useAppStore((s) => s.uiMode);
  const setUiMode = useAppStore((s) => s.setUiMode);

  useClickOutside(exportMenuRef, () => {
    if (exportMenuOpen) setExportMenuOpen(false);
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && exportMenuOpen) {
        setExportMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [exportMenuOpen]);

  const toggleFullscreen = () => {
    if (!isFullscreen(document)) {
      setUiMode("fullscreen");
      const reqFunc = requestFullscreen(document.documentElement);
      if (reqFunc && reqFunc.catch) {
        reqFunc.catch(() => {
          /* ignore */
        });
      }
    } else {
      if (uiMode === "fullscreen") {
        setUiMode("zen");
      } else {
        setUiMode("normal");
        const exitFunc = exitFullscreen(document);
        if (exitFunc && exitFunc.catch) {
          exitFunc.catch(() => {
            /* ignore */
          });
        }
      }
    }
  };

  return (
    <header className="h-14 border-b shrink-0 border-app-border flex items-center justify-between px-2 sm:px-6 bg-app-panel transition-colors duration-300">
      <div className="flex items-center gap-2 sm:gap-6">
        <span className="font-sans font-semibold text-lg sm:text-xl tracking-wide flex items-center gap-2 sm:gap-4 relative">
          <span
            className="cursor-pointer hidden sm:inline-block pr-2 sm:pr-4 border-r border-app-border"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            title="Open files menu"
          >
            <span className="text-app-text-muted">Puu</span>
            <span className="text-app-accent">Note.</span>
          </span>
          <span
            className="cursor-pointer sm:hidden flex items-center justify-center p-1 pr-3 border-r border-app-border"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            title="Open files menu"
          >
            <span className="text-app-accent text-xl font-bold">P.</span>
          </span>
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${fileMenuOpen ? "text-app-text-primary bg-app-card-hover border border-app-border" : "text-app-text-muted hover:text-app-text-primary hover:bg-app-card-hover border border-transparent hover:border-app-border"}`}
              title="Manage documents"
              aria-label="Manage documents"
              aria-pressed={fileMenuOpen}
            >
              <Folder size={18} />
            </button>
            <button
              onClick={() => setTimelineOpen(!timelineOpen)}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${timelineOpen ? "text-app-text-primary bg-app-card-hover border border-app-border" : "text-app-text-muted hover:text-app-text-primary hover:bg-app-card-hover border border-transparent hover:border-app-border"}`}
              title="Toggle View Mode"
              aria-label="Toggle view mode"
              aria-pressed={timelineOpen}
            >
              {timelineOpen ? <Network size={18} /> : <ScrollText size={18} />}
            </button>
            <button
              onClick={() => useAppStore.getState().setCommandPaletteOpen(true)}
              className="p-1.5 rounded-lg transition-colors flex items-center justify-center text-app-text-muted hover:text-app-text-primary hover:bg-app-card-hover border border-transparent hover:border-app-border"
              title="Command Palette (Cmd/Ctrl+K)"
              aria-label="Command Palette"
            >
              <Search size={18} />
            </button>
          </nav>
        </span>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-4 text-xs">
        <div className="flex items-center gap-0 sm:gap-1 border-r border-app-border pr-2 sm:pr-4">
          <button
            onClick={() => {
              const prevActive = useAppStore.getState().activeId;
              undo();
              const newNodes = useAppStore.getState().nodes;
              clearSelection();
              setActiveId(newNodes.find(n => n.id === prevActive) ? prevActive : (newNodes[0]?.id || null));
            }}
            disabled={!canUndo}
            className="p-1 sm:p-1.5 text-app-text-muted hover:text-app-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={() => {
              const prevActive = useAppStore.getState().activeId;
              redo();
              const newNodes = useAppStore.getState().nodes;
              clearSelection();
              setActiveId(newNodes.find(n => n.id === prevActive) ? prevActive : (newNodes[0]?.id || null));
            }}
            disabled={!canRedo}
            className="p-1 sm:p-1.5 text-app-text-muted hover:text-app-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
        </div>
        <button
          onClick={toggleFullscreen}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center justify-center gap-2"
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
          aria-pressed={uiMode !== "normal"}
        >
          {uiMode !== "normal" ? (
            <Minimize size={16} />
          ) : (
            <Maximize size={16} />
          )}
        </button>
        <button
          onClick={toggleCardsCollapsed}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center justify-center gap-2"
          title="Toggle Expand/Collapse"
          aria-label="Toggle card collapse"
          aria-pressed={cardsCollapsed}
        >
          {cardsCollapsed ? (
            <UnfoldVertical size={14} />
          ) : (
            <FoldVertical size={14} />
          )}
        </button>
        <button
          onClick={toggleTheme}
          className="bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center justify-center gap-2"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <Palette size={16} />
        </button>
        <label
          className="cursor-pointer bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium flex items-center gap-2"
          title="Import"
          aria-label="Import"
        >
          <Download size={16} />
          <input
            type="file"
            accept=".md,.markdown,.json"
            className="hidden"
            onChange={handleImport}
          />
        </label>
        <div ref={exportMenuRef} className="relative">
          <button
            onClick={() => setExportMenuOpen((open) => !open)}
            className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium flex items-center gap-2 ${
              exportMenuOpen
                ? "text-app-text-primary bg-app-card-hover"
                : "text-app-text-secondary"
            }`}
            title="Export"
            aria-label="Export"
            aria-expanded={exportMenuOpen}
          >
            <Upload size={16} />
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full z-[90] mt-2 w-56 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl">
              <button
                onClick={() => {
                  exportToMarkdown();
                  setExportMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Upload size={14} />
                Flat Markdown
              </button>
              <button
                onClick={() => {
                  exportToStructuredMarkdown();
                  setExportMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Network size={14} />
                Structured Markdown
              </button>
              <button
                onClick={() => {
                  exportToJson();
                  setExportMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <FileJson size={14} />
                Lossless JSON
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium flex items-center gap-2 ${settingsOpen ? "text-app-text-primary bg-app-card-hover" : "text-app-text-secondary"}`}
          title="Settings"
          aria-label="Settings"
          aria-pressed={settingsOpen}
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}
