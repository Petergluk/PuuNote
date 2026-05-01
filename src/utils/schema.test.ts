import { describe, expect, it } from "vitest";
import { validateNodesWithReport } from "./schema";

describe("validateNodesWithReport", () => {
  it("keeps valid nodes and reports skipped invalid nodes", () => {
    const { nodes, report } = validateNodesWithReport([
      { id: "a", parentId: null, order: 0, content: "A" },
      { id: "", parentId: null, order: 1, content: "Invalid" },
      { id: "b", parentId: "a", order: 0, content: "B" },
    ]);

    expect(nodes.map((node) => node.id)).toEqual(["a", "b"]);
    expect(report.repaired).toBe(true);
    expect(report.errors).toHaveLength(1);
  });

  it("repairs missing parents by moving nodes to root", () => {
    const { nodes, report } = validateNodesWithReport([
      { id: "orphan", parentId: "missing", order: 0, content: "Orphan" },
    ]);

    expect(nodes[0].parentId).toBe(null);
    expect(report.repaired).toBe(true);
    expect(report.warnings[0]).toContain("Missing parent");
  });

  it("repairs cycles instead of dropping the whole document", () => {
    const { nodes, report } = validateNodesWithReport([
      { id: "a", parentId: "b", order: 0, content: "A" },
      { id: "b", parentId: "a", order: 0, content: "B" },
      { id: "c", parentId: null, order: 0, content: "C" },
    ]);

    expect(nodes).toHaveLength(3);
    expect(nodes.some((node) => node.id === "c")).toBe(true);
    expect(nodes.some((node) => node.parentId === null)).toBe(true);
    expect(report.repaired).toBe(true);
    expect(report.warnings.join("\n")).toContain("Cycle detected");
  });
});
