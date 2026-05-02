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
}

type ThemePalette = Record<BranchColorId, BranchColor>;

const labels: Record<BranchColorId, string> = {
  rose: "#FF0101",
  coral: "#FF9D00",
  amber: "#FFF600",
  olive: "#00FF43",
  mint: "#00FFC6",
  cyan: "#00D7FF",
  blue: "#006CC2",
  violet: "#3000E1",
  plum: "#E700F5",
};

const makePalette = (values: Record<BranchColorId, string>): ThemePalette => {
  return BRANCH_COLOR_IDS.reduce((palette, id) => {
    palette[id] = { id, label: labels[id], rgb: values[id] };
    return palette;
  }, {} as ThemePalette);
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
  light: makePalette({
    rose: "255 1 1",
    coral: "255 157 0",
    amber: "255 246 0",
    olive: "0 255 67",
    mint: "0 255 198",
    cyan: "0 215 255",
    blue: "0 108 194",
    violet: "48 0 225",
    plum: "231 0 245",
  }),
  dark: makePalette({
    rose: "255 1 1",
    coral: "255 157 0",
    amber: "255 246 0",
    olive: "0 255 67",
    mint: "0 255 198",
    cyan: "0 215 255",
    blue: "0 108 194",
    violet: "48 0 225",
    plum: "231 0 245",
  }),
  blue: makePalette({
    rose: "255 1 1",
    coral: "255 157 0",
    amber: "255 246 0",
    olive: "0 255 67",
    mint: "0 255 198",
    cyan: "0 215 255",
    blue: "0 108 194",
    violet: "48 0 225",
    plum: "231 0 245",
  }),
  brown: makePalette({
    rose: "255 1 1",
    coral: "255 157 0",
    amber: "255 246 0",
    olive: "0 255 67",
    mint: "0 255 198",
    cyan: "0 215 255",
    blue: "0 108 194",
    violet: "48 0 225",
    plum: "231 0 245",
  }),
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
) => {
  if (!colorId) return null;
  const palette = getBranchPalette(theme);
  const color = palette[colorId as BranchColorId];
  if (!color) return null;
  return {
    ...color,
    rgb: adjustBranchColorRgb(color.rgb, tone),
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
  return typeof colorId === "string" ? colorId : null;
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
