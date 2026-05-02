import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  Download,
  FileJson,
  Menu,
  Minus,
  Undo2,
  Redo2,
  Network,
  ScrollText,
  FoldVertical,
  UnfoldVertical,
  Folder,
  Palette,
  Paintbrush,
  Plus,
  RotateCcw,
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
import {
  adjustBranchColorRgb,
  getBranchColor,
  getBranchColorId,
  getBranchPalette,
} from "../utils/branchColors";
import { buildTreeIndex } from "../utils/tree";

interface HeaderProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function Header({ handleImport }: HeaderProps) {
  const { t } = useTranslation();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [branchColorMenuOpen, setBranchColorMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const branchColorMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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
  const activeId = useAppStore((s) => s.activeId);
  const nodes = useAppStore((s) => s.nodes);
  const theme = useAppStore((s) => s.theme);
  const branchColorIntensity = useAppStore((s) => s.branchColorIntensity);
  const branchColorSpread = useAppStore((s) => s.branchColorSpread);
  const branchColorTone = useAppStore((s) => s.branchColorTone);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
  const exportToMarkdown = useAppStore((s) => s.exportToMarkdown);
  const exportToStructuredMarkdown = useAppStore(
    (s) => s.exportToStructuredMarkdown,
  );
  const exportToJson = useAppStore((s) => s.exportToJson);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setActiveBranchColor = useAppStore((s) => s.setActiveBranchColor);
  const clearAllBranchColors = useAppStore((s) => s.clearAllBranchColors);
  const autoColorRootBranches = useAppStore((s) => s.autoColorRootBranches);
  const setBranchColorIntensity = useAppStore((s) => s.setBranchColorIntensity);
  const setBranchColorSpread = useAppStore((s) => s.setBranchColorSpread);
  const setBranchColorTone = useAppStore((s) => s.setBranchColorTone);

  const uiMode = useAppStore((s) => s.uiMode);
  const setUiMode = useAppStore((s) => s.setUiMode);

  useClickOutside(exportMenuRef, () => {
    if (exportMenuOpen) setExportMenuOpen(false);
  });

  useClickOutside(branchColorMenuRef, () => {
    if (branchColorMenuOpen) setBranchColorMenuOpen(false);
  });

  useClickOutside(mobileMenuRef, () => {
    if (mobileMenuOpen) setMobileMenuOpen(false);
  });

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && exportMenuOpen) {
        setExportMenuOpen(false);
      }
      if (e.key === "Escape" && branchColorMenuOpen) {
        setBranchColorMenuOpen(false);
      }
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [branchColorMenuOpen, exportMenuOpen, mobileMenuOpen]);

  const activeBranchColorId = useMemo(() => {
    if (!activeId) return null;
    return getBranchColorId(buildTreeIndex(nodes), activeId);
  }, [activeId, nodes]);
  const activeBranchColor = getBranchColor(
    theme,
    activeBranchColorId,
    branchColorTone,
  );
  const branchPalette = getBranchPalette(theme);
  const setBranchIntensity = (value: number) =>
    setBranchColorIntensity(Math.max(0, Math.min(300, Math.round(value))));
  const setBranchSpread = (value: number) =>
    setBranchColorSpread(Math.max(0, Math.min(100, Math.round(value))));
  const setBranchTone = (value: number) =>
    setBranchColorTone(Math.max(-100, Math.min(100, Math.round(value))));

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
  const closeMobileMenu = () => setMobileMenuOpen(false);

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

  return (
    <header className="h-14 border-b shrink-0 border-app-border flex items-center justify-between px-2 sm:px-6 bg-app-panel transition-colors duration-300">
      <div className="flex items-center gap-2 sm:gap-6">
        <div ref={mobileMenuRef} className="relative sm:hidden">
          <button
            onClick={() => setMobileMenuOpen((open) => !open)}
            className={`flex h-9 w-9 items-center justify-center rounded border transition-colors ${
              mobileMenuOpen
                ? "border-app-border bg-app-card-hover text-app-text-primary"
                : "border-transparent text-app-text-muted hover:border-app-border hover:bg-app-card-hover hover:text-app-text-primary"
            }`}
            title="Menu"
            aria-label="Menu"
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={20} />
          </button>
          {mobileMenuOpen && (
            <div className="absolute left-0 top-full z-[90] mt-2 w-64 overflow-hidden rounded border border-app-border bg-app-panel shadow-xl">
              <button
                onClick={() => {
                  setFileMenuOpen(!fileMenuOpen);
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Folder size={16} />
                {t("Documents")}
              </button>
              <button
                onClick={() => {
                  setTimelineOpen(!timelineOpen);
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                {timelineOpen ? (
                  <Network size={16} />
                ) : (
                  <ScrollText size={16} />
                )}
                {viewModeLabel}
              </button>
              <button
                onClick={() => {
                  openCommandPalette();
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Search size={16} />
                {t("Command Palette")}
              </button>
              <div className="border-t border-app-border" />
              <button
                onClick={() => {
                  handleUndo();
                  closeMobileMenu();
                }}
                disabled={!canUndo}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Undo2 size={16} />
                Undo
              </button>
              <button
                onClick={() => {
                  handleRedo();
                  closeMobileMenu();
                }}
                disabled={!canRedo}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Redo2 size={16} />
                Redo
              </button>
              <div className="border-t border-app-border" />
              {!timelineOpen && (
                <button
                  onClick={() => {
                    toggleCardsCollapsed();
                    closeMobileMenu();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
                >
                  {cardsCollapsed ? (
                    <UnfoldVertical size={16} />
                  ) : (
                    <FoldVertical size={16} />
                  )}
                  {t("Collapse cards")}
                </button>
              )}
              <button
                onClick={() => {
                  toggleTheme();
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Palette size={16} />
                {t("Theme")}
              </button>
              <label className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary">
                <Download size={16} />
                {t("Import")}
                <input
                  type="file"
                  accept=".md,.markdown,.json"
                  className="hidden"
                  onChange={(event) => {
                    handleImport(event);
                    closeMobileMenu();
                  }}
                />
              </label>
              <div className="border-t border-app-border" />
              <button
                onClick={() => {
                  exportToMarkdown();
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Upload size={16} />
                Flat Markdown
              </button>
              <button
                onClick={() => {
                  exportToStructuredMarkdown();
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <Network size={16} />
                Structured Markdown
              </button>
              <button
                onClick={() => {
                  exportToJson();
                  closeMobileMenu();
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-app-text-secondary hover:bg-app-card-hover hover:text-app-text-primary"
              >
                <FileJson size={16} />
                Lossless JSON
              </button>
            </div>
          )}
        </div>
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
        <div ref={branchColorMenuRef} className="relative hidden sm:block">
          <button
            onClick={() => setBranchColorMenuOpen((open) => !open)}
            className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium flex items-center gap-2 ${
              branchColorMenuOpen
                ? "text-app-text-primary bg-app-card-hover"
                : "text-app-text-secondary"
            }`}
            title="Branch color"
            aria-label="Branch color"
            aria-expanded={branchColorMenuOpen}
          >
            <Paintbrush
              className="branch-color-paint"
              size={16}
              style={{
                color: activeBranchColor
                  ? `rgb(${activeBranchColor.rgb})`
                  : undefined,
              }}
            />
          </button>
          {branchColorMenuOpen && (
            <div className="absolute right-0 top-full z-[90] mt-2 grid w-[206px] grid-cols-5 gap-2 rounded border border-app-border bg-app-panel p-2 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  if (activeId) {
                    setActiveBranchColor(null);
                  } else {
                    clearAllBranchColors();
                  }
                  setBranchColorMenuOpen(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                  activeBranchColorId === null
                    ? "border-app-text-primary bg-app-card-hover text-app-text-primary"
                    : "border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                }`}
                title={
                  activeId ? "Reset branch color" : "Reset all branch colors"
                }
                aria-label={
                  activeId ? "Reset branch color" : "Reset all branch colors"
                }
              >
                <RotateCcw size={14} />
              </button>
              {Object.values(branchPalette).map((color) => {
                const rgb = adjustBranchColorRgb(color.rgb, branchColorTone);
                return (
                  <button
                    key={color.id}
                    type="button"
                    data-branch-color-swatch
                    onClick={() => {
                      if (!activeId) return;
                      setActiveBranchColor(color.id);
                      setBranchColorMenuOpen(false);
                    }}
                    disabled={!activeId}
                    className={`h-8 w-8 rounded border transition-transform ${
                      !activeId
                        ? "cursor-not-allowed opacity-35 grayscale"
                        : activeBranchColorId === color.id
                          ? "border-app-text-primary"
                          : "border-app-border hover:scale-105"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, rgb(${rgb}) 76%, var(--app-card)), rgb(${rgb}))`,
                      boxShadow:
                        activeBranchColorId === color.id
                          ? `0 0 0 2px color-mix(in srgb, rgb(${rgb}) 34%, transparent)`
                          : undefined,
                    }}
                    title={color.label}
                    aria-label={`Set branch color: ${color.label}`}
                  />
                );
              })}
              <div className="col-span-5 mt-1 grid gap-1 border-t border-app-border pt-2">
                <div className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
                  Яркость
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setBranchIntensity(branchColorIntensity - 10)
                    }
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="Less branch tint"
                    aria-label="Less branch tint"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="5"
                    value={branchColorIntensity}
                    onChange={(event) =>
                      setBranchIntensity(Number(event.target.value))
                    }
                    className="h-1 min-w-0 flex-1 cursor-pointer accent-app-accent"
                    title="Branch tint intensity"
                    aria-label="Branch tint intensity"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setBranchIntensity(branchColorIntensity + 10)
                    }
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="More branch tint"
                    aria-label="More branch tint"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div className="col-span-5 grid gap-1">
                <div className="text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
                  Заливка
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBranchSpread(branchColorSpread - 5)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="Less branch fill"
                    aria-label="Less branch fill"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={branchColorSpread}
                    onChange={(event) =>
                      setBranchSpread(Number(event.target.value))
                    }
                    className="h-1 min-w-0 flex-1 cursor-pointer accent-app-accent"
                    title="Branch fill spread"
                    aria-label="Branch fill spread"
                  />
                  <button
                    type="button"
                    onClick={() => setBranchSpread(branchColorSpread + 5)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="More branch fill"
                    aria-label="More branch fill"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <div className="col-span-5 grid gap-1">
                <div className="flex items-center justify-between gap-2 text-[10px] font-medium uppercase tracking-wide text-app-text-muted">
                  <span>Оттенок</span>
                  <span className="tabular-nums">{branchColorTone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBranchTone(branchColorTone - 5)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="Mix palette with white"
                    aria-label="Mix palette with white"
                  >
                    <Minus size={12} />
                  </button>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={branchColorTone}
                    onChange={(event) =>
                      setBranchTone(Number(event.target.value))
                    }
                    className="h-1 min-w-0 flex-1 cursor-pointer accent-app-accent"
                    title="Branch palette tone"
                    aria-label="Branch palette tone"
                  />
                  <button
                    type="button"
                    onClick={() => setBranchTone(branchColorTone + 5)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="Mix palette with black"
                    aria-label="Mix palette with black"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={() => autoColorRootBranches()}
                className="col-span-5 flex h-8 items-center justify-center rounded border border-app-border bg-app-card px-3 text-xs font-medium text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                title="Сделай красиво"
                aria-label="Сделай красиво"
              >
                Сделай красиво
              </button>
            </div>
          )}
        </div>
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
        <div ref={exportMenuRef} className="relative hidden sm:block">
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
          onClick={enterMobileZen}
          className="flex h-8 w-8 items-center justify-center rounded border border-app-border bg-app-card text-app-text-secondary transition-colors hover:bg-app-card-hover hover:text-app-text-primary sm:hidden"
          title={t("Fullscreen")}
          aria-label={t("Fullscreen")}
        >
          <Maximize size={15} />
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
