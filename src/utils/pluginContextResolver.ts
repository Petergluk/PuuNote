import { PuuNode } from "../types";
import { buildTreeIndex, computeAncestorPathFromIndex, computeDescendantIdsFromIndex, getDepthFirstNodesFromIndex } from "./tree";

export type ContextScope = 
  | "card" 
  | "document"
  | "level_branch"
  | "level_all"
  | "branch_parent"
  | "branch_children"
  | string; // Also allows dynamic e.g., "branch_1", "branch_-2"

export function resolveNodeContext(
  nodes: PuuNode[],
  nodeId: string,
  scope: ContextScope = "card",
  template?: string
): string {
  const treeIndex = buildTreeIndex(nodes);
  const depthNodes = getDepthFirstNodesFromIndex(treeIndex);
  
  let targetNodes: PuuNode[] = [];
  
  if (scope === "document") {
    targetNodes = depthNodes; // In tree order
  } else {
    // Find node properties
    const currentNodeWithDepth = depthNodes.find(n => n.id === nodeId);
    if (!currentNodeWithDepth) return "";
    const currentNode = nodes.find(n => n.id === nodeId)!;

    if (scope === "card") {
      targetNodes = [currentNode];
    } else if (scope === "level_branch") {
      // Siblings (children of the same parent)
      targetNodes = nodes.filter(n => n.parentId === currentNode.parentId);
    } else if (scope === "level_all") {
      // All nodes at the exact same depth
      targetNodes = depthNodes.filter(n => n.depth === currentNodeWithDepth.depth);
    } else if (scope === "branch_parent") {
      // Ancestors up to root + self
      const ancestorsAndSelfIds = computeAncestorPathFromIndex(treeIndex, nodeId);
      targetNodes = ancestorsAndSelfIds.map((id: string) => nodes.find(n => n.id === id)).filter(Boolean) as PuuNode[];
    } else if (scope === "branch_children") {
      // Self + all descendants down to leaves
      const descendantIds = computeDescendantIdsFromIndex(treeIndex, nodeId);
      targetNodes = depthNodes.filter(n => n.id === nodeId || descendantIds.has(n.id));
    } else if (scope.startsWith("branch_")) {
      const levelDiff = parseInt(scope.replace("branch_", ""), 10);
      if (!isNaN(levelDiff)) {
        if (levelDiff > 0) {
          // Self + descendants up to X generations
          const maxDepth = currentNodeWithDepth.depth + levelDiff;
          const descendantIds = computeDescendantIdsFromIndex(treeIndex, nodeId);
          targetNodes = depthNodes.filter(n => 
            (n.id === nodeId || descendantIds.has(n.id)) && n.depth <= maxDepth
          );
        } else if (levelDiff < 0) {
          // Self + ancestors up to X generations up
          const minDepth = Math.max(0, currentNodeWithDepth.depth + levelDiff);
          const ancestorsAndSelfIds = computeAncestorPathFromIndex(treeIndex, nodeId);
          const allowedAncestorIds = new Set(
             ancestorsAndSelfIds.filter(id => {
               const nodeDepth = depthNodes.find(d => d.id === id)?.depth ?? 0;
               return nodeDepth >= minDepth;
             })
          );
          targetNodes = depthNodes.filter(n => allowedAncestorIds.has(n.id));
        } else {
          targetNodes = [currentNode];
        }
      } else {
        targetNodes = [currentNode]; // fallback
      }
    // Backward compatibility fallbacks
    } else if (scope === "branch") {
      const ancestorsAndSelfIds = computeAncestorPathFromIndex(treeIndex, nodeId);
      targetNodes = ancestorsAndSelfIds.map((id: string) => nodes.find(n => n.id === id)).filter(Boolean) as PuuNode[];
    } else if (scope === "level") {
      targetNodes = nodes.filter(n => n.parentId === currentNode.parentId);
    } else if (scope === "descendants") {
      const descendantIds = computeDescendantIdsFromIndex(treeIndex, nodeId);
      targetNodes = depthNodes.filter(n => n.id === nodeId || descendantIds.has(n.id));
    }
  }

  // Compile context text
  const contextText = targetNodes.map(n => n.content || "_(Empty Card)_").join("\n\n---\n\n");

  if (template) {
    return template.replace(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g, (fullMatch, matchPattern) => {
       if (matchPattern === 'context' || matchPattern === scope) return contextText;
       
       const currentNode = nodes.find(n => n.id === nodeId);
       if (currentNode) {
           if (matchPattern === 'content') return currentNode.content || "";
           if (currentNode.metadata && matchPattern in currentNode.metadata) {
               return String(currentNode.metadata[matchPattern] || "");
           }
       }
       return fullMatch;
    });
  }

  return contextText;
}
