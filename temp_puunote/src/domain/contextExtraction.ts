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
  currentLength: { value: number },
  text: string,
  maxChars: number,
  warnings: string[],
) => {
  if (currentLength.value >= maxChars) return false;
  if (currentLength.value + text.length <= maxChars) {
    chunks.push(text);
    currentLength.value += text.length;
    return true;
  }

  const remaining = Math.max(0, maxChars - currentLength.value);
  if (remaining > 0) {
    chunks.push(text.slice(0, remaining));
    currentLength.value += remaining;
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
  const len = { value: 0 };
  appendWithBudget(
    chunks,
    len,
    `Context for Node ${options.includeNodeIds ? `[${targetNodeId}]` : ""}:\n\n`,
    options.maxChars,
    warnings,
  );
  if (ancestors.length > 0) {
    appendWithBudget(
      chunks,
      len,
      "Ancestors path:\n",
      options.maxChars,
      warnings,
    );
    ancestors.forEach((anc, i) => {
      appendWithBudget(
        chunks,
        len,
        `${" ".repeat(i * 2)}- ${formatNodeLine(anc, options.includeNodeIds)}\n`,
        options.maxChars,
        warnings,
      );
    });
    appendWithBudget(chunks, len, "\n", options.maxChars, warnings);
  }

  appendWithBudget(chunks, len, "Target Node:\n", options.maxChars, warnings);
  appendWithBudget(
    chunks,
    len,
    `${options.includeNodeIds ? `[${targetNode.id}] ` : ""}${targetNode.content}\n\n`,
    options.maxChars,
    warnings,
  );

  if (descendants.length > 0) {
    appendWithBudget(chunks, len, "Descendants:\n", options.maxChars, warnings);
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
          len,
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
