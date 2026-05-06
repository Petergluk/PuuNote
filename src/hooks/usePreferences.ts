import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import {
  DEFAULT_BRANCH_COLOR_SETTINGS,
  normalizeBranchColorSettingsById,
} from "../utils/branchColors";
import {
  buildThemeCssVars,
  DEFAULT_THEME_TUNING,
  normalizeThemeTuning,
  type ThemeId,
  type ThemeTune,
} from "../utils/themeTuning";

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

const clampBranchColorIntensity = (value: number) =>
  Math.max(0, Math.min(300, Math.round(value)));

const clampBranchColorSpread = (value: number) =>
  Math.max(0, Math.min(100, Math.round(value)));

const clampBranchColorTone = (value: number) =>
  Math.max(-100, Math.min(100, Math.round(value)));

const DEFAULT_INACTIVE_CARD_DIM = -25;

const clampPercent = (value: string | null, fallback: number) => {
  const parsed = value === null ? fallback : Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(0, Math.min(100, Math.round(safeValue)));
};

const clampInactiveCardDim = (value: string | null) => {
  const parsed = value === null ? DEFAULT_INACTIVE_CARD_DIM : Number(value);
  const safeValue = Number.isFinite(parsed)
    ? parsed
    : DEFAULT_INACTIVE_CARD_DIM;
  return Math.max(-50, Math.min(50, Math.round(safeValue)));
};

