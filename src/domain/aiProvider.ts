import type { PuuNode, PuuNodeMetadata } from "../types";
import {
  buildContextForLLM,
  type ContextExtractionResult,
  type LLMContextOptions,
} from "./contextExtraction";

export type AiOperationKind = "expand-card";

export interface AiOperation {
  kind: AiOperationKind;
  label: string;
  destructive?: boolean;
}

export interface GeneratedNodeDraft {
  content: string;
  metadata?: PuuNodeMetadata;
}

export interface AiRunRequest {
  operation: AiOperation;
  nodes: PuuNode[];
  targetNodeId: string;
  contextOptions?: LLMContextOptions;
  signal: AbortSignal;
}

export interface AiRunResult {
  providerId: string;
  operation: AiOperation;
  context: ContextExtractionResult;
  drafts: GeneratedNodeDraft[];
  warnings: string[];
}

export interface AiProvider {
  id: string;
  label: string;
  isExternal: boolean;
  run(request: AiRunRequest): Promise<AiRunResult>;
}

const expandCardOperation: AiOperation = {
  kind: "expand-card",
  label: "Expand selected card",
  destructive: false,
};

const createMockDrafts = (targetNode: PuuNode): GeneratedNodeDraft[] => {
  const baseLine = targetNode.content.split("\n")[0].replace(/^#+\s*/, "");
  const topic = baseLine || "Selected idea";

  return [
    {
      content: `Clarify goal\n\nWhat should "${topic}" achieve for the reader or workflow?`,
    },
    {
      content: `List constraints\n\nCapture limits, dependencies, and edge cases before expanding "${topic}".`,
    },
    {
      content: `Next action\n\nDefine the smallest useful follow-up step for "${topic}".`,
    },
  ];
};

export const mockAiProvider: AiProvider = {
  id: "mock-local",
  label: "Mock Local Provider",
  isExternal: false,

  async run(request) {
    if (request.signal.aborted) throw new Error("Job cancelled");

    const context = buildContextForLLM(request.nodes, request.targetNodeId, {
      maxLevels: 2,
      maxChars: 4_000,
      includeAncestors: true,
      includeDescendants: true,
      includeNodeIds: false,
      ...request.contextOptions,
    });

    if (!context) {
      throw new Error("Target node was not found.");
    }

    return {
      providerId: this.id,
      operation: request.operation,
      context,
      drafts: createMockDrafts(context.node),
      warnings: context.warnings,
    };
  },
};

const providers = new Map<string, AiProvider>([
  [mockAiProvider.id, mockAiProvider],
]);

export const AiProviderRegistry = {
  expandCardOperation,

  list() {
    return Array.from(providers.values());
  },

  get(providerId: string) {
    return providers.get(providerId) || null;
  },

  register(provider: AiProvider) {
    providers.set(provider.id, provider);
  },
};
