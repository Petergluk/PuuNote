import type { PuuNode } from "../types";
import { getDepthFirstNodes } from "./tree";

export const MIN_COLUMN_WIDTH = 220;
export const MAX_COLUMN_WIDTH = 1200;
export const DESKTOP_COLUMN_GUTTER = 32;
const DEFAULT_CONTAINER_WIDTH = 1280;

export const clampColumnWidth = (width: number) =>
  Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, Math.floor(width)));

export const getColumnStep = (
  colWidth: number,
  gutter = DESKTOP_COLUMN_GUTTER,
) => colWidth + gutter;

export const fitColumnWidthForCount = (
  containerWidth: number,
  columnCount: number,
  gutter = DESKTOP_COLUMN_GUTTER,
) => {
  const safeCount = Math.max(1, Math.floor(columnCount));
  return clampColumnWidth(containerWidth / safeCount - gutter);
};

export const countDocumentColumns = (nodes: PuuNode[]) => {
  const ordered = getDepthFirstNodes(nodes);
  if (ordered.length === 0) return 1;
  return Math.max(...ordered.map((node) => node.depth)) + 1;
};

export const getAvailableColumnWidth = () => {
  if (typeof document === "undefined") return DEFAULT_CONTAINER_WIDTH;
  const scroller = document.getElementById("main-scroller");
  if (scroller?.clientWidth) return scroller.clientWidth;
  if (typeof window !== "undefined" && window.innerWidth) {
    return window.innerWidth;
  }
  return DEFAULT_CONTAINER_WIDTH;
};

export const fitColumnWidthToDocumentDepth = (
  nodes: PuuNode[],
  containerWidth = getAvailableColumnWidth(),
) => fitColumnWidthForCount(containerWidth, countDocumentColumns(nodes));

export const fitOneMoreColumn = (
  containerWidth: number,
  currentColWidth: number,
) => {
  const currentColumns = containerWidth / getColumnStep(currentColWidth);
  return fitColumnWidthForCount(containerWidth, Math.floor(currentColumns) + 1);
};

export const fitOneFewerColumn = (
  containerWidth: number,
  currentColWidth: number,
) => {
  const currentColumns = containerWidth / getColumnStep(currentColWidth);
  return fitColumnWidthForCount(
    containerWidth,
    Math.max(1, Math.ceil(currentColumns) - 1),
  );
};
