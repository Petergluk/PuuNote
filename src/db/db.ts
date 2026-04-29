import Dexie, { type Table } from "dexie";
import type { PuuDocumentMetadata, PuuNode } from "../types";

export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: string;
  metadata?: PuuDocumentMetadata;
}

export interface DocumentData {
  id: string;
  nodes: PuuNode[];
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  nodes: PuuNode[];
  createdAt: string;
  description?: string;
}

export class AppDatabase extends Dexie {
  documents!: Table<DocumentMeta, string>;
  files!: Table<DocumentData, string>;
  snapshots!: Table<DocumentSnapshot, string>;

  constructor() {
    super("PuuNoteDB");
    this.version(1).stores({
      documents: "id, updatedAt", // id is primary key, index on updatedAt
      files: "id", // id is primary key
    });
    this.version(2).stores({
      documents: "id, updatedAt",
      files: "id",
      snapshots: "id, documentId, createdAt",
    });
  }
}

export const db = new AppDatabase();
