import { PuuNode } from "../types";

export interface TreeIndex {
  nodeMap: Map<string, PuuNode>;
  childrenMap: Map<string | null, PuuNode[]>;
}

let _cachedNodes: PuuNode[] | null = null;
let _cachedTreeIndex: TreeIndex | null = null;

export const buildTreeIndex = (nodes: PuuNode[]): TreeIndex => {
  if (nodes === _cachedNodes && _cachedTreeIndex) {
    return _cachedTreeIndex;
  }

  const nodeMap = new Map<string, PuuNode>();
  const childrenMap = new Map<string | null, PuuNode[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    const children = childrenMap.get(n.parentId) || [];
    children.push(n);
    childrenMap.set(n.parentId, children);
  }

  const result = { nodeMap, childrenMap };
  _cachedNodes = nodes;
  _cachedTreeIndex = result;
  return result;
};

export const orderedChildrenFromIndex = (
  index: TreeIndex,
  parentId: string | null,
): PuuNode[] => {
  const children = index.childrenMap.get(parentId) || [];
  return [...children].sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const computeAncestorPathFromIndex = (
  index: TreeIndex,
  activeId: string | null,
): string[] => {
  if (!activeId) return [];

  const path: string[] = [];
  const visited = new Set<string>();
  let currentId: string | null = activeId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    path.push(currentId);
    currentId = index.nodeMap.get(currentId)?.parentId || null;
  }

  return path.reverse();
};

export const computeDescendantIdsFromIndex = (
  index: TreeIndex,
  activeId: string | null,
): Set<string> => {
  if (!activeId) return new Set<string>();
  const { childrenMap } = index;

  const ids = new Set<string>();
  const visited = new Set<string>();
  const queue = [activeId];
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    if (visited.has(curr)) continue;
    visited.add(curr);

    if (curr !== activeId) ids.add(curr);
    const children = childrenMap.get(curr);
    if (children) {
      for (const c of children) queue.push(c.id);
    }
  }
  return ids;
};

export const computeDescendantIds = (
  nodes: PuuNode[],
  activeId: string | null,
): Set<string> => {
  return computeDescendantIdsFromIndex(buildTreeIndex(nodes), activeId);
};

export const getDepthFirstNodesFromIndex = (
  index: TreeIndex,
): (PuuNode & { depth: number })[] => {
  const result: (PuuNode & { depth: number })[] = [];
  const visited = new Set<string>();

  const traverse = (parentId: string | null, depth: number) => {
    const children = orderedChildrenFromIndex(index, parentId);
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push({ ...child, depth });
      traverse(child.id, depth + 1);
    }
  };

  traverse(null, 0);
  return result;
};

export const getDepthFirstNodes = (
  nodes: PuuNode[],
): (PuuNode & { depth: number })[] => {
  return getDepthFirstNodesFromIndex(buildTreeIndex(nodes));
};
