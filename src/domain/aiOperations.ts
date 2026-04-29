import { toast } from "sonner";
import { takeDocumentSnapshot } from "../db/snapshots";
import { PluginRegistry } from "../plugins/registry";
import { useAppStore } from "../store/useAppStore";
import type { PuuNode } from "../types";
import { generateId } from "../utils/id";
import { JobRunner } from "./jobRunner";
import {
  AiProviderRegistry,
  type AiProvider,
  type AiRunResult,
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

async function runExpandCardProvider(
  provider: AiProvider,
  targetNodeId: string,
  signal: AbortSignal,
): Promise<AiRunResult> {
  const nodes = useAppStore.getState().nodes;
  return provider.run({
    operation: AiProviderRegistry.expandCardOperation,
    nodes,
    targetNodeId,
    signal,
  });
}

export async function runMockExpandSelectedCard() {
  const state = useAppStore.getState();
  const targetNodeId = state.activeId;
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

      const result = await runExpandCardProvider(
        provider,
        targetNodeId,
        signal,
      );
      checkCancelled();

      updateProgress(70, "Applying drafts...");
      let createdNodes: PuuNode[] = [];
      useAppStore.getState().setNodes((prev) => {
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

      createdNodes.forEach((node) => PluginRegistry.emitNodeCreated(node));
      if (createdNodes[0]) {
        useAppStore.setState({
          activeId: createdNodes[0].id,
          selectedIds: [createdNodes[0].id],
        });
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
