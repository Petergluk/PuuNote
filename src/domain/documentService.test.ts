import { describe, expect, it } from "vitest";
import {
  mergeSearchNodesWithActiveDocument,
  type SearchDocumentNode,
} from "./documentService";

describe("documentService search merge", () => {
  it("replaces cached active-file nodes with unsaved in-memory nodes", () => {
    const cached: SearchDocumentNode[] = [
      {
        id: "a",
        content: "Saved content",
        fileId: "doc-1",
        fileTitle: "Doc 1",
      },
      {
        id: "b",
        content: "Other document",
        fileId: "doc-2",
        fileTitle: "Doc 2",
      },
    ];

    const merged = mergeSearchNodesWithActiveDocument(cached, {
      fileId: "doc-1",
      fileTitle: "Doc 1",
      nodes: [{ id: "a", parentId: null, order: 0, content: "Unsaved draft" }],
    });

    expect(merged).toEqual([
      {
        id: "b",
        content: "Other document",
        fileId: "doc-2",
        fileTitle: "Doc 2",
      },
      {
        id: "a",
        content: "Unsaved draft",
        fileId: "doc-1",
        fileTitle: "Doc 1",
      },
    ]);
  });
});
