import { PuuNode } from "../types";
import { getDepthFirstNodes, buildTreeIndex } from "../utils/tree";

export interface ContextExtractionResult {
  node: PuuNode;
  ancestors: PuuNode[];
  descendants: PuuNode[];
  textContext: string;
}

/**
 * Provides a text representation of a node and its descendants for LLM context.
 */
export function buildContextForLLM(
  nodes: PuuNode[],
  targetNodeId: string,
  maxLevels: number = -1
): ContextExtractionResult | null {
  const { nodeMap, childrenMap } = buildTreeIndex(nodes);
  const targetNode = nodeMap.get(targetNodeId);

  if (!targetNode) return null;

  // 1. Get ancestors (Root to target)
  const ancestors: PuuNode[] = [];
  let curr = targetNode.parentId;
  while (curr) {
    const parent = nodeMap.get(curr);
    if (parent) {
      ancestors.unshift(parent);
      curr = parent.parentId;
    } else {
      break;
    }
  }

  // 2. Get descendants
  const descendants: PuuNode[] = [];
  const stack = [{ id: targetNodeId, depth: 0 }];

  while (stack.length > 0) {
    const { id, depth } = stack.pop()!;
    if (id !== targetNodeId) {
      const n = nodeMap.get(id);
      if (n) descendants.push(n);
    }

    if (maxLevels === -1 || depth < maxLevels) {
      const children = childrenMap.get(id) || [];
      // Push in reverse so they pop in order
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push({ id: children[i].id, depth: depth + 1 });
      }
    }
  }

  // 3. Serialize as Markdown outline
  let textContext = `Context for Node [${targetNodeId}]:\n\n`;
  if (ancestors.length > 0) {
    textContext += "Ancestors path:\n";
    ancestors.forEach((anc, i) => {
      textContext += `${" ".repeat(i * 2)}- ${anc.content.split("\n")[0]}\n`;
    });
    textContext += "\n";
  }

  textContext += "Target Node:\n";
  textContext += `[${targetNode.id}] ${targetNode.content}\n\n`;

  if (descendants.length > 0) {
    textContext += "Descendants:\n";
    // Quick and dirty depth for string representation
    const descSet = new Set(descendants.map(d => d.id));
    const allDfNodes = getDepthFirstNodes(nodes).filter(df => descSet.has(df.id));
    
    // Normalize depth relative to target
    const targetDepthInfo = getDepthFirstNodes(nodes).find(n => n.id === targetNodeId);
    const baseDepth = targetDepthInfo?.depth || 0;

    allDfNodes.forEach((n) => {
      const relDepth = n.depth - baseDepth;
      if (relDepth > 0) {
        textContext += `${" ".repeat((relDepth - 1) * 2)}- [${n.id}] ${n.content.split("\n")[0]}\n`;
      }
    });
  }

  return {
    node: targetNode,
    ancestors,
    descendants,
    textContext,
  };
}
