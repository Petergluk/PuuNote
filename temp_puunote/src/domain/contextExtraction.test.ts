import { describe, expect, it } from "vitest";
import { buildContextForLLM } from "./contextExtraction";
import type { PuuNode } from "../types";

const nodes: PuuNode[] = [
  { id: "root", parentId: null, order: 0, content: "# Project" },
  { id: "child", parentId: "root", order: 0, content: "Plan private launch" },
  {
    id: "grandchild",
    parentId: "child",
    order: 0,
    content: "Coordinate rollout details",
  },
];

describe("contextExtraction", () => {
  it("builds context with explicit privacy controls", () => {
    const context = buildContextForLLM(nodes, "child", {
      includeNodeIds: false,
      includeAncestors: true,
      includeDescendants: false,
    });

    expect(context?.textContext).toContain("# Project");
    expect(context?.textContext).toContain("Plan private launch");
    expect(context?.textContext).not.toContain("[child]");
    expect(context?.descendants).toEqual([]);
  });

  it("truncates context at the configured character budget", () => {
    const context = buildContextForLLM(nodes, "root", {
      maxChars: 80,
      includeDescendants: true,
    });

    expect(context?.truncated).toBe(true);
    expect(context?.textContext.length).toBeLessThanOrEqual(80);
    expect(context?.warnings[0]).toContain("Context truncated");
  });
});
