import { db, type DocumentData, type DocumentMeta } from "../db/db";
import type { PuuDocument, PuuNode } from "../types";
import { generateId } from "../utils/id";
import { validateNodes } from "../utils/schema";

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

export const normalizeNodes = (rawNodes: unknown): PuuNode[] => {
  const validated = validateNodes(rawNodes);
  if (validated.length === 0) return [];

  const seenIds = new Set<string>();
  const siblingCounters = new Map<string | null, number>();

  return validated.map((node) => {
    let id = node.id;
    while (seenIds.has(id)) {
      id = generateId();
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
};

export const DocumentService = {
  async migrateLegacyLocalStorage() {
    if (localStorage.getItem("puu_documents") === null) return;

    const lsDocs = JSON.parse(localStorage.getItem("puu_documents") || "[]");
    if (!Array.isArray(lsDocs)) return;

    const documents: PuuDocument[] = [];
    const files: DocumentData[] = [];

    for (const doc of lsDocs) {
      if (!doc || !doc.id) continue;

      let nodesData: unknown = null;
      const lsStr = localStorage.getItem(`puu_file_${doc.id}`);
      if (lsStr) {
        nodesData = JSON.parse(lsStr);
      } else if (doc.id === "default") {
        const scribeStr = localStorage.getItem("scribe_nodes");
        if (scribeStr) nodesData = JSON.parse(scribeStr);
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
  },

  async loadNodes(fileId: string): Promise<PuuNode[] | null> {
    const fileData = await db.files.get(fileId);
    if (!fileData) return null;
    return normalizeNodes(fileData.nodes);
  },

  async saveNodes(fileId: string, nodes: PuuNode[]) {
    const normalized = normalizeNodes(nodes);
    await db.files.put({ id: fileId, nodes: normalized });
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
  },

  readActiveFileId(): string | null {
    return localStorage.getItem("puu_active_file");
  },

  storeActiveFileId(fileId: string) {
    localStorage.setItem("puu_active_file", fileId);
  },

  saveDirtyNodes(fileId: string, nodes: PuuNode[]) {
    localStorage.setItem(
      "puu_dirty_save",
      JSON.stringify({ fileId, nodes: normalizeNodes(nodes) }),
    );
  },

  async restoreDirtySave() {
    const dirtySaveStr = localStorage.getItem("puu_dirty_save");
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
      localStorage.removeItem("puu_dirty_save");
    }
  },

  async getSearchNodes(
    documents: PuuDocument[],
  ): Promise<SearchDocumentNode[]> {
    const allFiles = await db.files.toArray();
    const titleById = new Map(documents.map((doc) => [doc.id, doc.title]));
    const searchNodes: SearchDocumentNode[] = [];

    for (const file of allFiles) {
      const title = titleById.get(file.id) || "Unknown Document";
      const nodes = normalizeNodes(file.nodes);
      for (const node of nodes) {
        searchNodes.push({
          id: node.id,
          content: node.content,
          fileId: file.id,
          fileTitle: title,
        });
      }
    }

    return searchNodes;
  },
};
