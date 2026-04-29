import { describe, it, expect } from "vitest";
import {
  buildTreeIndex,
  computeAncestorPathFromIndex,
  computeDescendantIds,
  getDepthFirstNodes,
} from "./tree";
import { PuuNode } from "../types";

describe("tree", () => {
  const mockNodes: PuuNode[] = [
    { id: "1", parentId: null, order: 0, content: "Root" },
    { id: "2", parentId: "1", order: 0, content: "Child 1" },
    { id: "3", parentId: "2", order: 0, content: "Grandchild" },
    { id: "4", parentId: "1", order: 1, content: "Child 2" },
    { id: "5", parentId: null, order: 1, content: "Another root" },
  ];

  it("should build tree index correctly", () => {
    const { nodeMap, childrenMap } = buildTreeIndex(mockNodes);
    expect(nodeMap.get("1")?.content).toBe("Root");
    expect(childrenMap.get("1")?.length).toBe(2);
    expect(childrenMap.get(null)?.length).toBe(2);
  });

  it("should compute ancestor-only path", () => {
    const ancestorPath = computeAncestorPathFromIndex(
      buildTreeIndex(mockNodes),
      "2",
    );
    expect(ancestorPath).toEqual(["1", "2"]);
  });

  it("should compute descendant ids", () => {
    const descendants = computeDescendantIds(mockNodes, "1");
    // "1" itself is not included, only descendants
    expect(descendants.has("2")).toBe(true);
    expect(descendants.has("3")).toBe(true);
    expect(descendants.has("4")).toBe(true);
    expect(descendants.has("5")).toBe(false);
  });

  it("should get depth first nodes", () => {
    const df = getDepthFirstNodes(mockNodes);
    expect(df.length).toBe(5);
    expect(df[0].id).toBe("1");
    expect(df[0].depth).toBe(0);
    expect(df[1].id).toBe("2");
    expect(df[1].depth).toBe(1);
    expect(df[2].id).toBe("3");
    expect(df[2].depth).toBe(2);
    expect(df[3].id).toBe("4");
    expect(df[3].depth).toBe(1);
    expect(df[4].id).toBe("5");
    expect(df[4].depth).toBe(0);
  });

  it("should prevent infinite loop in computeAncestorPathFromIndex", () => {
    const circularNodes: PuuNode[] = [
      { id: "1", parentId: "2", order: 0, content: "Child" },
      { id: "2", parentId: "1", order: 0, content: "Parent" },
    ];

    const path = computeAncestorPathFromIndex(
      buildTreeIndex(circularNodes),
      "1",
    );
    expect(path.length).toBe(2);
  });
});
