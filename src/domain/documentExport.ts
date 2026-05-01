import type { PuuDocument, PuuNode } from "../types";
import {
  exportNodesToMarkdown,
  exportNodesToStructuredMarkdown,
  parseMarkdownToNodes,
} from "../utils/markdownParser";
import { PuuNodeSchema } from "../utils/schema";
import { normalizeNodes, normalizeNodesWithReport } from "./documentService";

export const PUUNOTE_JSON_FORMAT = "puunote.document";
export const PUUNOTE_JSON_SCHEMA_VERSION = 1;

export interface PuuNoteJsonExport {
  format: typeof PUUNOTE_JSON_FORMAT;
  schemaVersion: typeof PUUNOTE_JSON_SCHEMA_VERSION;
  exportedAt: string;
  document: PuuDocument;
  nodes: PuuNode[];
}

export interface ParsedImport {
  title: string;
  nodes: PuuNode[];
  metadata?: PuuDocument["metadata"];
}

const fallbackFilename = "puunote-export";

export function createDocumentFilename(
  document: Pick<PuuDocument, "title"> | null | undefined,
  nodes: PuuNode[],
) {
  let filename = document?.title || fallbackFilename;

  if (!document?.title && nodes.length > 0) {
    const rootNodes = nodes.filter((node) => !node.parentId);
    const firstNodeContent = rootNodes[0]?.content || nodes[0]?.content || "";
    const match = firstNodeContent.match(/^#{1,6}\s+(.*)$/m);
    if (match?.[1]) {
      filename = match[1];
    } else {
      filename = firstNodeContent
        .split("\n")[0]
        .split(/\s+/)
        .slice(0, 3)
        .join("-");
    }
  }

  const clean = filename
    .trim()
    .replace(/[^a-zA-Z0-9_\-\u0400-\u04FF\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return clean || fallbackFilename;
}

export function buildMarkdownExport(nodes: PuuNode[]) {
  return exportNodesToMarkdown(nodes);
}

export function buildStructuredMarkdownExport(nodes: PuuNode[]) {
  return exportNodesToStructuredMarkdown(nodes);
}

export function buildJsonExport(
  document: PuuDocument | null | undefined,
  nodes: PuuNode[],
): string {
  const normalized = normalizeNodes(nodes);
  const payload: PuuNoteJsonExport = {
    format: PUUNOTE_JSON_FORMAT,
    schemaVersion: PUUNOTE_JSON_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    document: document || {
      id: "export",
      title: "PuuNote Export",
      updatedAt: Date.now(),
    },
    nodes: normalized,
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseJsonExport(raw: string): ParsedImport {
  let parsed: Partial<PuuNoteJsonExport>;
  try {
    parsed = JSON.parse(raw) as Partial<PuuNoteJsonExport>;
  } catch {
    throw new Error("Invalid JSON file.");
  }

  if (
    parsed.format !== PUUNOTE_JSON_FORMAT ||
    parsed.schemaVersion !== PUUNOTE_JSON_SCHEMA_VERSION ||
    !parsed.document ||
    !Array.isArray(parsed.nodes)
  ) {
    throw new Error("Unsupported PuuNote JSON export.");
  }

  // Validate each node through Zod schema before trusting the data
  const validNodes: PuuNode[] = [];
  for (const rawNode of parsed.nodes) {
    const result = PuuNodeSchema.safeParse(rawNode);
    if (result.success) {
      validNodes.push(result.data);
    }
  }

  const { nodes, report } = normalizeNodesWithReport(validNodes);
  if (nodes.length === 0) {
    throw new Error(
      report.errors[0] || "PuuNote JSON export does not contain valid nodes.",
    );
  }

  return {
    title: parsed.document.title || "Imported PuuNote Document",
    nodes,
    metadata: parsed.document.metadata,
  };
}

export function parseImportFile(filename: string, raw: string): ParsedImport {
  if (/\.json$/i.test(filename)) {
    return parseJsonExport(raw);
  }

  const { nodes, report } = normalizeNodesWithReport(parseMarkdownToNodes(raw));
  if (nodes.length === 0) {
    throw new Error(
      report.errors[0] || "Markdown import does not contain valid nodes.",
    );
  }

  return {
    title: filename.replace(/\.(md|markdown)$/i, "") || "Imported Markdown",
    nodes,
  };
}
