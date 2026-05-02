export type ThemeTune = {
  bg: number;
  card: number;
  activeCard: number;
  text: number;
};

export const DEFAULT_THEME_TUNE: ThemeTune = {
  bg: 0,
  card: 0,
  activeCard: 0,
  text: 0,
};

export const THEME_IDS = [
  "mono",
  "light",
  "light-cool",
  "dark",
  "blue",
  "brown",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_LABELS: Record<ThemeId, string> = {
  mono: "B/W",
  light: "Warm white",
  "light-cool": "Cool white",
  dark: "Black",
  blue: "Cold black",
  brown: "Warm black",
};

type ThemeColors = {
  bg: string;
  panel: string;
  card: string;
  cardHover: string;
  cardActive: string;
  border: string;
  borderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
};

export const BASE_THEME_COLORS: Record<ThemeId, ThemeColors> = {
  mono: {
    bg: "#ffffff",
    panel: "#ffffff",
    card: "#ffffff",
    cardHover: "#f2f2f2",
    cardActive: "#ffffff",
    border: "#111111",
    borderHover: "#000000",
    textPrimary: "#000000",
    textSecondary: "#333333",
    textMuted: "#666666",
    accent: "#000000",
  },
  light: {
    bg: "#fbfaf6",
    panel: "#fffdf8",
    card: "#fffdf8",
    cardHover: "#f4efe4",
    cardActive: "#fbf7ee",
    border: "#e5dccb",
    borderHover: "#d4c7b1",
    textPrimary: "#1f1b16",
    textSecondary: "#5e5548",
    textMuted: "#82786a",
    accent: "#a3966a",
  },
  "light-cool": {
    bg: "#f7f9fb",
    panel: "#ffffff",
    card: "#ffffff",
    cardHover: "#eef3f7",
    cardActive: "#f5f8fb",
    border: "#dce5ec",
    borderHover: "#c8d4dd",
    textPrimary: "#14202a",
    textSecondary: "#51616f",
    textMuted: "#72808d",
    accent: "#5f8fa8",
  },
  dark: {
    bg: "#0a0a0a",
    panel: "#0f0f0f",
    card: "#111111",
    cardHover: "#1e1e1e",
    cardActive: "#1a1a1a",
    border: "#222222",
    borderHover: "#333333",
    textPrimary: "#e4e4e7",
    textSecondary: "#a1a1aa",
    textMuted: "#71717a",
    accent: "#a3966a",
  },
  blue: {
    bg: "#0b1120",
    panel: "#0f172a",
    card: "#1e293b",
    cardHover: "#334155",
    cardActive: "#1e293b",
    border: "#334155",
    borderHover: "#475569",
    textPrimary: "#f8fafc",
    textSecondary: "#94a3b8",
    textMuted: "#64748b",
    accent: "#38bdf8",
  },
  brown: {
    bg: "#1c1917",
    panel: "#292524",
    card: "#44403c",
    cardHover: "#57534e",
    cardActive: "#44403c",
    border: "#57534e",
    borderHover: "#78716c",
    textPrimary: "#fafaf9",
    textSecondary: "#a8a29e",
    textMuted: "#78716c",
    accent: "#fbbf24",
  },
};

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const toHex = (value: number) =>
  Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");

export const adjustHexBrightness = (hex: string, adjustment: number) => {
  const clamped = Math.max(-50, Math.min(50, Math.round(adjustment)));
  if (clamped === 0) return hex;

  const target = clamped > 0 ? 255 : 0;
  const amount = Math.abs(clamped) / 100;
  const rgb = hexToRgb(hex);

  return `#${toHex(rgb.r + (target - rgb.r) * amount)}${toHex(
    rgb.g + (target - rgb.g) * amount,
  )}${toHex(rgb.b + (target - rgb.b) * amount)}`;
};

export const getThemeId = (theme: string): ThemeId =>
  THEME_IDS.includes(theme as ThemeId) ? (theme as ThemeId) : "light";

export const normalizeThemeTuning = (
  value: unknown,
): Partial<Record<ThemeId, ThemeTune>> => {
  if (!value || typeof value !== "object") return {};
  const result: Partial<Record<ThemeId, ThemeTune>> = {};
  for (const themeId of THEME_IDS) {
    const tune = (value as Record<string, unknown>)[themeId];
    if (!tune || typeof tune !== "object") continue;
    result[themeId] = {
      bg: clampTune((tune as Record<string, unknown>).bg),
      card: clampTune((tune as Record<string, unknown>).card),
      activeCard: clampTune((tune as Record<string, unknown>).activeCard),
      text: clampTune((tune as Record<string, unknown>).text),
    };
  }
  return result;
};

export const clampTune = (value: unknown) =>
  Math.max(-50, Math.min(50, Math.round(Number(value) || 0)));

export const getThemeTune = (
  themeTuning: Partial<Record<ThemeId, ThemeTune>>,
  theme: string,
) => themeTuning[getThemeId(theme)] ?? DEFAULT_THEME_TUNE;

export const buildThemeCssVars = (
  theme: string,
  themeTuning: Partial<Record<ThemeId, ThemeTune>>,
) => {
  const themeId = getThemeId(theme);
  const colors = BASE_THEME_COLORS[themeId];
  const tune = getThemeTune(themeTuning, themeId);

  return {
    "--app-bg": adjustHexBrightness(colors.bg, tune.bg),
    "--app-panel": adjustHexBrightness(colors.panel, tune.bg),
    "--app-card": adjustHexBrightness(colors.card, tune.card),
    "--app-card-hover": adjustHexBrightness(colors.cardHover, tune.card),
    "--app-card-active": adjustHexBrightness(
      colors.cardActive,
      tune.activeCard,
    ),
    "--app-border": colors.border,
    "--app-border-hover": colors.borderHover,
    "--app-text-primary": adjustHexBrightness(colors.textPrimary, tune.text),
    "--app-text-secondary": adjustHexBrightness(
      colors.textSecondary,
      tune.text,
    ),
    "--app-text-muted": adjustHexBrightness(colors.textMuted, tune.text),
    "--app-accent": colors.accent,
  };
};
