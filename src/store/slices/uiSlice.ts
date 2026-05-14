import type { AppSlice, UiSlice } from "../appStoreTypes";
import {
  clampTune,
  DEFAULT_THEME_TUNING,
  getThemeId,
  getThemeTune,
} from "../../utils/themeTuning";
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
  disabledPlugins: JSON.parse(localStorage.getItem('PUU_DISABLED_PLUGINS') || '[]'),
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
  layoutAlignTrigger: 0,
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

  triggerLayoutAlign: () =>
    set((state) => ({ layoutAlignTrigger: state.layoutAlignTrigger + 1 })),
  setCommandPaletteOpen: (commandPaletteOpen) =>
    set((s) =>
      s.commandPaletteOpen === commandPaletteOpen ? s : { commandPaletteOpen },
    ),
  setTheme: (theme) => set((s) => {
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
  }),
  toggleTheme: () =>
    set((s) => {
      const themes = ["mono", "light", "light-cool", "dark", "blue", "brown"];
      const currentIndex = themes.indexOf(s.theme);
      const theme =
        currentIndex === -1
          ? "light"
          : themes[(currentIndex + 1) % themes.length];
      
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
  setDisabledPlugins: (disabledPlugins) => {
    localStorage.setItem('PUU_DISABLED_PLUGINS', JSON.stringify(disabledPlugins));
    set(() => ({ disabledPlugins }));
  },
  setTimelineOpen: (timelineOpen) =>
    set((s) => (s.timelineOpen === timelineOpen ? s : { timelineOpen })),
  setColWidth: (colWidth) =>
    set((s) => (s.colWidth === colWidth ? s : { colWidth })),
  setBranchColorIntensity: (branchColorIntensity) =>
    set((s) => {
      if (s.branchColorIntensity === branchColorIntensity) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.intensity;
        }
      }
      return updateBranchSettings(s, { intensity: branchColorIntensity }, branchColorSettingsById);
    }),
  setBranchColorSpread: (branchColorSpread) =>
    set((s) => {
      if (s.branchColorSpread === branchColorSpread) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.fill;
        }
      }
      return updateBranchSettings(s, { fill: branchColorSpread }, branchColorSettingsById);
    }),
  setBranchColorTone: (branchColorTone) =>
    set((s) => {
      if (s.branchColorTone === branchColorTone) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.tone;
        }
      }
      return updateBranchSettings(s, { tone: branchColorTone }, branchColorSettingsById);
    }),
  setBranchColorOpacity: (branchColorOpacity) =>
    set((s) => {
      if (s.branchColorOpacity === branchColorOpacity) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.opacity;
        }
      }
      return updateBranchSettings(s, { opacity: branchColorOpacity }, branchColorSettingsById);
    }),
  setBranchColorGradient: (branchColorGradient) =>
    set((s) => {
      if (s.branchColorGradient === branchColorGradient) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.gradient;
        }
      }
      return updateBranchSettings(s, { gradient: branchColorGradient }, branchColorSettingsById);
    }),
  setBranchColorSolid: (branchColorSolid) =>
    set((s) => {
      if (s.branchColorSolid === branchColorSolid) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.solid;
        }
      }
      return updateBranchSettings(s, { solid: branchColorSolid }, branchColorSettingsById);
    }),
  setBranchColorBorderWidth: (branchColorBorderWidth) =>
    set((s) => {
      if (s.branchColorBorderWidth === branchColorBorderWidth) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.borderWidth;
        }
      }
      return updateBranchSettings(s, { borderWidth: branchColorBorderWidth }, branchColorSettingsById);
    }),
  setBranchColorBorderBrightness: (branchColorBorderBrightness) =>
    set((s) => {
      if (s.branchColorBorderBrightness === branchColorBorderBrightness) return s;
      const branchColorSettingsById = { ...s.branchColorSettingsById };
      for (const key in branchColorSettingsById) {
        const id = key as keyof typeof branchColorSettingsById;
        if (branchColorSettingsById[id]) {
          branchColorSettingsById[id] = { ...branchColorSettingsById[id] };
          delete branchColorSettingsById[id]!.borderBrightness;
        }
      }
      return updateBranchSettings(s, { borderBrightness: branchColorBorderBrightness }, branchColorSettingsById);
    }),
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
