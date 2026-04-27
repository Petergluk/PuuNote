export interface PuuNode {
  id: string;
  content: string;
  parentId: string | null;
  order?: number;
}
export interface PuuDocument {
  id: string;
  title: string;
  updatedAt: number;
}
