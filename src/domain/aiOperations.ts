import { toast } from "sonner";
import { takeDocumentSnapshot } from "../db/snapshots";
import type { PuuNode } from "../types";
import { generateId } from "../utils/id";
import { JobRunner } from "./jobRunner";
import {
  AiProviderRegistry,
  type GeneratedNodeDraft,
} from "./aiProvider";

export interface ApplyGeneratedDraftsResult {
  nextNodes: PuuNode[];
  createdNodes: PuuNode[];
}

export function applyGeneratedNodeDrafts(
  nodes: PuuNode[],
  parentId: string,
  drafts: GeneratedNodeDraft[],
  providerId: string,
  operation: string,
): ApplyGeneratedDraftsResult {
  const siblingOrders = nodes
    .filter((node) => node.parentId === parentId)
    .map((node) => node.order ?? 0);
  const firstOrder =
    siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
  const createdAt = new Date().toISOString();

  const createdNodes = drafts.map((draft, index): PuuNode => {
    const node: PuuNode = {
      id: generateId(),
      parentId,
      content: draft.content,
      order: firstOrder + index,
      metadata: {
        ...draft.metadata,
        ai: {
          ...draft.metadata?.ai,
          provider: providerId,
          generatedAt: createdAt,
          operation,
        },
      },
    };
    return node;
  });

  return {
    nextNodes: [...nodes, ...createdNodes],
    createdNodes,
  };
}

export interface AiExpandContext {
  targetNodeId: string | null;
  getNodes: () => PuuNode[];
  setNodes: (updater: (prev: PuuNode[]) => PuuNode[]) => void;
  setActiveIds: (activeId: string, selectedIds: string[]) => void;
}

export async function runMockExpandSelectedCard(context: AiExpandContext) {
  const { targetNodeId, getNodes, setNodes, setActiveIds } = context;
  if (!targetNodeId) {
    toast.error("Select a card before running AI draft.");
    return;
  }

  const provider = AiProviderRegistry.get("mock-local");
  if (!provider) {
    toast.error("AI provider is not available.");
    return;
  }

  await takeDocumentSnapshot("Before AI draft expansion");

  await JobRunner.runJob(
    "AI: draft child cards",
    async (updateProgress, checkCancelled, signal) => {
      updateProgress(15, "Preparing context...");
      checkCancelled();

      const result = await provider.run({
        operation: AiProviderRegistry.expandCardOperation,
        nodes: getNodes(),
        targetNodeId,
        signal,
      });
      checkCancelled();

      updateProgress(70, "Applying drafts...");
      let createdNodes: PuuNode[] = [];
      setNodes((prev) => {
        const applied = applyGeneratedNodeDrafts(
          prev,
          targetNodeId,
          result.drafts,
          result.providerId,
          result.operation.kind,
        );
        createdNodes = applied.createdNodes;
        return applied.nextNodes;
      });

      if (createdNodes[0]) {
        setActiveIds(createdNodes[0].id, [createdNodes[0].id]);
      }

      updateProgress(
        100,
        result.context.truncated
          ? "Drafts added with truncated context."
          : "Drafts added.",
      );
      if (result.warnings.length > 0) {
        toast.warning("AI context was limited.", {
          description: result.warnings.join(" "),
        });
      }
      return result;
    },
  );
}
