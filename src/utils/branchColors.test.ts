import { describe, expect, it } from "vitest";
import type { PuuNode } from "../types";
import { buildTreeIndex } from "./tree";
import {
  buildBranchColorIdMap,
  getBranchColor,
  getBranchColorId,
  getBranchRootId,
} from "./branchColors";

const nodes: PuuNode[] = [
  {
    id: "root-a",
    parentId: null,
    order: 0,
    content: "A",
    metadata: { branchColor: "rose" },
  },
  { id: "child-a", parentId: "root-a", order: 0, content: "A1" },
  { id: "leaf-a", parentId: "child-a", order: 0, content: "A1A" },
  { id: "root-b", parentId: null, order: 1, content: "B" },
];

describe("branchColors", () => {
  it("resolves the root and inherited color for any node in a branch", () => {
    const treeIndex = buildTreeIndex(nodes);

    expect(getBranchRootId(treeIndex, "leaf-a")).toBe("root-a");
    expect(getBranchColorId(treeIndex, "leaf-a")).toBe("rose");
    expect(getBranchColorId(treeIndex, "root-b")).toBe(null);
  });

  it("builds an inherited branch color map", () => {
    const colorMap = buildBranchColorIdMap(nodes, buildTreeIndex(nodes));

    expect(colorMap.get("root-a")).toBe("rose");
    expect(colorMap.get("child-a")).toBe("rose");
    expect(colorMap.get("leaf-a")).toBe("rose");
    expect(colorMap.get("root-b")).toBe(null);
  });

  it("uses the Adobe rainbow palette for branch colors", () => {
    expect(getBranchColor("light", "rose")?.rgb).toBe("255 1 1");
    expect(getBranchColor("dark", "coral")?.rgb).toBe("255 157 0");
    expect(getBranchColor("blue", "plum")?.rgb).toBe("231 0 245");
    expect(getBranchColor("unknown", "not-a-color")).toBe(null);
  });
});
