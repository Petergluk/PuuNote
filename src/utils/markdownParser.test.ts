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
});
