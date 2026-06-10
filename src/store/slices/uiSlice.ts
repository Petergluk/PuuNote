import type { AppSlice, UiSlice } from "../appStoreTypes";
import {
  clampTune,
  DEFAULT_THEME_TUNING,
  getThemeId,
  getThemeTune,
} from "../../utils/themeTuning";
import { THEMES } from "../../constants";
import {
  DEFAULT_BRANCH_COLOR_SETTINGS,
  DEFAULT_BRANCH_COLORS_BY_ID,
  normalizeBranchColorSettings,
  THEME_DEFAULT_GLOBAL_SETTINGS,
  THEME_DEFAULT_BRANCH_COLORS,
  type BranchColorSettings,
  type BranchColorSettingsById,
} from "../../utils/branchColors";

const DEFAULT_INACTIVE_CARD_DIM = -25;

function updateBranchSettings(s: UiSlice, partialGlobal: Partial<BranchColorSettings>, newById?: BranchColorSettingsById) {
  const nextGlobal = {
    intensity: partialGlobal.intensity ?? s.branchColorIntensity,
    fill: partialGlobal.fill ?? s.branchColorSpread,
    opacity: partialGlobal.opacity ?? s.branchColorOpacity,
    gradient: partialGlobal.gradient ?? s.branchColorGradient,
    solid: partialGlobal.solid ?? s.branchColorSolid,
    tone: partialGlobal.tone ?? s.branchColorTone,
    borderWidth: partialGlobal.borderWidth ?? s.branchColorBorderWidth,
    borderBrightness: partialGlobal.borderBrightness ?? s.branchColorBorderBrightness,
  };
  const nextById = newById ?? s.branchColorSettingsById;
  
  return {
    branchColorIntensity: nextGlobal.intensity,
    branchColorSpread: nextGlobal.fill,
    branchColorOpacity: nextGlobal.opacity,
    branchColorGradient: nextGlobal.gradient,
    branchColorSolid: nextGlobal.solid,
    branchColorTone: nextGlobal.tone,
    branchColorBorderWidth: nextGlobal.borderWidth,
    branchColorBorderBrightness: nextGlobal.borderBrightness,
    branchColorSettingsById: nextById,
    themeBranchSettings: {
      ...s.themeBranchSettings,
      [s.theme]: {
        global: nextGlobal,
        byId: nextById,
      }
    }
  };
}

function switchThemeWithBranchSettings(s: UiSlice, theme: string) {
  if (s.theme === theme) return s;
  const currentThemeSettings = {
    global: {
      intensity: s.branchColorIntensity,
      fill: s.branchColorSpread,
      opacity: s.branchColorOpacity,
      gradient: s.branchColorGradient,
      solid: s.branchColorSolid,
      tone: s.branchColorTone,
      borderWidth: s.branchColorBorderWidth,
      borderBrightness: s.branchColorBorderBrightness,
    },
    byId: s.branchColorSettingsById,
  };
  const nextThemeSettings = s.themeBranchSettings[theme] || {
    global: THEME_DEFAULT_GLOBAL_SETTINGS[theme] || THEME_DEFAULT_GLOBAL_SETTINGS["light"],
    byId: THEME_DEFAULT_BRANCH_COLORS[theme] || {},
  };
  return {
    theme,
    themeBranchSettings: {
      ...s.themeBranchSettings,
      [s.theme]: currentThemeSettings,
    },
    branchColorIntensity: nextThemeSettings.global.intensity,
    branchColorSpread: nextThemeSettings.global.fill,
    branchColorOpacity: nextThemeSettings.global.opacity,
    branchColorGradient: nextThemeSettings.global.gradient,
    branchColorSolid: nextThemeSettings.global.solid,
    branchColorTone: nextThemeSettings.global.tone,
    branchColorBorderWidth: nextThemeSettings.global.borderWidth,
    branchColorBorderBrightness: nextThemeSettings.global.borderBrightness,
    branchColorSettingsById: nextThemeSettings.byId,
  };
}

const updateSingleBranchSetting = (
  s: UiSlice,
  stateKey: keyof UiSlice,
  settingKey: keyof BranchColorSettings,
  value: BranchColorSettings[keyof BranchColorSettings]
) => {
  if (s[stateKey] === value) return s;
  const branchColorSettingsById = { ...s.branchColorSettingsById };
  for (const key in branchColorSettingsById) {
    const id = key as keyof typeof branchColorSettingsById;
    if (branchColorSettingsById[id]) {
      branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
      delete branchColorSettingsById[id]![settingKey];
    }
  }
  return updateBranchSettings(s, { [settingKey]: value }, branchColorSettingsById);
};

