import { PuuNode } from "../types";
import {
  getDepthFirstNodesFromIndex,
  buildTreeIndex,
  type TreeIndex,
} from "../utils/tree";

export interface LLMContextOptions {
  maxLevels?: number;
  maxChars?: number;
  includeAncestors?: boolean;
  includeDescendants?: boolean;
  includeNodeIds?: boolean;
}

export interface ContextExtractionResult {
  node: PuuNode;
  ancestors: PuuNode[];
  descendants: PuuNode[];
  textContext: string;
  truncated: boolean;
  estimatedTokens: number;
  warnings: string[];
  options: Required<LLMContextOptions>;
}

const DEFAULT_CONTEXT_OPTIONS: Required<LLMContextOptions> = {
  maxLevels: -1,
  maxChars: 12_000,
  includeAncestors: true,
  includeDescendants: true,
  includeNodeIds: true,
};

const normalizeOptions = (
  optionsOrMaxLevels: number | LLMContextOptions = DEFAULT_CONTEXT_OPTIONS,
): Required<LLMContextOptions> => {
  const input =
    typeof optionsOrMaxLevels === "number"
      ? { maxLevels: optionsOrMaxLevels }
      : optionsOrMaxLevels;

  return {
    ...DEFAULT_CONTEXT_OPTIONS,
    ...input,
  };
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

const formatNodeLine = (node: PuuNode, includeNodeIds: boolean) => {
  const content = node.content.split("\n")[0] || "Untitled";
  return includeNodeIds ? `[${node.id}] ${content}` : content;
};

const appendWithBudget = (
  chunks: string[],
  text: string,
  maxChars: number,
  warnings: string[],
) => {
  const currentLength = chunks.join("").length;
  if (currentLength >= maxChars) return false;
  if (currentLength + text.length <= maxChars) {
    chunks.push(text);
    return true;
  }

  const remaining = Math.max(0, maxChars - currentLength);
  if (remaining > 0) {
    chunks.push(text.slice(0, remaining));
  }
  warnings.push(`Context truncated at ${maxChars} characters.`);
  return false;
};

const getAncestors = (index: TreeIndex, targetNode: PuuNode) => {
  const ancestors: PuuNode[] = [];
  let curr = targetNode.parentId;
  while (curr) {
    const parent = index.nodeMap.get(curr);
    if (!parent) break;
    ancestors.unshift(parent);
    curr = parent.parentId;
  }
  return ancestors;
};

const getDescendants = (
  index: TreeIndex,
  targetNodeId: string,
  maxLevels: number,
) => {
  const descendants: PuuNode[] = [];
  const stack = [{ id: targetNodeId, depth: 0 }];

  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    if (id !== targetNodeId) {
      const node = index.nodeMap.get(id);
      if (node) descendants.push(node);
    }

    if (maxLevels === -1 || depth < maxLevels) {
      const children = index.childrenMap.get(id) || [];
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ id: children[i].id, depth: depth + 1 });
      }
    }
  }

  return descendants;
};

/**
 * Provides a text representation of a node and its descendants for LLM context.
 */
export function buildContextForLLM(
  nodes: PuuNode[],
  targetNodeId: string,
  optionsOrMaxLevels: number | LLMContextOptions = DEFAULT_CONTEXT_OPTIONS,
): ContextExtractionResult | null {
  const options = normalizeOptions(optionsOrMaxLevels);
  const treeIndex = buildTreeIndex(nodes);
  const targetNode = treeIndex.nodeMap.get(targetNodeId);

  if (!targetNode) return null;

  const warnings: string[] = [];
  const ancestors = options.includeAncestors
    ? getAncestors(treeIndex, targetNode)
    : [];
  const descendants = options.includeDescendants
    ? getDescendants(treeIndex, targetNodeId, options.maxLevels)
    : [];

  const chunks: string[] = [];
  appendWithBudget(
    chunks,
    `Context for Node ${options.includeNodeIds ? `[${targetNodeId}]` : ""}:\n\n`,
    options.maxChars,
    warnings,
  );
  if (ancestors.length > 0) {
    appendWithBudget(chunks, "Ancestors path:\n", options.maxChars, warnings);
    ancestors.forEach((anc, i) => {
      appendWithBudget(
        chunks,
        `${" ".repeat(i * 2)}- ${formatNodeLine(anc, options.includeNodeIds)}\n`,
        options.maxChars,
        warnings,
      );
    });
    appendWithBudget(chunks, "\n", options.maxChars, warnings);
  }

  appendWithBudget(chunks, "Target Node:\n", options.maxChars, warnings);
  appendWithBudget(
    chunks,
    `${options.includeNodeIds ? `[${targetNode.id}] ` : ""}${targetNode.content}\n\n`,
    options.maxChars,
    warnings,
  );

  if (descendants.length > 0) {
    appendWithBudget(chunks, "Descendants:\n", options.maxChars, warnings);
    const descSet = new Set(descendants.map((d) => d.id));
    const depthFirstNodes = getDepthFirstNodesFromIndex(treeIndex);
    const allDfNodes = depthFirstNodes.filter((df) => descSet.has(df.id));
    const targetDepthInfo = depthFirstNodes.find((n) => n.id === targetNodeId);
    const baseDepth = targetDepthInfo?.depth || 0;

    allDfNodes.forEach((n) => {
      const relDepth = n.depth - baseDepth;
      if (relDepth > 0) {
        appendWithBudget(
          chunks,
          `${" ".repeat((relDepth - 1) * 2)}- ${formatNodeLine(n, options.includeNodeIds)}\n`,
          options.maxChars,
          warnings,
        );
      }
    });
  }

  const textContext = chunks.join("");

  return {
    node: targetNode,
    ancestors,
    descendants,
    textContext,
    truncated: warnings.length > 0,
    estimatedTokens: estimateTokens(textContext),
    warnings: Array.from(new Set(warnings)),
    options,
  };
}
