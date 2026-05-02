import type { AppSlice, UiSlice } from "../appStoreTypes";
import {
  clampTune,
  DEFAULT_THEME_TUNE,
  getThemeId,
  getThemeTune,
} from "../../utils/themeTuning";

export const createUiSlice: AppSlice<UiSlice> = (set) => ({
  fileMenuOpen: false,
  theme: "light",
  cardsCollapsed: false,
  inactiveBranchesMode: "dim",
  focusModeScope: "branchLevel",
  editorMode: "markdown",

  editorEnterMode: "enterNewline",
  pasteSplitMode: "separator",
  settingsOpen: false,
  timelineOpen: false,
  colWidth: 320,
  branchColorIntensity: 100,
  branchColorSpread: 35,
  branchColorTone: 0,
  themeTuning: {},
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
    set((s) =>
      s.branchColorIntensity === branchColorIntensity
        ? s
        : { branchColorIntensity },
    ),
  setBranchColorSpread: (branchColorSpread) =>
    set((s) =>
      s.branchColorSpread === branchColorSpread ? s : { branchColorSpread },
    ),
  setBranchColorTone: (branchColorTone) =>
    set((s) =>
      s.branchColorTone === branchColorTone ? s : { branchColorTone },
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
        themeTuning: {
          ...s.themeTuning,
          [themeId]: DEFAULT_THEME_TUNE,
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
