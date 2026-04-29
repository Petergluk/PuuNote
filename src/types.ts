export interface PuuNode {
  id: string;
  content: string;
  parentId: string | null;
  order?: number;
  metadata?: Record<string, any>;
}
export interface PuuDocument {
  id: string;
  title: string;
  updatedAt: number;
  metadata?: Record<string, any>;
}
