export type ThemeTune = {
  bg: number;
  card: number;
  activeCard: number;
  text: number;
  warmth: number;
};

export const DEFAULT_THEME_TUNE: ThemeTune = {
  bg: 0,
  card: 0,
  activeCard: 0,
  text: 0,
  warmth: 0,
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

export const DEFAULT_THEME_TUNING: Partial<Record<ThemeId, ThemeTune>> = {
  light: {
    bg: 0,
    card: -6,
    activeCard: 27,
    text: 0,
    warmth: 0,
  },
  mono: {
    bg: -9,
    card: -4,
    activeCard: 0,
    text: 0,
    warmth: 0,
  },
};

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

type Rgb = {
  r: number;
  g: number;
  b: number;
};

const mixRgb = (from: Rgb, to: Rgb, amount: number): Rgb => ({
  r: from.r + (to.r - from.r) * amount,
  g: from.g + (to.g - from.g) * amount,
  b: from.b + (to.b - from.b) * amount,
});

const luminance = (color: Rgb) =>
  color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;

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

export const adjustHexTemperature = (hex: string, warmth: number) => {
  const clamped = Math.max(-50, Math.min(50, Math.round(warmth)));
  if (clamped === 0) return hex;

  const rgb = hexToRgb(hex);
  const amount = Math.pow(Math.abs(clamped) / 50, 1.08);
  const lightness = Math.max(0, Math.min(1, luminance(rgb) / 255));
  const warmSepia = mixRgb(
    { r: 96, g: 48, b: 18 },
    { r: 238, g: 202, b: 160 },
    lightness,
  );
  const coolBlue = mixRgb(
    { r: 14, g: 42, b: 78 },
    { r: 196, g: 232, b: 255 },
    lightness,
  );
  const target = clamped > 0 ? warmSepia : coolBlue;
  const shifted = mixRgb(rgb, target, amount * (clamped > 0 ? 0.82 : 0.86));

  return `#${toHex(shifted.r)}${toHex(shifted.g)}${toHex(shifted.b)}`;
};

const tuneColor = (hex: string, brightness: number, warmth: number) =>
  adjustHexBrightness(adjustHexTemperature(hex, warmth), brightness);

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
      warmth: clampTune((tune as Record<string, unknown>).warmth),
    };
  }
  return result;
};

export const clampTune = (value: unknown) =>
  Math.max(-50, Math.min(50, Math.round(Number(value) || 0)));

export const getThemeTune = (
  themeTuning: Partial<Record<ThemeId, ThemeTune>>,
  theme: string,
) => {
  const themeId = getThemeId(theme);
  return {
    ...DEFAULT_THEME_TUNE,
    ...DEFAULT_THEME_TUNING[themeId],
    ...themeTuning[themeId],
  };
};

export const buildThemeCssVars = (
  theme: string,
  themeTuning: Partial<Record<ThemeId, ThemeTune>>,
) => {
  const themeId = getThemeId(theme);
  const colors = BASE_THEME_COLORS[themeId];
  const tune = getThemeTune(themeTuning, themeId);

  return {
    "--app-bg": tuneColor(colors.bg, tune.bg, tune.warmth),
    "--app-panel": tuneColor(colors.panel, tune.bg, tune.warmth),
    "--app-card": tuneColor(colors.card, tune.card, tune.warmth),
    "--app-card-hover": tuneColor(colors.cardHover, tune.card, tune.warmth),
    "--app-card-active": tuneColor(
      colors.cardActive,
      tune.activeCard,
      tune.warmth,
    ),
    "--app-border": colors.border,
    "--app-border-hover": colors.borderHover,
    "--app-text-primary": tuneColor(colors.textPrimary, tune.text, tune.warmth),
    "--app-text-secondary": tuneColor(
      colors.textSecondary,
      tune.text,
      tune.warmth,
    ),
    "--app-text-muted": tuneColor(colors.textMuted, tune.text, tune.warmth),
    "--app-accent": colors.accent,
  };
};
