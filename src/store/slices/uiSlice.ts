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

  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setTheme: (theme) => set({ theme }),
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
  setCardsCollapsed: (cardsCollapsed) => set({ cardsCollapsed }),
  toggleCardsCollapsed: () =>
    set((state) => ({ cardsCollapsed: !state.cardsCollapsed })),
  setInactiveBranchesMode: (inactiveBranchesMode) =>
    set({ inactiveBranchesMode }),
  setFocusModeScope: (focusModeScope) => set({ focusModeScope }),
  setEditorMode: (editorMode) => set({ editorMode }),
  setEditorEnterMode: (editorEnterMode) => set({ editorEnterMode }),
  setPasteSplitMode: (pasteSplitMode) => set({ pasteSplitMode }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setTimelineOpen: (timelineOpen) => set({ timelineOpen }),
  setColWidth: (colWidth) => set({ colWidth }),
  setUiMode: (uiMode) => set({ uiMode }),
  setFileMenuOpen: (fileMenuOpen) => set({ fileMenuOpen }),
  setFloatingActionsVisible: (floatingActionsVisible) =>
    set({ floatingActionsVisible }),
});
