import { describe, expect, it } from "vitest";
import {
  buildMarkdownExport,
  buildJsonExport,
  buildStructuredMarkdownExport,
  createDocumentFilename,
  parseImportFile,
  parseJsonExport,
} from "./documentExport";
import type { PuuDocument, PuuNode } from "../types";

const document: PuuDocument = {
  id: "doc-1",
  title: "Roadmap / Draft",
  updatedAt: 1_800_000_000_000,
  metadata: { plugin: { source: "test" } },
};

const nodes: PuuNode[] = [
  {
    id: "node-1",
    parentId: null,
    order: 0,
    content: "# Roadmap",
    metadata: { plugin: { color: "green" } },
  },
];

describe("documentExport", () => {
  it("exports and imports lossless JSON payloads", () => {
    const json = buildJsonExport(document, nodes);
    const parsed = parseJsonExport(json);

    expect(parsed.title).toBe(document.title);
    expect(parsed.metadata).toEqual(document.metadata);
    expect(parsed.nodes).toEqual(nodes);
  });

  it("creates filesystem-safe filenames", () => {
    expect(createDocumentFilename(document, nodes)).toBe("Roadmap-Draft");
  });

  it("exports clean markdown without PuuNote node markers", () => {
    const exported = buildMarkdownExport([
      {
        id: "root",
        parentId: null,
        order: 0,
        content: "# Root\n\nIntro",
      },
      {
        id: "child",
        parentId: "root",
        order: 0,
        content: "## Child\n\nDetails",
      },
    ]);

    expect(exported).toBe("# Root\n\nIntro\n\n## Child\n\nDetails\n");
    expect(exported).not.toContain("puunote-node");
  });

  it("imports clean markdown export back as a tree", () => {
    const exported = buildMarkdownExport([
      {
        id: "root",
        parentId: null,
        order: 0,
        content: "# Root\n\nIntro",
      },
      {
        id: "child",
        parentId: "root",
        order: 0,
        content: "## Child\n\nDetails",
      },
    ]);
    const imported = parseImportFile("clean.md", exported);

    expect(imported.nodes).toHaveLength(2);
    expect(imported.nodes[0].content).toBe("# Root\n\nIntro");
    expect(imported.nodes[1].content).toBe("## Child\n\nDetails");
    expect(imported.nodes[1].parentId).toBe(imported.nodes[0].id);
  });

  it("exports structured markdown compatible with mind map indentation", () => {
    const exported = buildStructuredMarkdownExport([
      {
        id: "root",
        parentId: null,
        order: 0,
        content: "# Root\n\nRoot note",
      },
      {
        id: "child",
        parentId: "root",
        order: 0,
        content: "Child\n\nChild note",
      },
      {
        id: "grandchild",
        parentId: "child",
        order: 0,
        content: "Grandchild",
      },
    ]);

    expect(exported).toBe(
      "# Root\n\n  > Root note\n\n- Child\n\n  > Child note\n\n\t- Grandchild\n",
    );
    expect(exported).not.toContain("puunote-node");
  });

  it("imports structured markdown export back as a tree", () => {
    const exported = buildStructuredMarkdownExport([
      {
        id: "root",
        parentId: null,
        order: 0,
        content: "# Root\n\nRoot note",
      },
      {
        id: "child",
        parentId: "root",
        order: 0,
        content: "Child\n\nChild note",
      },
      {
        id: "grandchild",
        parentId: "child",
        order: 0,
        content: "Grandchild",
      },
    ]);
    const imported = parseImportFile("structured.md", exported);

    expect(imported.nodes).toHaveLength(3);
    expect(imported.nodes[0].content).toBe("# Root\nRoot note");
    expect(imported.nodes[1].content).toBe("Child\nChild note");
    expect(imported.nodes[1].parentId).toBe(imported.nodes[0].id);
    expect(imported.nodes[2].content).toBe("Grandchild");
    expect(imported.nodes[2].parentId).toBe(imported.nodes[1].id);
  });

  it("imports legacy PuuNote markdown without nesting children into parent content", () => {
    const legacy = `<!-- puunote-format: 1 -->

# Root

Intro

    ## Child

    Details

    <!-- puunote-node -->

<!-- puunote-node -->
`;
    const imported = parseImportFile("legacy.md", legacy);

    expect(imported.nodes).toHaveLength(2);
    expect(imported.nodes[0].content).toBe("# Root\n\nIntro");
    expect(imported.nodes[1].content).toBe("## Child\n\nDetails");
    expect(imported.nodes[1].parentId).toBe(imported.nodes[0].id);
  });

  it("imports legacy PuuNote markdown with descendant closing markers", () => {
    const legacy = `<!-- puunote-format: 1 -->

Root

    Child 1

    <!-- puunote-node -->

    Child 2

        Grandchild

        <!-- puunote-node -->

    <!-- puunote-node -->

<!-- puunote-node -->
`;
    const imported = parseImportFile("legacy-nested.md", legacy);

    expect(imported.nodes.map((node) => node.content)).toEqual([
      "Root",
      "Child 1",
      "Child 2",
      "Grandchild",
    ]);
    expect(imported.nodes[1].parentId).toBe(imported.nodes[0].id);
    expect(imported.nodes[2].parentId).toBe(imported.nodes[0].id);
    expect(imported.nodes[3].parentId).toBe(imported.nodes[2].id);
  });
});