export const createUiSlice: AppSlice<UiSlice> = (set) => ({
  fileMenuOpen: false,
  theme: "dark",
  cardsCollapsed: false,
  inactiveBranchesMode: "dim",
  focusModeScope: "branchLevel",
  editorMode: "markdown",

  editorEnterMode: "enterNewline",
  pasteSplitMode: "separator",
  settingsOpen: false,
  pluginsOpen: false,
  isSidebarOpen: false,
  activeSidebarPluginId: null,
  sidebarWidth: 350,
  disabledPlugins: [],
  timelineOpen: false,
  colWidth: 320,
  branchColorIntensity: DEFAULT_BRANCH_COLOR_SETTINGS.intensity,
  branchColorSpread: DEFAULT_BRANCH_COLOR_SETTINGS.fill,
  branchColorTone: DEFAULT_BRANCH_COLOR_SETTINGS.tone,
  branchColorOpacity: DEFAULT_BRANCH_COLOR_SETTINGS.opacity,
  branchColorGradient: DEFAULT_BRANCH_COLOR_SETTINGS.gradient,
  branchColorSolid: DEFAULT_BRANCH_COLOR_SETTINGS.solid,
  branchColorBorderWidth: DEFAULT_BRANCH_COLOR_SETTINGS.borderWidth,
  branchColorBorderBrightness: DEFAULT_BRANCH_COLOR_SETTINGS.borderBrightness,
  branchColorSettingsById: DEFAULT_BRANCH_COLORS_BY_ID,
  themeBranchSettings: {},
  branchColorTuningTargetId: null,
  inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,
  themeTuning: DEFAULT_THEME_TUNING,
  commandPaletteOpen: false,
  uiMode: "normal",
  saveStatus: "saved",
  confirmDialog: { isOpen: false, message: "" },
  floatingActionsVisible: false,

  openConfirm: (message, onConfirm) =>
    set({
      confirmDialog: { isOpen: true, message, onConfirm },
    }),
  closeConfirm: () =>
    set({
      confirmDialog: { isOpen: false, message: "", onConfirm: undefined },
    }),

  setCommandPaletteOpen: (commandPaletteOpen) =>
    set((s) =>
      s.commandPaletteOpen === commandPaletteOpen ? s : { commandPaletteOpen },
    ),
  setTheme: (theme) => set((s) => switchThemeWithBranchSettings(s, theme)),
  toggleTheme: () =>
    set((s) => {
      const themes = [...THEMES];
      const currentIndex = themes.findIndex((t) => t === s.theme);
      const theme =
        currentIndex === -1
          ? "light"
          : themes[(currentIndex + 1) % themes.length];
      
      return switchThemeWithBranchSettings(s, theme);
    }),
  setCardsCollapsed: (cardsCollapsed) =>
    set((s) => (s.cardsCollapsed === cardsCollapsed ? s : { cardsCollapsed })),
  toggleCardsCollapsed: () =>
    set((state) => ({ cardsCollapsed: !state.cardsCollapsed })),
  setInactiveBranchesMode: (inactiveBranchesMode) =>
    set((s) =>
      s.inactiveBranchesMode === inactiveBranchesMode
        ? s
        : { inactiveBranchesMode },
    ),
  setFocusModeScope: (focusModeScope) =>
    set((s) => (s.focusModeScope === focusModeScope ? s : { focusModeScope })),
  setEditorMode: (editorMode) =>
    set((s) => (s.editorMode === editorMode ? s : { editorMode })),

  setEditorEnterMode: (editorEnterMode) =>
    set((s) =>
      s.editorEnterMode === editorEnterMode ? s : { editorEnterMode },
    ),
  setPasteSplitMode: (pasteSplitMode) =>
    set((s) => (s.pasteSplitMode === pasteSplitMode ? s : { pasteSplitMode })),
  setSettingsOpen: (settingsOpen) =>
    set((s) => (s.settingsOpen === settingsOpen ? s : { settingsOpen })),
  setPluginsOpen: (pluginsOpen) =>
    set((s) => (s.pluginsOpen === pluginsOpen ? s : { pluginsOpen })),
  setSidebarOpen: (isSidebarOpen) =>
    set((s) => (s.isSidebarOpen === isSidebarOpen ? s : { isSidebarOpen })),
  setActiveSidebarPluginId: (activeSidebarPluginId) =>
    set((s) => (s.activeSidebarPluginId === activeSidebarPluginId ? s : { activeSidebarPluginId })),
  setSidebarWidth: (sidebarWidth) =>
    set((s) => (s.sidebarWidth === sidebarWidth ? s : { sidebarWidth })),
  setDisabledPlugins: (disabledPlugins) => {
    localStorage.setItem('PUU_DISABLED_PLUGINS', JSON.stringify(disabledPlugins));
    set(() => ({ disabledPlugins }));
  },
  setTimelineOpen: (timelineOpen) =>
    set((s) => (s.timelineOpen === timelineOpen ? s : { timelineOpen })),
  setColWidth: (colWidth) =>
    set((s) => (s.colWidth === colWidth ? s : { colWidth })),
  setBranchColorIntensity: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorIntensity', 'intensity', val)),
  setBranchColorSpread: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorSpread', 'fill', val)),
  setBranchColorTone: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorTone', 'tone', val)),
  setBranchColorOpacity: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorOpacity', 'opacity', val)),
  setBranchColorGradient: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorGradient', 'gradient', val)),
  setBranchColorSolid: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorSolid', 'solid', val)),
  setBranchColorBorderWidth: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorBorderWidth', 'borderWidth', val)),
  setBranchColorBorderBrightness: (val) => set((s) => updateSingleBranchSetting(s, 'branchColorBorderBrightness', 'borderBrightness', val)),
  setBranchColorSettingsForId: (colorId, settings) =>
    set((s) => {
      const current = normalizeBranchColorSettings(
        s.branchColorSettingsById[colorId],
        {
          intensity: s.branchColorIntensity,
          fill: s.branchColorSpread,
          opacity: s.branchColorOpacity,
          gradient: s.branchColorGradient,
          solid: s.branchColorSolid,
          tone: s.branchColorTone,
          borderWidth: s.branchColorBorderWidth,
          borderBrightness: s.branchColorBorderBrightness,
        },
      );
      const nextSettingsById = {
        ...s.branchColorSettingsById,
        [colorId]: normalizeBranchColorSettings({
          ...current,
          ...settings,
        }),
      };
      return updateBranchSettings(s, {}, nextSettingsById);
    }),
  resetBranchColorSettingsForId: (colorId) =>
    set((s) => {
      const nextSettings = { ...s.branchColorSettingsById };
      delete nextSettings[colorId];
      return updateBranchSettings(s, {}, nextSettings);
    }),
  setBranchColorTuningTargetId: (branchColorTuningTargetId) =>
    set((s) =>
      s.branchColorTuningTargetId === branchColorTuningTargetId
        ? s
        : { branchColorTuningTargetId },
    ),
  setInactiveCardDim: (inactiveCardDim) =>
    set((s) =>
      s.inactiveCardDim === inactiveCardDim ? s : { inactiveCardDim },
    ),
  setThemeTuneValue: (theme, key, value) =>
    set((s) => {
      const themeId = getThemeId(theme);
      const currentTune = getThemeTune(s.themeTuning, themeId);
      const nextTune = {
        ...currentTune,
        [key]: clampTune(value),
      };
      return {
        themeTuning: {
          ...s.themeTuning,
          [themeId]: nextTune,
        },
      };
    }),
  resetThemeTune: (theme) =>
    set((s) => {
      const themeId = getThemeId(theme);
      return {
        inactiveCardDim: DEFAULT_INACTIVE_CARD_DIM,
        themeTuning: {
          ...s.themeTuning,
          [themeId]: DEFAULT_THEME_TUNING[themeId] ?? {},
        },
      };
    }),
  setUiMode: (uiMode) => set((s) => (s.uiMode === uiMode ? s : { uiMode })),
  setSaveStatus: (saveStatus) =>
    set((s) => (s.saveStatus === saveStatus ? s : { saveStatus })),
  setFileMenuOpen: (fileMenuOpen) =>
    set((s) => (s.fileMenuOpen === fileMenuOpen ? s : { fileMenuOpen })),
  setFloatingActionsVisible: (floatingActionsVisible) =>
    set((s) =>
      s.floatingActionsVisible === floatingActionsVisible
        ? s
        : { floatingActionsVisible },
    ),
});
