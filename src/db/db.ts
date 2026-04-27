import Dexie, { type Table } from 'dexie';
import type { PuuNode } from '../types';

export interface DocumentMeta {
  id: string;
  title: string;
  updatedAt: string;
}

export interface DocumentData {
  id: string;
  nodes: PuuNode[];
}

export class AppDatabase extends Dexie {
  documents!: Table<DocumentMeta, string>;
  files!: Table<DocumentData, string>;

  constructor() {
    super('PuuNoteDB');
    this.version(1).stores({
      documents: 'id, updatedAt', // id is primary key, index on updatedAt
      files: 'id' // id is primary key
    });
  }
}

export const db = new AppDatabase();
