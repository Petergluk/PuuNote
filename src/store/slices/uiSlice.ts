import type { AppSlice, UiSlice } from "../appStoreTypes";

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

  triggerLayoutAlign: () => set((state) => ({ layoutAlignTrigger: state.layoutAlignTrigger + 1 })),
  setCommandPaletteOpen: (commandPaletteOpen) =>
    set((s) => (s.commandPaletteOpen === commandPaletteOpen ? s : { commandPaletteOpen })),
  setTheme: (theme) => set((s) => (s.theme === theme ? s : { theme })),
  toggleTheme: () =>
    set((state) => {
      const themes = ["light", "dark", "blue", "brown"];
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
      s.inactiveBranchesMode === inactiveBranchesMode ? s : { inactiveBranchesMode },
    ),
  setFocusModeScope: (focusModeScope) =>
    set((s) => (s.focusModeScope === focusModeScope ? s : { focusModeScope })),
  setEditorMode: (editorMode) =>
    set((s) => (s.editorMode === editorMode ? s : { editorMode })),

  setEditorEnterMode: (editorEnterMode) =>
    set((s) => (s.editorEnterMode === editorEnterMode ? s : { editorEnterMode })),
  setPasteSplitMode: (pasteSplitMode) =>
    set((s) => (s.pasteSplitMode === pasteSplitMode ? s : { pasteSplitMode })),
  setSettingsOpen: (settingsOpen) =>
    set((s) => (s.settingsOpen === settingsOpen ? s : { settingsOpen })),
  setTimelineOpen: (timelineOpen) =>
    set((s) => (s.timelineOpen === timelineOpen ? s : { timelineOpen })),
  setColWidth: (colWidth) =>
    set((s) => (s.colWidth === colWidth ? s : { colWidth })),
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
