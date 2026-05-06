import type { PuuNode } from "../types";
import type { TreeIndex } from "./tree";

export const BRANCH_COLOR_IDS = [
  "rose",
  "coral",
  "amber",
  "olive",
  "mint",
  "cyan",
  "blue",
  "violet",
  "plum",
] as const;

export type BranchColorId = (typeof BRANCH_COLOR_IDS)[number];

export interface BranchColor {
  id: BranchColorId;
  label: string;
  rgb: string;
  settings: BranchColorSettings;
}

type ThemePalette = Record<BranchColorId, BranchColor>;

export type BranchColorSettings = {
  intensity: number;
  fill: number;
  opacity: number;
  gradient: number;
  solid: boolean;
  tone: number;
};

export type BranchColorSettingsById = Partial<
  Record<BranchColorId, BranchColorSettings>
>;

export const DEFAULT_BRANCH_COLOR_SETTINGS: BranchColorSettings = {
  intensity: 140,
  fill: 100,
  opacity: 100,
  gradient: 70,
  solid: false,
  tone: 0,
};

const labels: Record<BranchColorId, string> = {
  rose: "#FF806F",
  coral: "#FFAD38",
  amber: "#FFFE6E",
  olive: "#17CD00",
  mint: "#00DBA8",
  cyan: "#00C2D4",
  blue: "#529AFF",
  violet: "#BD7DFF",
  plum: "#FF75D0",
};

const basePaletteValues: Record<BranchColorId, string> = {
  rose: "255 128 111",
  coral: "255 173 56",
  amber: "255 254 110",
  olive: "23 205 0",
  mint: "0 219 168",
  cyan: "0 194 212",
  blue: "82 154 255",
  violet: "189 125 255",
  plum: "255 117 208",
};

const makePalette = (values: Record<BranchColorId, string>): ThemePalette => {
  return BRANCH_COLOR_IDS.reduce((palette, id) => {
    palette[id] = {
      id,
      label: labels[id],
      rgb: values[id],
      settings: DEFAULT_BRANCH_COLOR_SETTINGS,
    };
    return palette;
  }, {} as ThemePalette);
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) => {
  const parsed = Number(value);
  const safeValue = Number.isFinite(parsed) ? parsed : fallback;
  return Math.max(min, Math.min(max, Math.round(safeValue)));
};

export const normalizeBranchColorSettings = (
  value: unknown,
  fallback: BranchColorSettings = DEFAULT_BRANCH_COLOR_SETTINGS,
): BranchColorSettings => {
  const source =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    intensity: clampNumber(source.intensity, 0, 300, fallback.intensity),
    fill: clampNumber(source.fill, 0, 100, fallback.fill),
    opacity: clampNumber(source.opacity, 0, 100, fallback.opacity),
    gradient: clampNumber(source.gradient, 0, 100, fallback.gradient),
    solid: typeof source.solid === "boolean" ? source.solid : fallback.solid,
    tone: clampNumber(source.tone, -100, 100, fallback.tone),
  };
};

export const normalizeBranchColorSettingsById = (
  value: unknown,
): BranchColorSettingsById => {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  return BRANCH_COLOR_IDS.reduce((result, colorId) => {
    if (source[colorId]) {
      result[colorId] = normalizeBranchColorSettings(source[colorId]);
    }
    return result;
  }, {} as BranchColorSettingsById);
};

export const getBranchColorSettings = (
  globalSettings: BranchColorSettings,
  settingsById: BranchColorSettingsById,
  colorId?: string | null,
) => {
  const base = normalizeBranchColorSettings(globalSettings);
  if (!colorId || !BRANCH_COLOR_IDS.includes(colorId as BranchColorId)) {
    return base;
  }
  return normalizeBranchColorSettings(
    settingsById[colorId as BranchColorId],
    base,
  );
};

export const adjustBranchColorRgb = (rgb: string, tone: number) => {
  const clampedTone = Math.max(-100, Math.min(100, Math.round(tone)));
  if (clampedTone === 0) return rgb;

  const target = clampedTone < 0 ? 255 : 0;
  const amount = Math.abs(clampedTone) / 100;
  return rgb
    .split(/\s+/)
    .map((channel) => {
      const value = Number(channel);
      return Math.round(value + (target - value) * amount);
    })
    .join(" ");
};

const palettes: Record<string, ThemePalette> = {
  light: makePalette(basePaletteValues),
  dark: makePalette(basePaletteValues),
  blue: makePalette(basePaletteValues),
  brown: makePalette(basePaletteValues),
};

export const normalizeThemeForBranchPalette = (theme: string) => {
  if (theme.includes("blue")) return "blue";
  if (theme.includes("brown")) return "brown";
  if (theme.startsWith("dark")) return "dark";
  return "light";
};

export const getBranchPalette = (theme: string) =>
  palettes[normalizeThemeForBranchPalette(theme)];

export const getBranchColor = (
  theme: string,
  colorId?: string | null,
  tone = 0,
  settings: BranchColorSettings = DEFAULT_BRANCH_COLOR_SETTINGS,
) => {
  if (!colorId) return null;
  const palette = getBranchPalette(theme);
  const color = palette[colorId as BranchColorId];
  if (!color) return null;
  const resolvedSettings = normalizeBranchColorSettings({
    ...settings,
    tone,
  });
  return {
    ...color,
    rgb: adjustBranchColorRgb(color.rgb, resolvedSettings.tone),
    settings: resolvedSettings,
  };
};

export const getBranchRootId = (
  treeIndex: TreeIndex,
  nodeId: string | null,
) => {
  if (!nodeId) return null;

  let current = treeIndex.nodeMap.get(nodeId);
  if (!current) return null;

  const visited = new Set<string>();
  while (current.parentId && !visited.has(current.id)) {
    visited.add(current.id);
    const parent = treeIndex.nodeMap.get(current.parentId);
    if (!parent) break;
    current = parent;
  }

  return current.id;
};

export const getBranchColorId = (
  treeIndex: TreeIndex,
  nodeId: string | null,
) => {
  const rootId = getBranchRootId(treeIndex, nodeId);
  if (!rootId) return null;
  const colorId = treeIndex.nodeMap.get(rootId)?.metadata?.branchColor;
  if (!BRANCH_COLOR_IDS.includes(colorId as BranchColorId)) return null;
  return colorId as BranchColorId;
};

export const buildBranchColorIdMap = (
  nodes: PuuNode[],
  treeIndex: TreeIndex,
) => {
  const colorByRoot = new Map<string, string | null>();
  const colorByNode = new Map<string, string | null>();

  for (const node of nodes) {
    const rootId = getBranchRootId(treeIndex, node.id);
    if (!rootId) {
      colorByNode.set(node.id, null);
      continue;
    }

    if (!colorByRoot.has(rootId)) {
      const rootColor = treeIndex.nodeMap.get(rootId)?.metadata?.branchColor;
      colorByRoot.set(rootId, typeof rootColor === "string" ? rootColor : null);
    }
    colorByNode.set(node.id, colorByRoot.get(rootId) ?? null);
  }

  return colorByNode;
};
