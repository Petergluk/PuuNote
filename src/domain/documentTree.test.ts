import { describe, it, expect } from "vitest";
import { canMergeNodes, documentApi } from "./documentTree";
import { PuuNode } from "../types";

describe("documentTree", () => {
  it("should split a node correctly", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Hello world" },
    ];

    const { nextNodes, newId } = documentApi.splitNode(
      nodes,
      "1",
      "Hello",
      " world",
    );

    expect(nextNodes.length).toBe(2);
    expect(nextNodes.find((n) => n.id === "1")?.content).toBe("Hello");
    expect(nextNodes.find((n) => n.id === newId)?.content).toBe(" world");
    expect(nextNodes.find((n) => n.id === newId)?.order).toBe(1);
    expect(nextNodes.find((n) => n.id === "1")?.order).toBe(0);
  });

  it("should delete a node and its descendants", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: "1", order: 0, content: "Child 1" },
      { id: "3", parentId: "2", order: 0, content: "Grandchild" },
      { id: "4", parentId: "1", order: 1, content: "Child 2" },
      { id: "5", parentId: null, order: 1, content: "Another root" },
    ];

    const { nextNodes } = documentApi.deleteNode(nodes, "2");

    expect(nextNodes.length).toBe(3);
    const ids = nextNodes.map((n) => n.id);
    expect(ids).toContain("1");
    expect(ids).toContain("4");
    expect(ids).toContain("5");
    expect(ids).not.toContain("2");
    expect(ids).not.toContain("3");
  });

  it("should not loop forever when deleting a cyclic subtree", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: "2", order: 0, content: "Loop A" },
      { id: "2", parentId: "1", order: 0, content: "Loop B" },
      { id: "3", parentId: null, order: 1, content: "Safe root" },
    ];

    const { nextNodes } = documentApi.deleteNode(nodes, "1");

    expect(nextNodes).toEqual([
      { id: "3", parentId: null, order: 1, content: "Safe root" },
    ]);
  });

  it("should delete selected nodes and promote their children for multi-cut", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: "1", order: 0, content: "Cut me" },
      { id: "3", parentId: "2", order: 0, content: "Promoted child" },
      { id: "4", parentId: "1", order: 1, content: "Sibling" },
    ];

    const { nextNodes } = documentApi.deleteNodesPromoteChildren(nodes, ["2"]);

    expect(nextNodes.map((node) => node.id)).not.toContain("2");
    expect(nextNodes.find((node) => node.id === "3")?.parentId).toBe("1");
    expect(
      nextNodes
        .filter((node) => node.parentId === "1")
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((node) => node.id),
    ).toEqual(["3", "4"]);
  });

  it("should promote grandchildren to the nearest kept ancestor when cutting nested selections", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: "1", order: 0, content: "Cut parent" },
      { id: "3", parentId: "2", order: 0, content: "Cut child" },
      { id: "4", parentId: "3", order: 0, content: "Kept grandchild" },
    ];

    const { nextNodes } = documentApi.deleteNodesPromoteChildren(nodes, [
      "2",
      "3",
    ]);

    expect(nextNodes.map((node) => node.id)).toEqual(["1", "4"]);
    expect(nextNodes.find((node) => node.id === "4")?.parentId).toBe("1");
  });

  it("should reparent a node correctly correctly", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: null, order: 1, content: "Another root" },
    ];

    const updated = documentApi.moveNode(nodes, "2", "1", "child");

    expect(updated.length).toBe(2);
    const node2 = updated.find((n) => n.id === "2");
    expect(node2?.parentId).toBe("1");
    expect(node2?.order).toBe(0);
  });

  it("should move sibling nodes as an ordered group", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "A" },
      { id: "2", parentId: null, order: 1, content: "B" },
      { id: "3", parentId: null, order: 2, content: "C" },
      { id: "4", parentId: null, order: 3, content: "D" },
      { id: "5", parentId: null, order: 4, content: "E" },
    ];

    const updated = documentApi.moveNodes(nodes, ["2", "3"], "5", "after");
    const orderedRootIds = updated
      .filter((node) => node.parentId === null)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((node) => node.id);

    expect(orderedRootIds).toEqual(["1", "4", "5", "2", "3"]);
  });

  it("should move sibling nodes as children while preserving group order", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "A" },
      { id: "2", parentId: null, order: 1, content: "B" },
      { id: "3", parentId: null, order: 2, content: "C" },
      { id: "4", parentId: null, order: 3, content: "D" },
    ];

    const updated = documentApi.moveNodes(nodes, ["2", "3"], "1", "child");
    const childIds = updated
      .filter((node) => node.parentId === "1")
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((node) => node.id);

    expect(childIds).toEqual(["2", "3"]);
  });

  it("should reject group moves across different parent levels", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "A" },
      { id: "2", parentId: null, order: 1, content: "B" },
      { id: "3", parentId: "1", order: 0, content: "A child" },
    ];

    const updated = documentApi.moveNodes(nodes, ["1", "3"], "2", "after");
    expect(updated).toBe(nodes);
  });

  it("should reject group moves into a descendant", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "A" },
      { id: "2", parentId: null, order: 1, content: "B" },
      { id: "3", parentId: "1", order: 0, content: "A child" },
    ];

    const updated = documentApi.moveNodes(nodes, ["1", "2"], "3", "child");
    expect(updated).toBe(nodes);
  });

  it("should merge nodes correctly", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Master node" },
      { id: "2", parentId: null, order: 1, content: "Second node" },
      { id: "3", parentId: "2", order: 0, content: "Child of second" },
      { id: "4", parentId: "1", order: 0, content: "Child of master" },
    ];

    const updated = documentApi.mergeNodes(nodes, "1", ["1", "2"]);

    expect(updated.length).toBe(3); // 2 is removed
    const master = updated.find((n) => n.id === "1");
    expect(master?.content).toBe("Master node\n\nSecond node");

    const childOfSecond = updated.find((n) => n.id === "3");
    expect(childOfSecond?.parentId).toBe("1"); // reparented
    expect(childOfSecond?.order).toBe(1); // after "Child of master"
  });

  it("should validate merge only for sibling cards", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 0, content: "Root" },
      { id: "2", parentId: null, order: 1, content: "Sibling" },
      { id: "3", parentId: "1", order: 0, content: "Child" },
    ];

    expect(canMergeNodes(nodes, "1", ["1", "2"]).ok).toBe(true);
    expect(canMergeNodes(nodes, "1", ["1", "3"]).ok).toBe(false);
  });

  it("should merge content in depth-first visual order", () => {
    const nodes: PuuNode[] = [
      { id: "1", parentId: null, order: 1, content: "Second" },
      { id: "2", parentId: null, order: 0, content: "First" },
    ];

    const updated = documentApi.mergeNodes(nodes, "1", ["1", "2"]);
    expect(updated.find((n) => n.id === "1")?.content).toBe("First\n\nSecond");
  });
});
