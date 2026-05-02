export interface PuuNodeMetadata {
  isGenerating?: boolean;
  branchColor?: string;
  ai?: {
    provider?: string;
    jobId?: string;
    generatedAt?: string;
    operation?: string;
  };
  plugin?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PuuDocumentMetadata {
  plugin?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface PuuNode {
  id: string;
  content: string;
  parentId: string | null;
  order?: number;
  metadata?: PuuNodeMetadata;
}
export interface PuuDocument {
  id: string;
  title: string;
  updatedAt: number;
  metadata?: PuuDocumentMetadata;
}
