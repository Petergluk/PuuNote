import { describe, expect, it } from "vitest";
import { buildTreeIndex } from "../utils/tree";
import type { PuuNode } from "../types";
import { buildBoardColumns } from "./useBoardLayout";

const nodes: PuuNode[] = [
  { id: "a", parentId: null, order: 0, content: "A" },
  { id: "b", parentId: null, order: 1, content: "B" },
  { id: "a1", parentId: "a", order: 0, content: "A1" },
  { id: "a2", parentId: "a", order: 1, content: "A2" },
  { id: "b1", parentId: "b", order: 0, content: "B1" },
  { id: "a1a", parentId: "a1", order: 0, content: "A1A" },
];

describe("buildBoardColumns", () => {
  it("builds full depth columns by default", () => {
    const columns = buildBoardColumns(buildTreeIndex(nodes));
    expect(columns.map((column) => column.map((node) => node.id))).toEqual([
      ["a", "b"],
      ["a1", "a2", "b1"],
      ["a1a"],
    ]);
  });

  it("builds active-corridor columns for large documents", () => {
    const columns = buildBoardColumns(
      buildTreeIndex(nodes),
      ["a", "a1"],
      "a1",
      true,
    );
    expect(columns.map((column) => column.map((node) => node.id))).toEqual([
      ["a", "b"],
      ["a1", "a2"],
      ["a1a"],
    ]);
  });

  it("expands the whole active subtree in active-corridor mode", () => {
    const columns = buildBoardColumns(buildTreeIndex(nodes), ["a"], "a", true);
    expect(columns.map((column) => column.map((node) => node.id))).toEqual([
      ["a", "b"],
      ["a1", "a2"],
      ["a1a"],
    ]);
  });

  it("shows the full tree in active-corridor mode when focus is cleared", () => {
    const columns = buildBoardColumns(buildTreeIndex(nodes), [], null, true);
    expect(columns.map((column) => column.map((node) => node.id))).toEqual([
      ["a", "b"],
      ["a1", "a2", "b1"],
      ["a1a"],
    ]);
  });

  it("can limit unfocused active-corridor mode to root cards", () => {
    const columns = buildBoardColumns(buildTreeIndex(nodes), [], null, true);
    expect(columns.map((column) => column.map((node) => node.id))).toEqual([
      ["a", "b"],
    ]);
  });
});
