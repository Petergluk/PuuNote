import { describe, expect, it } from "vitest";
import {
  buildJsonExport,
  createDocumentFilename,
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
});
