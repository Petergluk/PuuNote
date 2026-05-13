import { useRef, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Upload,
  Copy,
  Download,
  FileJson,
  Menu,
  Undo2,
  Redo2,
  Network,
  ScrollText,
  FoldVertical,
  UnfoldVertical,
  Folder,
  Palette,
  Paintbrush,
  RotateCcw,
  Search,
  Maximize,
  Minimize,
  Settings,
  SlidersHorizontal,
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
  getBranchColorSettings,
  getBranchPalette,
} from "../utils/branchColors";
import { buildTreeIndex } from "../utils/tree";
import {
  getThemeId,
  getThemeTune,
  THEME_IDS,
  THEME_LABELS,
} from "../utils/themeTuning";
import { MiniSlider } from "./MiniSlider";

interface HeaderProps {
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Math.round(value)));

const branchMixPercent = (value: number) =>
  Math.min(100, Math.max(0, Math.round(value)));

export function Header({ handleImport }: HeaderProps) {
  const { t } = useTranslation();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [branchColorMenuOpen, setBranchColorMenuOpen] = useState(false);
  const [themeTuneMenuOpen, setThemeTuneMenuOpen] = useState(false);
  const [themeTuneCopied, setThemeTuneCopied] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Secret unlock: fast triple-click on "Сделай красиво" — only works in mono theme
  const [isSettingsUnlocked, setIsSettingsUnlocked] = useState(false);
  const beautifulClickTimesRef = useRef<number[]>([]);

  const exportMenuRef = useRef<HTMLDivElement>(null);
  const branchColorMenuRef = useRef<HTMLDivElement>(null);
  const themeTuneMenuRef = useRef<HTMLDivElement>(null);
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
  
  // isSettingsUnlocked is declared above with useState
  const branchColorIntensity = useAppStore((s) => s.branchColorIntensity);
  const branchColorSpread = useAppStore((s) => s.branchColorSpread);
  const branchColorTone = useAppStore((s) => s.branchColorTone);
  const branchColorOpacity = useAppStore((s) => s.branchColorOpacity);
  const branchColorGradient = useAppStore((s) => s.branchColorGradient);
  const branchColorSolid = useAppStore((s) => s.branchColorSolid);
  const branchColorSettingsById = useAppStore((s) => s.branchColorSettingsById);
  const branchColorTuningTargetId = useAppStore(
    (s) => s.branchColorTuningTargetId,
  );
  const inactiveCardDim = useAppStore((s) => s.inactiveCardDim);
  const themeTuning = useAppStore((s) => s.themeTuning);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
  const exportToMarkdown = useAppStore((s) => s.exportToMarkdown);
  const exportToStructuredMarkdown = useAppStore(
    (s) => s.exportToStructuredMarkdown,
  );
  const exportToJson = useAppStore((s) => s.exportToJson);
  const toggleCardsCollapsed = useAppStore((s) => s.toggleCardsCollapsed);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const setTheme = useAppStore((s) => s.setTheme);
  const setActiveBranchColor = useAppStore((s) => s.setActiveBranchColor);
  const clearAllBranchColors = useAppStore((s) => s.clearAllBranchColors);
  const autoColorRootBranches = useAppStore((s) => s.autoColorRootBranches);
  const setBranchColorIntensity = useAppStore((s) => s.setBranchColorIntensity);
  const setBranchColorSpread = useAppStore((s) => s.setBranchColorSpread);
  const setBranchColorTone = useAppStore((s) => s.setBranchColorTone);
  const branchColorBorderWidth = useAppStore((s) => s.branchColorBorderWidth);
  const branchColorBorderBrightness = useAppStore((s) => s.branchColorBorderBrightness);
  const setBranchColorOpacity = useAppStore((s) => s.setBranchColorOpacity);
  const setBranchColorGradient = useAppStore((s) => s.setBranchColorGradient);
  const setBranchColorSolid = useAppStore((s) => s.setBranchColorSolid);
  const setBranchColorBorderWidth = useAppStore((s) => s.setBranchColorBorderWidth);
  const setBranchColorBorderBrightness = useAppStore((s) => s.setBranchColorBorderBrightness);
  const setBranchColorSettingsForId = useAppStore(
    (s) => s.setBranchColorSettingsForId,
  );
  const resetBranchColorSettingsForId = useAppStore(
    (s) => s.resetBranchColorSettingsForId,
  );
  const setBranchColorTuningTargetId = useAppStore(
    (s) => s.setBranchColorTuningTargetId,
  );
  const setInactiveCardDim = useAppStore((s) => s.setInactiveCardDim);
  const setThemeTuneValue = useAppStore((s) => s.setThemeTuneValue);
  const resetThemeTune = useAppStore((s) => s.resetThemeTune);

  const uiMode = useAppStore((s) => s.uiMode);
  const setUiMode = useAppStore((s) => s.setUiMode);

  useClickOutside(exportMenuRef, () => {
    if (exportMenuOpen) setExportMenuOpen(false);
  });

  useClickOutside(branchColorMenuRef, () => {
    if (branchColorMenuOpen) setBranchColorMenuOpen(false);
  });

  useClickOutside(themeTuneMenuRef, () => {
    if (themeTuneMenuOpen) setThemeTuneMenuOpen(false);
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
      if (e.key === "Escape" && themeTuneMenuOpen) {
        setThemeTuneMenuOpen(false);
      }
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [branchColorMenuOpen, exportMenuOpen, mobileMenuOpen, themeTuneMenuOpen]);

  useEffect(() => {
    if (!branchColorMenuOpen) {
      setBranchColorTuningTargetId(null);
    }
  }, [branchColorMenuOpen, setBranchColorTuningTargetId]);

  // Reset unlock when switching away from mono theme
  useEffect(() => {
    if (theme !== "mono") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSettingsUnlocked(false);
      beautifulClickTimesRef.current = [];
    }
  }, [theme]);

  const activeBranchColorId = useMemo(() => {
    if (!activeId) return null;
    return getBranchColorId(buildTreeIndex(nodes), activeId);
  }, [activeId, nodes]);
  const globalBranchColorSettings = useMemo(
    () => ({
      intensity: branchColorIntensity,
      fill: branchColorSpread,
      opacity: branchColorOpacity,
      gradient: branchColorGradient,
      solid: branchColorSolid,
      tone: branchColorTone,
      borderWidth: branchColorBorderWidth,
      borderBrightness: branchColorBorderBrightness,
    }),
    [
      branchColorGradient,
      branchColorIntensity,
      branchColorOpacity,
      branchColorSolid,
      branchColorSpread,
      branchColorTone,
      branchColorBorderWidth,
      branchColorBorderBrightness,
    ],
  );
  const tuningBranchColorId =
    activeBranchColorId ?? branchColorTuningTargetId ?? null;
  const currentBranchColorSettings = getBranchColorSettings(
    globalBranchColorSettings,
    branchColorSettingsById,
    tuningBranchColorId,
  );
  const activeBranchColorSettings = getBranchColorSettings(
    globalBranchColorSettings,
    branchColorSettingsById,
    activeBranchColorId,
  );
  const activeBranchColor = getBranchColor(
    theme,
    activeBranchColorId,
    activeBranchColorSettings.tone,
    activeBranchColorSettings,
  );
  const branchPalette = getBranchPalette(theme);
  const tuningBranchRgb = tuningBranchColorId
    ? adjustBranchColorRgb(
        branchPalette[tuningBranchColorId].rgb,
        currentBranchColorSettings.tone,
      )
    : null;
  const branchSliderColor = tuningBranchRgb
    ? `rgb(${tuningBranchRgb})`
    : "var(--app-accent)";
  const branchIntensityMix = branchMixPercent(
    currentBranchColorSettings.intensity * 0.34,
  );
  const branchFillMix = branchMixPercent(
    currentBranchColorSettings.fill * 0.24,
  );
  const branchGradientMidPos = 26 + currentBranchColorSettings.gradient * 0.45;
  const branchGradientMidMix = 7 + currentBranchColorSettings.gradient * 0.1;
  const branchGradientEndMix = currentBranchColorSettings.gradient * 0.1;
  const themeId = getThemeId(theme);
  const currentThemeTune = getThemeTune(themeTuning, themeId);
  const resolvedThemeTuning = useMemo(
    () =>
      Object.fromEntries(
        THEME_IDS.map((item) => [item, getThemeTune(themeTuning, item)]),
      ),
    [themeTuning],
  );
  const tuningExportJson = useMemo(
    () =>
      JSON.stringify(
        {
          theme,
          themeTuning: resolvedThemeTuning,
          branchColors: {
            intensity: branchColorIntensity,
            fill: branchColorSpread,
            opacity: branchColorOpacity,
            gradient: branchColorGradient,
            solid: branchColorSolid,
            tone: branchColorTone,
            byColor: branchColorSettingsById,
          },
          inactiveCardDim,
        },
        null,
        2,
      ),
    [
      branchColorGradient,
      branchColorIntensity,
      branchColorOpacity,
      branchColorSettingsById,
      branchColorSolid,
      branchColorSpread,
      branchColorTone,
      inactiveCardDim,
      resolvedThemeTuning,
      theme,
    ],
  );
  const setBranchSetting = (
    key: "intensity" | "fill" | "opacity" | "gradient" | "tone" | "borderWidth" | "borderBrightness",
    value: number,
  ) => {
    const ranges = {
      intensity: [0, 300],
      fill: [0, 100],
      opacity: [0, 100],
      gradient: [0, 100],
      tone: [-100, 100],
      borderWidth: [0, 8],
      borderBrightness: [0, 100],
    } as const;
    const [min, max] = ranges[key];
    const nextValue = clamp(value, min, max);
    if (tuningBranchColorId) {
      setBranchColorSettingsForId(tuningBranchColorId, { [key]: nextValue });
      return;
    }
    if (key === "intensity") setBranchColorIntensity(nextValue);
    if (key === "fill") setBranchColorSpread(nextValue);
    if (key === "opacity") setBranchColorOpacity(nextValue);
    if (key === "gradient") setBranchColorGradient(nextValue);
    if (key === "tone") setBranchColorTone(nextValue);
    if (key === "borderWidth") setBranchColorBorderWidth(nextValue);
    if (key === "borderBrightness") setBranchColorBorderBrightness(nextValue);
  };
  const setBranchSolid = (solid: boolean) => {
    if (tuningBranchColorId) {
      setBranchColorSettingsForId(tuningBranchColorId, { solid });
      return;
    }
    setBranchColorSolid(solid);
  };
  const setBranchIntensity = (value: number) =>
    setBranchSetting("intensity", value);
  const setBranchSpread = (value: number) => setBranchSetting("fill", value);
  const setBranchTone = (value: number) => setBranchSetting("tone", value);
  const copyThemeTuning = async () => {
    try {
      await navigator.clipboard.writeText(tuningExportJson);
      setThemeTuneCopied(true);
      window.setTimeout(() => setThemeTuneCopied(false), 1200);
    } catch {
      setThemeTuneCopied(false);
    }
  };

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
        {isSettingsUnlocked && (
          <div ref={themeTuneMenuRef} className="relative hidden sm:block">
            <button
              onClick={() => setThemeTuneMenuOpen((open) => !open)}
              className={`bg-app-card border border-app-border hover:bg-app-card-hover p-1.5 sm:px-3 sm:py-1.5 rounded transition-colors font-medium flex items-center gap-2 ${
                themeTuneMenuOpen
                  ? "text-app-text-primary bg-app-card-hover"
                  : "text-app-text-secondary"
              }`}
              title="Theme tuning"
              aria-label="Theme tuning"
              aria-expanded={themeTuneMenuOpen}
            >
              <SlidersHorizontal size={16} />
            </button>
          {themeTuneMenuOpen && (
            <div className="absolute right-0 top-full z-[90] mt-2 grid w-[260px] gap-3 rounded border border-app-border bg-app-panel p-3 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-app-text-secondary">
                  Тема
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => resetThemeTune(theme)}
                    className="flex h-7 w-7 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title="Сбросить настройки текущей темы"
                    aria-label="Сбросить настройки текущей темы"
                  >
                    <RotateCcw size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyThemeTuning()}
                    className="flex h-7 w-7 items-center justify-center rounded border border-app-border bg-app-card text-app-text-muted transition-colors hover:bg-app-card-hover hover:text-app-text-primary"
                    title={
                      themeTuneCopied
                        ? "Настройки скопированы"
                        : "Скопировать все настройки темы"
                    }
                    aria-label="Скопировать все настройки темы"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {THEME_IDS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTheme(item)}
                    aria-pressed={themeId === item}
                    className={`rounded border px-2 py-1.5 text-left text-xs transition-colors ${
                      themeId === item
                        ? "border-app-text-primary bg-app-card-hover text-app-text-primary"
                        : "border-app-border bg-app-card text-app-text-muted hover:bg-app-card-hover hover:text-app-text-primary"
                    }`}
                  >
                    {THEME_LABELS[item]}
                  </button>
                ))}
              </div>
              <MiniSlider
                label="Фон"
                min={-50}
                max={50}
                value={currentThemeTune.bg}
                fillStyle={{ background: "var(--app-bg)" }}
                onChange={(value) => setThemeTuneValue(theme, "bg", value)}
              />
              <MiniSlider
                label="Карточка"
                min={-50}
                max={50}
                value={currentThemeTune.card}
                fillStyle={{ background: "var(--app-card)" }}
                onChange={(value) => setThemeTuneValue(theme, "card", value)}
              />
              <MiniSlider
                label="Активная"
                min={-50}
                max={50}
                value={currentThemeTune.activeCard}
                fillStyle={{ background: "var(--app-card-active)" }}
                onChange={(value) =>
                  setThemeTuneValue(theme, "activeCard", value)
                }
              />
              <MiniSlider
                label="Текст"
                min={-50}
                max={50}
                value={currentThemeTune.text}
                fillStyle={{ background: "var(--app-text-primary)" }}
                onChange={(value) => setThemeTuneValue(theme, "text", value)}
              />
              <MiniSlider
                label="Тепло / холод"
                min={-50}
                max={50}
                value={currentThemeTune.warmth}
                fillStyle={{
                  background:
                    "linear-gradient(90deg, #b9e4ff 0%, var(--app-card) 50%, #c98238 100%)",
                }}
                onChange={(value) => setThemeTuneValue(theme, "warmth", value)}
              />
              <MiniSlider
                label="Неактивные"
                min={-50}
                max={50}
                value={inactiveCardDim}
                fillStyle={{
                  opacity: Math.max(0.08, (50 + inactiveCardDim) / 100),
                }}
                onChange={(value) => setInactiveCardDim(clamp(value, -50, 50))}
              />
              {themeTuneCopied && (
                <div className="rounded border border-app-border bg-app-card px-2 py-1.5 text-xs text-app-text-muted">
                  Настройки скопированы
                </div>
              )}
            </div>
          )}
        </div>
        )}
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
                disabled={theme === "mono"}
                onClick={() => {
                  if (activeId) {
                    setActiveBranchColor(null);
                  } else {
                    clearAllBranchColors();
                    setBranchColorTuningTargetId(null);
                  }
                  setBranchColorMenuOpen(false);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded border transition-colors ${
                  theme === "mono"
                    ? "border-app-border bg-app-card text-app-text-muted opacity-40 cursor-not-allowed"
                    : activeBranchColorId === null
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
                const colorSettings = getBranchColorSettings(
                  globalBranchColorSettings,
                  branchColorSettingsById,
                  color.id,
                );
                const rgb = adjustBranchColorRgb(color.rgb, colorSettings.tone);
                const isCurrentColor =
                  activeBranchColorId === color.id ||
                  (!activeId && tuningBranchColorId === color.id);
                return (
                  <button
                    key={color.id}
                    type="button"
                    data-branch-color-swatch
                    disabled={theme === "mono"}
                    onClick={() => {
                      if (tuningBranchColorId === color.id) {
                        setBranchColorTuningTargetId(null);
                        if (activeId && activeBranchColorId === color.id) {
                          setActiveBranchColor(null);
                        }
                      } else {
                        setBranchColorTuningTargetId(color.id);
                        if (activeId) {
                          setActiveBranchColor(color.id);
                        }
                      }
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault();
                      if (theme === "mono") return;
                      resetBranchColorSettingsForId(color.id);
                      setBranchColorTuningTargetId(color.id);
                    }}
                    className={`h-8 w-8 rounded border transition-transform ${
                      theme === "mono"
                        ? "border-app-border opacity-40 cursor-not-allowed"
                        : isCurrentColor
                        ? "border-app-text-primary"
                        : "border-app-border hover:scale-105"
                    }`}
                    style={{
                      background: `linear-gradient(135deg, color-mix(in srgb, rgb(${rgb}) 76%, var(--app-card)), rgb(${rgb}))`,
                      boxShadow: isCurrentColor && theme !== "mono"
                        ? `0 0 0 2px color-mix(in srgb, rgb(${rgb}) 34%, transparent)`
                        : undefined,
                    }}
                    title={theme === "mono" ? undefined : color.label}
                    aria-label={
                      activeId
                        ? `Set and tune branch color: ${color.label}`
                        : `Tune branch color: ${color.label}`
                    }
                  />
                );
              })}
              {/* Always-visible: intensity slider + solid checkbox in one row */}
              <div className="col-span-5 mt-0.5 flex items-center gap-1.5 border-t border-app-border pt-2">
                <div className="min-w-0 flex-1">
                  <MiniSlider
                    label="Яркость"
                    hideLabel
                    min={0}
                    max={300}
                    step={5}
                    value={currentBranchColorSettings.intensity}
                    fillStyle={{
                      background: `color-mix(in srgb, ${branchSliderColor} ${branchIntensityMix}%, var(--app-card))`,
                    }}
                    onChange={setBranchIntensity}
                    disabled={theme === "mono"}
                  />
                </div>
                <label
                  className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border border-app-border bg-app-card${
                    theme === "mono" ? " opacity-40 cursor-not-allowed pointer-events-none" : " cursor-pointer"
                  }`}
                  title="Однотонная заливка"
                >
                  <input
                    type="checkbox"
                    checked={currentBranchColorSettings.solid}
                    onChange={(event) => setBranchSolid(event.target.checked)}
                    className="h-3 w-3 accent-app-accent"
                    aria-label="Однотонная заливка"
                  />
                </label>
              </div>
              {/* Advanced sliders — visible only when unlocked */}
              {isSettingsUnlocked && (
                <div className="col-span-5 grid gap-2">
                  <MiniSlider
                    label="Заливка"
                    min={0}
                    max={100}
                    step={5}
                    value={currentBranchColorSettings.fill}
                    fillStyle={{
                      background: `color-mix(in srgb, ${branchSliderColor} ${branchFillMix}%, var(--app-card))`,
                    }}
                    onChange={setBranchSpread}
                    disabled={theme === "mono"}
                  />
                  <MiniSlider
                    label="Прозрачность"
                    min={0}
                    max={100}
                    step={5}
                    value={currentBranchColorSettings.opacity}
                    fillStyle={{
                      background: branchSliderColor,
                      opacity: currentBranchColorSettings.opacity / 100,
                    }}
                    onChange={(value) => setBranchSetting("opacity", value)}
                  />
                  <MiniSlider
                    label="Плавность"
                    min={0}
                    max={100}
                    step={5}
                    value={currentBranchColorSettings.gradient}
                    fillStyle={{
                      background: `linear-gradient(90deg, color-mix(in srgb, ${branchSliderColor} ${branchFillMix}%, var(--app-card)) 0%, color-mix(in srgb, ${branchSliderColor} ${branchGradientMidMix}%, var(--app-card)) ${branchGradientMidPos}%, color-mix(in srgb, ${branchSliderColor} ${branchGradientEndMix}%, var(--app-card)) 100%)`,
                    }}
                    onChange={(value) => setBranchSetting("gradient", value)}
                  />
                  <MiniSlider
                    label="Оттенок"
                    min={-100}
                    max={100}
                    step={5}
                    value={currentBranchColorSettings.tone}
                    fillStyle={{ background: branchSliderColor }}
                    onChange={setBranchTone}
                  />
                  <MiniSlider
                    label="Яркость рамочки"
                    min={0}
                    max={100}
                    step={2}
                    value={currentBranchColorSettings.borderBrightness}
                    fillStyle={{ background: branchSliderColor }}
                    onChange={(value) => setBranchSetting("borderBrightness", value)}
                  />
                  <MiniSlider
                    label="Толщина рамочки"
                    min={0}
                    max={8}
                    step={1}
                    value={currentBranchColorSettings.borderWidth}
                    fillStyle={{ background: branchSliderColor }}
                    onChange={(value) => setBranchSetting("borderWidth", value)}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  autoColorRootBranches();
                  // Fast triple-click unlock — only in mono theme
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
                }}
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
