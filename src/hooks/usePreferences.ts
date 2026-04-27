import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";

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
      localStorage.getItem("puu_cardsCollapsed") === "true";
    const savedWidth = Number(localStorage.getItem("puu_colWidth")) || 357;
    let savedTheme = localStorage.getItem("puu_theme");
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
      theme: savedTheme,
    });
    applyTheme(savedTheme);
  }, []); /* Sync to LocalStorage & DOM */

  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (state.cardsCollapsed !== prevState.cardsCollapsed) {
        localStorage.setItem(
          "puu_cardsCollapsed",
          String(state.cardsCollapsed),
        );
      }
      if (state.colWidth !== prevState.colWidth) {
        localStorage.setItem("puu_colWidth", state.colWidth.toString());
      }
      if (state.theme !== prevState.theme) {
        applyTheme(state.theme);
        localStorage.setItem("puu_theme", state.theme);
      }
    });
    return unsubscribe;
  }, []);
}
