import { describe, expect, it } from "vitest";
import type { PuuNode } from "../types";
import {
  countDocumentColumns,
  DESKTOP_COLUMN_GUTTER,
  fitColumnWidthForCount,
  fitOneFewerColumn,
  fitOneMoreColumn,
  getColumnStep,
} from "./columnSizing";

describe("columnSizing", () => {
  it("fits exact column counts including the desktop gutter", () => {
    const width = fitColumnWidthForCount(1440, 4);

    expect(width).toBe(328);
    expect(getColumnStep(width) * 4).toBe(1440);
    expect(DESKTOP_COLUMN_GUTTER).toBe(32);
  });

  it("moves to exact neighboring column counts from a partial tail", () => {
    const currentWidth = fitColumnWidthForCount(1440, 4);
    const withTail = currentWidth - 20;

    expect(getColumnStep(fitOneMoreColumn(1440, withTail)) * 5).toBe(1440);
    expect(getColumnStep(fitOneFewerColumn(1440, withTail)) * 4).toBe(1440);
  });

  it("counts document columns by deepest branch", () => {
    const nodes: PuuNode[] = [
      { id: "root", parentId: null, order: 0, content: "Root" },
      { id: "child", parentId: "root", order: 0, content: "Child" },
      { id: "leaf", parentId: "child", order: 0, content: "Leaf" },
      { id: "sibling", parentId: null, order: 1, content: "Sibling" },
    ];

    expect(countDocumentColumns(nodes)).toBe(3);
  });
});