export const applyTheme = (
  theme: string,
  themeTuning: Partial<Record<ThemeId, ThemeTune>> = {},
) => {
  document.documentElement.classList.remove(
    "dark",
    "theme-light-cool",
    "theme-blue",
    "theme-brown",
    "theme-mono",
  );
  if (theme.startsWith("dark")) {
    document.documentElement.classList.add("dark");
  }
  if (theme.includes("light-cool")) {
    document.documentElement.classList.add("theme-light-cool");
  } else if (theme.includes("blue")) {
    document.documentElement.classList.add("theme-blue");
  } else if (theme.includes("brown")) {
    document.documentElement.classList.add("theme-brown");
  } else if (theme.includes("mono")) {
    document.documentElement.classList.add("theme-mono");
  }
  const cssVars = buildThemeCssVars(theme, themeTuning);
  Object.entries(cssVars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
};

export function usePreferencesInit() {
  /* Initial Load */
  useEffect(() => {
    const savedCollapsed =
      safeLocalStorage.getItem("puu_cardsCollapsed") === "true";
    const savedWidth = Number(safeLocalStorage.getItem("puu_colWidth")) || 357;
    const savedBranchColorIntensity = clampBranchColorIntensity(
      Number(safeLocalStorage.getItem("puu_branchColorIntensity")) ||
        DEFAULT_BRANCH_COLOR_SETTINGS.intensity,
    );
    const savedBranchColorSpread = clampBranchColorSpread(
      Number(safeLocalStorage.getItem("puu_branchColorSpread")) ||
        DEFAULT_BRANCH_COLOR_SETTINGS.fill,
    );
    const savedBranchColorTone = clampBranchColorTone(
      Number(safeLocalStorage.getItem("puu_branchColorTone")) ||
        DEFAULT_BRANCH_COLOR_SETTINGS.tone,
    );
    const savedBranchColorOpacity = clampPercent(
      safeLocalStorage.getItem("puu_branchColorOpacity"),
      DEFAULT_BRANCH_COLOR_SETTINGS.opacity,
    );
    const savedBranchColorGradient = clampPercent(
      safeLocalStorage.getItem("puu_branchColorGradient"),
      DEFAULT_BRANCH_COLOR_SETTINGS.gradient,
    );
    const savedBranchColorSolid =
      safeLocalStorage.getItem("puu_branchColorSolid") === "true";
    const savedBranchColorSettingsById = (() => {
      try {
        return normalizeBranchColorSettingsById(
          JSON.parse(
            safeLocalStorage.getItem("puu_branchColorSettingsById") || "{}",
          ),
        );
      } catch {
        return {};
      }
    })();
    const savedInactiveCardDim = clampInactiveCardDim(
      safeLocalStorage.getItem("puu_inactiveCardDimV2"),
    );
    const savedThemeTuning = (() => {
      try {
        return {
          ...DEFAULT_THEME_TUNING,
          ...normalizeThemeTuning(
            JSON.parse(safeLocalStorage.getItem("puu_themeTuning") || "{}"),
          ),
        };
      } catch {
        return DEFAULT_THEME_TUNING;
      }
    })();
    const savedInactiveBranchesMode =
      safeLocalStorage.getItem("puu_inactiveBranchesMode") === "hide"
        ? "hide"
        : "dim";
    const savedFocusModeScopeStr =
      safeLocalStorage.getItem("puu_focusModeScope");
    const savedFocusModeScope =
      savedFocusModeScopeStr === "single" ||
      savedFocusModeScopeStr === "column" ||
      savedFocusModeScopeStr === "branchLevel"
        ? savedFocusModeScopeStr
        : "branchLevel";
    const savedEditorModeStr = safeLocalStorage.getItem("puu_editorMode");
    const savedEditorMode =
      savedEditorModeStr === "visual" ? "visual" : "markdown";
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
      savedTheme = "mono";
    }
    useAppStore.setState({
      cardsCollapsed: savedCollapsed,
      colWidth: savedWidth,
      branchColorIntensity: savedBranchColorIntensity,
      branchColorSpread: savedBranchColorSpread,
      branchColorTone: savedBranchColorTone,
      branchColorOpacity: savedBranchColorOpacity,
      branchColorGradient: savedBranchColorGradient,
      branchColorSolid: savedBranchColorSolid,
      branchColorSettingsById: savedBranchColorSettingsById,
      inactiveCardDim: savedInactiveCardDim,
      themeTuning: savedThemeTuning,
      inactiveBranchesMode: savedInactiveBranchesMode,
      focusModeScope: savedFocusModeScope,
      editorMode: savedEditorMode,
      editorEnterMode: savedEditorEnterMode,
      pasteSplitMode: savedPasteSplitMode,
      theme: savedTheme,
    });
    applyTheme(savedTheme, savedThemeTuning);
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
      if (state.branchColorIntensity !== prevState.branchColorIntensity) {
        safeLocalStorage.setItem(
          "puu_branchColorIntensity",
          state.branchColorIntensity.toString(),
        );
      }
      if (state.branchColorSpread !== prevState.branchColorSpread) {
        safeLocalStorage.setItem(
          "puu_branchColorSpread",
          state.branchColorSpread.toString(),
        );
      }
      if (state.branchColorTone !== prevState.branchColorTone) {
        safeLocalStorage.setItem(
          "puu_branchColorTone",
          state.branchColorTone.toString(),
        );
      }
      if (state.branchColorOpacity !== prevState.branchColorOpacity) {
        safeLocalStorage.setItem(
          "puu_branchColorOpacity",
          state.branchColorOpacity.toString(),
        );
      }
      if (state.branchColorGradient !== prevState.branchColorGradient) {
        safeLocalStorage.setItem(
          "puu_branchColorGradient",
          state.branchColorGradient.toString(),
        );
      }
      if (state.branchColorSolid !== prevState.branchColorSolid) {
        safeLocalStorage.setItem(
          "puu_branchColorSolid",
          String(state.branchColorSolid),
        );
      }
      if (state.branchColorSettingsById !== prevState.branchColorSettingsById) {
        safeLocalStorage.setItem(
          "puu_branchColorSettingsById",
          JSON.stringify(state.branchColorSettingsById),
        );
      }
      if (state.inactiveCardDim !== prevState.inactiveCardDim) {
        safeLocalStorage.setItem(
          "puu_inactiveCardDimV2",
          state.inactiveCardDim.toString(),
        );
      }
      if (state.themeTuning !== prevState.themeTuning) {
        safeLocalStorage.setItem(
          "puu_themeTuning",
          JSON.stringify(state.themeTuning),
        );
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
        safeLocalStorage.setItem("puu_theme", state.theme);
      }
      if (
        state.theme !== prevState.theme ||
        state.themeTuning !== prevState.themeTuning
      ) {
        applyTheme(state.theme, state.themeTuning);
      }
    });
    return unsubscribe;
  }, []);
}
