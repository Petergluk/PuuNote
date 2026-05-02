import { db, type DocumentData, type DocumentMeta } from "../db/db";
import type { PuuDocument, PuuNode } from "../types";
import { generateId } from "../utils/id";
import { MAX_FILE_SIZE_BYTES } from "../constants";
import {
  validateNodesWithReport,
  type NodeValidationReport,
} from "../utils/schema";

export interface DocumentDraft {
  id?: string;
  title: string;
  nodes: PuuNode[];
  metadata?: PuuDocument["metadata"];
}

export interface SearchDocumentNode {
  id: string;
  content: string;
  fileId: string;
  fileTitle: string;
}

export interface ActiveSearchDocument {
  fileId: string;
  fileTitle: string;
  nodes: PuuNode[];
}

let searchIndexCache: {
  signature: string;
  nodes: SearchDocumentNode[];
} | null = null;

const fileSearchCache = new Map<
  string,
  { updatedAt: number; nodes: SearchDocumentNode[] }
>();

const clearSearchIndexCache = () => {
  searchIndexCache = null;
  fileSearchCache.clear();
};

export const mergeSearchNodesWithActiveDocument = (
  searchNodes: SearchDocumentNode[],
  activeDocument?: ActiveSearchDocument | null,
): SearchDocumentNode[] => {
  if (!activeDocument) {
    return searchNodes;
  }

  const merged = searchNodes.filter(
    (node) => node.fileId !== activeDocument.fileId,
  );
  const activeNodes = normalizeNodes(activeDocument.nodes);
  for (const node of activeNodes) {
    merged.push({
      id: node.id,
      content: node.content,
      fileId: activeDocument.fileId,
      fileTitle: activeDocument.fileTitle,
    });
  }
  return merged;
};

const createSearchIndexSignature = (documents: PuuDocument[]) =>
  documents
    .map((document) => `${document.id}:${document.updatedAt}:${document.title}`)
    .sort()
    .join("|");

const parseUpdatedAt = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : Date.now();
};

const toDocument = (meta: DocumentMeta): PuuDocument => ({
  id: meta.id,
  title: meta.title,
  updatedAt: parseUpdatedAt(meta.updatedAt),
  metadata: meta.metadata,
});

const toDocumentMeta = (document: PuuDocument): DocumentMeta => ({
  id: document.id,
  title: document.title,
  updatedAt: String(document.updatedAt),
  metadata: document.metadata,
});

export const normalizeNodesWithReport = (
  rawNodes: unknown,
): { nodes: PuuNode[]; report: NodeValidationReport } => {
  const { nodes: validated, report } = validateNodesWithReport(rawNodes);
  if (validated.length === 0) return { nodes: [], report };

  const seenIds = new Set<string>();
  const siblingCounters = new Map<string | null, number>();

  const nodes = validated.map((node) => {
    let id = node.id;
    while (seenIds.has(id)) {
      id = generateId();
      report.repaired = true;
      report.warnings.push(`Regenerated duplicate node id "${node.id}".`);
    }
    seenIds.add(id);

    const parentId = node.parentId;
    const nextOrder = siblingCounters.get(parentId) ?? 0;
    siblingCounters.set(parentId, nextOrder + 1);

    return {
      ...node,
      id,
      order:
        typeof node.order === "number" && Number.isFinite(node.order)
          ? node.order
          : nextOrder,
    };
  });

  report.outputCount = nodes.length;
  return { nodes, report };
};

export const normalizeNodes = (rawNodes: unknown): PuuNode[] =>
  normalizeNodesWithReport(rawNodes).nodes;

