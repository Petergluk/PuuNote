import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
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
  Blocks,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  requestFullscreen,
  exitFullscreen,
  isFullscreen,
} from "../utils/fullscreen";
import { ExportMenu } from "./ExportMenu";
import { MobileMenu } from "./MobileMenu";
import { ThemeTuneMenu } from "./ThemeTuneMenu";
import { BranchColorMenu } from "./BranchColorMenu";

interface HeaderProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Header({ handleImport }: HeaderProps) {
  const { t } = useTranslation();

  // Secret unlock: fast triple-click on "Сделай красиво" — only works in mono theme
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const beautifulClickTimesRef = useRef<number[]>([]);

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
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const theme = useAppStore((s) => s.theme);
  const uiMode = useAppStore((s) => s.uiMode);
  const setUiMode = useAppStore((s) => s.setUiMode);

  // Reset unlock when switching away from mono theme
  useEffect(() => {
    if (theme !== "mono") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSettingsUnlocked(false);
      beautifulClickTimesRef.current = [];
    }
  }, [theme]);

  const clickTimeoutRef = useRef<number | null>(null);

  const exitFullscreenState = () => {
    setUiMode("normal");
    const exitFunc = exitFullscreen(document);
    if (exitFunc && exitFunc.catch) {
      exitFunc.catch(() => {
        /* ignore */
      });
    }
  };

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
        if (clickTimeoutRef.current) return;
        clickTimeoutRef.current = window.setTimeout(() => {
          setUiMode("zen");
          clickTimeoutRef.current = null;
        }, 250);
      } else {
        exitFullscreenState();
      }
    }
  };

  const handleFullscreenDoubleClick = () => {
    if (isFullscreen(document) && uiMode === "fullscreen") {
      if (clickTimeoutRef.current) {
        window.clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      exitFullscreenState();
    }
  };

  const restoreActiveAfterHistoryChange = () => {
    const prevActive = useAppStore.getState().activeId;
    const newNodes = useAppStore.getState().nodes;
    clearSelection();
    setActiveId(
      newNodes.find((node) => node.id === prevActive)
        ? prevActive
        : newNodes[0]?.id || null,
    );
  };

  const handleUndo = () => {
    undo();
    restoreActiveAfterHistoryChange();
  };

  const handleRedo = () => {
    redo();
    restoreActiveAfterHistoryChange();
  };

  const openCommandPalette = () => {
    useAppStore.getState().setCommandPaletteOpen(true);
  };

  const viewModeLabel = timelineOpen ? t("Tree mode") : t("Line mode");

  const enterMobileZen = () => {
    setUiMode("zen");
    if (!isFullscreen(document)) {
      const reqFunc = requestFullscreen(document.documentElement);
      if (reqFunc && reqFunc.catch) {
        reqFunc.catch(() => {
          /* keep zen mode even if the browser rejects fullscreen */
        });
      }
    }
  };

  const handleBeautifulClick = () => {
    if (theme === "mono") {
      const now = Date.now();
      const recent = [
        ...beautifulClickTimesRef.current.filter((t) => now - t < 600),
        now,
      ];
      beautifulClickTimesRef.current = recent;
      if (recent.length >= 3) {
        setIsSettingsUnlocked((prev) => !prev);
        beautifulClickTimesRef.current = [];
      }
    }
  };

  return (
    <header className="h-14 border-b shrink-0 border-app-border flex items-center justify-between px-2 sm:px-6 bg-app-panel transition-colors duration-300">
      <div className="flex items-center gap-2 sm:gap-6">
        <MobileMenu
          handleImport={handleImport}
          handleUndo={handleUndo}
          handleRedo={handleRedo}
        />
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
            className="cursor-pointer hidden items-center justify-center p-1 pr-3 border-r border-app-border"
            onClick={() => setFileMenuOpen(!fileMenuOpen)}
            title="Open files menu"
          >
            <span className="text-app-accent text-xl font-bold">P.</span>
          </span>
          <nav className="hidden items-center gap-1 sm:flex sm:gap-2">
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
              title={viewModeLabel}
              aria-label={viewModeLabel}
              aria-pressed={timelineOpen}
            >
              {timelineOpen ? <Network size={18} /> : <ScrollText size={18} />}
            </button>
            <button
              onClick={openCommandPalette}
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
        <div className="hidden items-center gap-0 border-r border-app-border pr-2 sm:flex sm:gap-1 sm:pr-4">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1 sm:p-1.5 text-app-text-muted hover:text-app-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            onClick={handleRedo}
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
          onDoubleClick={handleFullscreenDoubleClick}
          className="hidden sm:flex bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center justify-center gap-2"
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
        {!timelineOpen && (
          <button
            onClick={toggleCardsCollapsed}
            className="hidden sm:flex bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center justify-center gap-2"
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
        )}
        <button
          onClick={toggleTheme}
          className="hidden sm:flex bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center justify-center gap-2"
          title="Toggle theme"
          aria-label="Toggle theme"
        >
          <Palette size={16} />
        </button>
        {isSettingsUnlocked && <ThemeTuneMenu />}
        <BranchColorMenu
          isSettingsUnlocked={isSettingsUnlocked}
          onBeautifulClick={handleBeautifulClick}
        />
        <label
          className="hidden sm:flex cursor-pointer bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors text-app-text-secondary font-medium items-center gap-2"
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
        <ExportMenu />
        <button
          onClick={enterMobileZen}
          className="flex h-8 w-8 items-center justify-center rounded border border-app-border bg-app-card text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary sm:hidden"
          title={t("Fullscreen")}
          aria-label={t("Fullscreen")}
        >
          <Maximize size={15} />
        </button>
        <button
          onClick={() => { useAppStore.getState().setPluginsOpen(!useAppStore.getState().pluginsOpen) }}
          className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium hidden sm:flex items-center gap-2 ${useAppStore.getState().pluginsOpen ? "text-app-text-primary bg-app-card-hover" : "text-app-text-secondary"}`}
          title="Plugins"
          aria-label="Plugins"
          aria-pressed={useAppStore.getState().pluginsOpen}
        >
          <Blocks size={16} />
        </button>
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
