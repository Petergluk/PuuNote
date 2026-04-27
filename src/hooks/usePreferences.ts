import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
export function usePreferencesInit() {
  const { cardsCollapsed, colWidth, theme } = useAppStore(); /* Initial Load */
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
  }, []); /* Sync to LocalStorage & DOM */
  useEffect(() => {
    localStorage.setItem("puu_cardsCollapsed", String(cardsCollapsed));
  }, [cardsCollapsed]);
  useEffect(() => {
    localStorage.setItem("puu_colWidth", colWidth.toString());
  }, [colWidth]);
  useEffect(() => {
    /* Clear old theme classes */
    document.documentElement.classList.remove(
      "dark",
      "theme-blue",
      "theme-brown",
    ); /* Process compound themes like"blue"vs"dark-blue"or"dark theme-blue" */
    if (theme.startsWith("dark")) {
      document.documentElement.classList.add("dark");
    }
    if (theme.includes("blue")) {
      document.documentElement.classList.add("theme-blue");
    } else if (theme.includes("brown")) {
      document.documentElement.classList.add("theme-brown");
    }
    localStorage.setItem("puu_theme", theme);
  }, [theme]);
}