export const DocumentService = {
  async migrateLegacyLocalStorage() {
    if (localStorage.getItem("puu_documents") === null) return;

    let lsDocs: unknown;
    try {
      lsDocs = JSON.parse(localStorage.getItem("puu_documents") || "[]");
    } catch {
      console.warn(
        "Failed to parse legacy puu_documents from localStorage — skipping migration.",
      );
      return;
    }
    if (!Array.isArray(lsDocs)) return;

    const documents: PuuDocument[] = [];
    const files: DocumentData[] = [];

    for (const doc of lsDocs) {
      if (!doc || !doc.id) continue;

      let nodesData: unknown = null;
      const lsStr = localStorage.getItem(`puu_file_${doc.id}`);
      if (lsStr) {
        try {
          nodesData = JSON.parse(lsStr);
        } catch {
          console.warn(
            `Failed to parse legacy nodes for document ${doc.id} — skipping.`,
          );
        }
      } else if (doc.id === "default") {
        const scribeStr = localStorage.getItem("scribe_nodes");
        if (scribeStr) {
          try {
            nodesData = JSON.parse(scribeStr);
          } catch {
            console.warn("Failed to parse legacy scribe_nodes — skipping.");
          }
        }
      }

      documents.push({
        id: String(doc.id),
        title: typeof doc.title === "string" ? doc.title : "Untitled",
        updatedAt: parseUpdatedAt(doc.updatedAt),
        metadata: doc.metadata,
      });

      const nodes = normalizeNodes(nodesData);
      if (nodes.length > 0) {
        files.push({ id: String(doc.id), nodes });
      }
    }

    await db.transaction("rw", db.files, db.documents, async () => {
      if (files.length > 0) await db.files.bulkPut(files);
      if (documents.length > 0) {
        await db.documents.bulkPut(documents.map(toDocumentMeta));
      }
    });

    for (const doc of lsDocs) {
      if (!doc || !doc.id) continue;
      localStorage.removeItem(`puu_file_${doc.id}`);
    }
    localStorage.removeItem("puu_documents");
    localStorage.removeItem("scribe_nodes");
  },

  async listDocuments(): Promise<PuuDocument[]> {
    const stored = await db.documents.toArray();
    return stored.map(toDocument);
  },

  async saveDocuments(documents: PuuDocument[]) {
    if (documents.length === 0) return;
    await db.documents.bulkPut(documents.map(toDocumentMeta));
    clearSearchIndexCache();
  },

  async loadNodes(fileId: string): Promise<PuuNode[] | null> {
    const fileData = await db.files.get(fileId);
    if (!fileData) return null;
    return normalizeNodesWithReport(fileData.nodes).nodes;
  },

  async saveNodes(fileId: string, nodes: PuuNode[]) {
    const { nodes: normalized, report } = normalizeNodesWithReport(nodes);
    if (nodes.length > 0 && normalized.length === 0) {
      throw new Error(
        report.errors[0] ||
          "Refusing to overwrite document with invalid empty data.",
      );
    }
    const size = new Blob([JSON.stringify(normalized)]).size;
    if (size > MAX_FILE_SIZE_BYTES) {
      const error = new Error("Storage quota exceeded (5MB limit).");
      error.name = "QuotaExceededError";
      throw error;
    }
    await db.files.put({ id: fileId, nodes: normalized });
    clearSearchIndexCache();
    this.clearDirtySave(fileId);
  },

  async createDocument(draft: DocumentDraft): Promise<PuuDocument> {
    const id = draft.id || generateId();
    const document: PuuDocument = {
      id,
      title: draft.title || "New Document",
      updatedAt: Date.now(),
      metadata: draft.metadata,
    };
    const nodes = normalizeNodes(draft.nodes);

    await db.transaction("rw", db.files, db.documents, async () => {
      await db.documents.put(toDocumentMeta(document));
      await db.files.put({ id, nodes });
    });

    clearSearchIndexCache();
    return document;
  },

  async deleteDocument(fileId: string) {
    await db.transaction(
      "rw",
      db.files,
      db.documents,
      db.snapshots,
      async () => {
        await db.files.delete(fileId);
        await db.documents.delete(fileId);
        await db.snapshots.where("documentId").equals(fileId).delete();
      },
    );
    localStorage.removeItem(`puu_file_${fileId}`);
    clearSearchIndexCache();
  },

  readActiveFileId(): string | null {
    return localStorage.getItem("puu_active_file");
  },

  storeActiveFileId(fileId: string) {
    localStorage.setItem("puu_active_file", fileId);
  },

  saveDirtyNodes(fileId: string, nodes: PuuNode[]) {
    sessionStorage.setItem(
      "puu_dirty_save",
      JSON.stringify({ fileId, nodes: normalizeNodes(nodes) }),
    );
  },

  clearDirtySave(fileId?: string) {
    if (!fileId) {
      sessionStorage.removeItem("puu_dirty_save");
      return;
    }
    try {
      const dirtySave = JSON.parse(
        sessionStorage.getItem("puu_dirty_save") || "",
      );
      if (dirtySave?.fileId === fileId) {
        sessionStorage.removeItem("puu_dirty_save");
      }
    } catch {
      sessionStorage.removeItem("puu_dirty_save");
    }
  },

  async restoreDirtySave() {
    const dirtySaveStr = sessionStorage.getItem("puu_dirty_save");
    if (!dirtySaveStr) return;

    try {
      const dirtySave = JSON.parse(dirtySaveStr);
      if (dirtySave?.fileId && Array.isArray(dirtySave?.nodes)) {
        await db.files.put({
          id: String(dirtySave.fileId),
          nodes: normalizeNodes(dirtySave.nodes),
        });
      }
    } finally {
      sessionStorage.removeItem("puu_dirty_save");
    }
  },

  async getSearchNodes(
    documents: PuuDocument[],
    activeDocument?: ActiveSearchDocument | null,
  ): Promise<SearchDocumentNode[]> {
    const signature = createSearchIndexSignature(documents);
    if (searchIndexCache?.signature === signature) {
      return mergeSearchNodesWithActiveDocument(
        searchIndexCache.nodes,
        activeDocument,
      );
    }

    const searchNodes: SearchDocumentNode[] = [];

    for (const doc of documents) {
      let cached = fileSearchCache.get(doc.id);

      if (!cached || cached.updatedAt < doc.updatedAt) {
        const file = await db.files.get(doc.id);
        const nodes = file ? normalizeNodes(file.nodes) : [];
        const fileSearchNodes: SearchDocumentNode[] = [];

        for (const node of nodes) {
          fileSearchNodes.push({
            id: node.id,
            content: node.content,
            fileId: doc.id,
            fileTitle: doc.title,
          });
        }

        cached = { updatedAt: doc.updatedAt, nodes: fileSearchNodes };
        fileSearchCache.set(doc.id, cached);
      }

      for (let i = 0; i < cached.nodes.length; i++) {
        // We re-assign the title in case the document title changed but nodes didn't
        cached.nodes[i].fileTitle = doc.title;
        searchNodes.push(cached.nodes[i]);
      }
    }

    searchIndexCache = { signature, nodes: searchNodes };
    return mergeSearchNodesWithActiveDocument(searchNodes, activeDocument);
  },

  clearSearchIndexCache,
};
