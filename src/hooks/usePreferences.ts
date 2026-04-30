import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

const safeLocalStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
};

export const applyTheme = (theme: string) => {
  document.documentElement.classList.remove(
    "dark",
    "theme-blue",
    "theme-brown",
  );
  if (theme.startsWith("dark")) {
    document.documentElement.classList.add("dark");
  }
  if (theme.includes("blue")) {
    document.documentElement.classList.add("theme-blue");
  } else if (theme.includes("brown")) {
    document.documentElement.classList.add("theme-brown");
  }
};

export function usePreferencesInit() {
  /* Initial Load */
  useEffect(() => {
    const savedCollapsed =
      safeLocalStorage.getItem("puu_cardsCollapsed") === "true";
    const savedWidth = Number(safeLocalStorage.getItem("puu_colWidth")) || 357;
    const savedInactiveBranchesMode =
      safeLocalStorage.getItem("puu_inactiveBranchesMode") === "hide"
        ? "hide"
        : "dim";
    const savedFocusModeScope = safeLocalStorage.getItem("puu_focusModeScope");
    const focusModeScope =
      savedFocusModeScope === "single" ||
      savedFocusModeScope === "column" ||
      savedFocusModeScope === "branchLevel"
        ? savedFocusModeScope
        : "branchLevel";
    const savedEditorMode =
      safeLocalStorage.getItem("puu_editorMode") === "visual"
        ? "visual"
        : "markdown";
    const savedEditorEnterMode =
      safeLocalStorage.getItem("puu_editorEnterMode") === "enterCard"
        ? "enterCard"
        : "enterNewline";
    const savedPasteSplitMode =
      safeLocalStorage.getItem("puu_pasteSplitMode") === "paragraph"
        ? "paragraph"
        : "separator";
    let savedTheme = safeLocalStorage.getItem("puu_theme");
    if (!savedTheme) {
      savedTheme =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    }
    useAppStore.setState({
      cardsCollapsed: savedCollapsed,
      colWidth: savedWidth,
      inactiveBranchesMode: savedInactiveBranchesMode,
      focusModeScope,
      editorMode: savedEditorMode,
      editorEnterMode: savedEditorEnterMode,
      pasteSplitMode: savedPasteSplitMode,
      theme: savedTheme,
    });
    applyTheme(savedTheme);
  }, []); /* Sync to LocalStorage & DOM */

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.cardsCollapsed !== prevState.cardsCollapsed) {
        safeLocalStorage.setItem(
          "puu_cardsCollapsed",
          String(state.cardsCollapsed),
        );
      }
      if (state.colWidth !== prevState.colWidth) {
        safeLocalStorage.setItem("puu_colWidth", state.colWidth.toString());
      }
      if (state.inactiveBranchesMode !== prevState.inactiveBranchesMode) {
        safeLocalStorage.setItem(
          "puu_inactiveBranchesMode",
          state.inactiveBranchesMode,
        );
      }
      if (state.focusModeScope !== prevState.focusModeScope) {
        safeLocalStorage.setItem("puu_focusModeScope", state.focusModeScope);
      }
      if (state.editorMode !== prevState.editorMode) {
        safeLocalStorage.setItem("puu_editorMode", state.editorMode);
      }
      if (state.editorEnterMode !== prevState.editorEnterMode) {
        safeLocalStorage.setItem("puu_editorEnterMode", state.editorEnterMode);
      }
      if (state.pasteSplitMode !== prevState.pasteSplitMode) {
        safeLocalStorage.setItem("puu_pasteSplitMode", state.pasteSplitMode);
      }
      if (state.theme !== prevState.theme) {
        applyTheme(state.theme);
        safeLocalStorage.setItem("puu_theme", state.theme);
      }
    });
    return unsubscribe;
  }, []);
}
