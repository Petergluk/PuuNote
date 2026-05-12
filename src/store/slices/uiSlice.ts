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
} from "../../utils/branchColors";

const DEFAULT_INACTIVE_CARD_DIM = -25;

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
  setTheme: (theme) => set((s) => (s.theme === theme ? s : { theme })),
  toggleTheme: () =>
    set((state) => {
      const themes = ["mono", "light", "light-cool", "dark", "blue", "brown"];
      const currentIndex = themes.indexOf(state.theme);
      const nextTheme =
        currentIndex === -1
          ? "light"
          : themes[(currentIndex + 1) % themes.length];
      return { theme: nextTheme };
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
      return { branchColorIntensity, branchColorSettingsById };
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
      return { branchColorSpread, branchColorSettingsById };
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
      return { branchColorTone, branchColorSettingsById };
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
      return { branchColorOpacity, branchColorSettingsById };
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
      return { branchColorGradient, branchColorSettingsById };
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
      return { branchColorSolid, branchColorSettingsById };
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
      return { branchColorBorderWidth, branchColorSettingsById };
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
      return { branchColorBorderBrightness, branchColorSettingsById };
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
      return {
        branchColorSettingsById: {
          ...s.branchColorSettingsById,
          [colorId]: normalizeBranchColorSettings({
            ...current,
            ...settings,
          }),
        },
      };
    }),
  resetBranchColorSettingsForId: (colorId) =>
    set((s) => {
      const nextSettings = { ...s.branchColorSettingsById };
      delete nextSettings[colorId];
      return { branchColorSettingsById: nextSettings };
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
