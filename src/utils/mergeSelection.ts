import {
  canMergeNodes,
  type MergeValidationResult,
} from "../domain/documentTree";
import type { PuuNode } from "../types";
import { buildTreeIndex, getDepthFirstNodesFromIndex } from "./tree";

export interface MergeSelectionState extends MergeValidationResult {
  masterId: string | null;
  nodeIdsToMerge: string[];
}

const buildInvalidState = (
  nodeIdsToMerge: string[],
  reason: string,
): MergeSelectionState => ({
  ok: false,
  orderedIds: nodeIdsToMerge,
  masterId: null,
  nodeIdsToMerge,
  reason,
});

const resolveMergeMasterId = (
  nodes: PuuNode[],
  activeId: string | null,
  nodeIdsToMerge: string[],
) => {
  if (activeId && nodeIdsToMerge.includes(activeId)) {
    return activeId;
  }

  const depthFirstIds = getDepthFirstNodesFromIndex(buildTreeIndex(nodes)).map(
    (node) => node.id,
  );
  const visualOrder = new Map(depthFirstIds.map((id, index) => [id, index]));
  return [...nodeIdsToMerge].sort((a, b) => {
    const orderA = visualOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
    const orderB = visualOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return nodeIdsToMerge.indexOf(a) - nodeIdsToMerge.indexOf(b);
  })[0];
};

export const getMergeSelectionState = (
  nodes: PuuNode[],
  activeId: string | null,
  selectedIds: string[],
): MergeSelectionState => {
  const nodeIdsToMerge = Array.from(new Set(selectedIds));

  if (nodeIdsToMerge.length < 2) {
    return buildInvalidState(
      nodeIdsToMerge,
      "Select at least two cards to merge.",
    );
  }

  const masterId = resolveMergeMasterId(nodes, activeId, nodeIdsToMerge);
  if (!masterId) {
    return buildInvalidState(nodeIdsToMerge, "Select cards to merge.");
  }

  const validation = canMergeNodes(nodes, masterId, nodeIdsToMerge);
  return {
    ...validation,
    masterId: validation.ok ? masterId : null,
    nodeIdsToMerge,
  };
};
