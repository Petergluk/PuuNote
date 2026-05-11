import { describe, expect, it } from "vitest";
import type { PuuNode } from "../types";
import { getMergeSelectionState } from "./mergeSelection";

describe("getMergeSelectionState", () => {
  it("allows merging more than two selected sibling cards", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "First" },
      { id: "2", parentId: null, order: 1, content: "Second" },
      { id: "3", parentId: null, order: 2, content: "Third" },
    ];

    const result = getMergeSelectionState(nodes, "2", ["1", "2", "3"]);

    expect(result.ok).toBe(true);
    expect(result.masterId).toBe("2");
    expect(result.nodeIdsToMerge).toEqual(["1", "2", "3"]);
    expect(result.orderedIds).toEqual(["1", "2", "3"]);
  });

  it("uses the first visually selected card when activeId is not selected", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "First" },
      { id: "2", parentId: null, order: 1, content: "Second" },
      { id: "3", parentId: null, order: 2, content: "Third" },
      { id: "active", parentId: null, order: 3, content: "Active" },
    ];

    const result = getMergeSelectionState(nodes, "active", ["3", "1", "2"]);

    expect(result.ok).toBe(true);
    expect(result.masterId).toBe("1");
    expect(result.nodeIdsToMerge).toEqual(["3", "1", "2"]);
    expect(result.orderedIds).toEqual(["1", "2", "3"]);
  });

  it("rejects selected cards from different parents", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: null, order: 1, content: "Sibling" },
      { id: "3", parentId: "1", order: 0, content: "Child" },
    ];

    const result = getMergeSelectionState(nodes, "1", ["1", "2", "3"]);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Only sibling cards can be merged.");
  });
});
