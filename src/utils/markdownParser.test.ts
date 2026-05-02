import { describe, expect, it } from "vitest";
import type { PuuNode } from "../types";
import {
  exportNodesToClipboardHtml,
  exportNodesToMarkdown,
  parseClipboardHtmlNodes,
  parseMarkdownToNodes,
} from "./markdownParser";

const branchNodes: PuuNode[] = [
  { id: "root", parentId: null, order: 0, content: "Root\nRoot note" },
  { id: "child", parentId: "root", order: 0, content: "Child" },
  { id: "grandchild", parentId: "child", order: 0, content: "Grandchild" },
];

describe("markdownParser clipboard round-trip", () => {
  it("keeps a copied branch nested through the html clipboard payload", () => {
    const parsed = parseClipboardHtmlNodes(
      exportNodesToClipboardHtml(branchNodes),
    );

    expect(parsed).toHaveLength(3);
    expect(parsed[0].content).toBe("Root\nRoot note");
    expect(parsed[1].content).toBe("Child");
    expect(parsed[1].parentId).toBe(parsed[0].id);
    expect(parsed[2].content).toBe("Grandchild");
    expect(parsed[2].parentId).toBe(parsed[1].id);
  });

  it("keeps a copied branch nested through the plain markdown fallback", () => {
    const parsed = parseMarkdownToNodes(exportNodesToMarkdown(branchNodes));

    expect(parsed).toHaveLength(3);
    expect(parsed[0].content).toBe("# Root\n\nRoot note");
    expect(parsed[1].content).toBe("## Child");
    expect(parsed[1].parentId).toBe(parsed[0].id);
    expect(parsed[2].content).toBe("### Grandchild");
    expect(parsed[2].parentId).toBe(parsed[1].id);
  });

  it("only treats the PuuNote marker as format metadata at the start", () => {
    const parsed = parseMarkdownToNodes(`# Normal note

This text mentions <!-- puunote-format: 1 --> inside the content.`);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].content).toContain("Normal note");
    expect(parsed[0].content).toContain("puunote-format");
  });

  it("does not mutate the cached tree index while exporting markdown", () => {
    const unorderedNodes: PuuNode[] = [
      { id: "root", parentId: null, order: 0, content: "Root" },
      { id: "second", parentId: "root", order: 1, content: "Second" },
      { id: "first", parentId: "root", order: 0, content: "First" },
    ];

    expect(exportNodesToMarkdown(unorderedNodes)).toContain(
      "## First\n\n## Second",
    );
    expect(unorderedNodes.map((node) => node.id)).toEqual([
      "root",
      "second",
      "first",
    ]);
  });

  it("assigns sibling orders without scanning all imported nodes", () => {
    const parsed = parseMarkdownToNodes(`# Root

- Child A
- Child B

# Second Root`);

    expect(
      parsed
        .filter((node) => node.parentId === parsed[0].id)
        .map((node) => node.order),
    ).toEqual([0, 1]);
    expect(
      parsed.filter((node) => node.parentId === null).map((node) => node.order),
    ).toEqual([0, 1]);
  });

  it("splits plain markdown files by standalone separators when no outline exists", () => {
    const parsed = parseMarkdownToNodes(`First block
with text

---

Second block

---

Third block`);

    expect(parsed).toHaveLength(3);
    expect(parsed.map((node) => node.parentId)).toEqual([null, null, null]);
    expect(parsed.map((node) => node.order)).toEqual([0, 1, 2]);
    expect(parsed.map((node) => node.content)).toEqual([
      "First block\nwith text",
      "Second block",
      "Third block",
    ]);
  });
});
