import type { AppSlice, UiSlice } from "../appStoreTypes";

export const createUiSlice: AppSlice<UiSlice> = (set) => ({
  fileMenuOpen: false,
  theme: "light",
  cardsCollapsed: false,
  timelineOpen: false,
  colWidth: 320,
  commandPaletteOpen: false,
  uiMode: "normal",
  confirmDialog: { isOpen: false, message: "" },

  openConfirm: (message, onConfirm) =>
    set({
      confirmDialog: { isOpen: true, message, onConfirm },
    }),
  closeConfirm: () =>
    set((state) => ({
      confirmDialog: { ...state.confirmDialog, isOpen: false },
    })),

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
  setTimelineOpen: (timelineOpen) => set({ timelineOpen }),
  setColWidth: (colWidth) => set({ colWidth }),
  setUiMode: (uiMode) => set({ uiMode }),
  setFileMenuOpen: (fileMenuOpen) => set({ fileMenuOpen }),
});
