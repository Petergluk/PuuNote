import { PuuNode } from "../types";

export interface TreeIndex {
  nodeMap: Map<string, PuuNode>;
  childrenMap: Map<string | null, PuuNode[]>;
}

export const buildTreeIndex = (nodes: PuuNode[]): TreeIndex => {
  const nodeMap = new Map<string, PuuNode>();
  const childrenMap = new Map<string | null, PuuNode[]>();

  for (const n of nodes) {
    nodeMap.set(n.id, n);
    const children = childrenMap.get(n.parentId) || [];
    children.push(n);
    childrenMap.set(n.parentId, children);
  }

  return { nodeMap, childrenMap };
};

export const computeActivePath = (
  nodes: PuuNode[],
  activeId: string | null,
): string[] => {
  if (!activeId) return [];
  const { nodeMap, childrenMap } = buildTreeIndex(nodes);

  const pathUp: string[] = [];
  const visitedUp = new Set<string>();
  let currUp: string | null = activeId;
  let iterationsUp = 0;
  while (currUp && !visitedUp.has(currUp) && iterationsUp < 1000) {
    iterationsUp++;
    visitedUp.add(currUp);
    pathUp.push(currUp);
    const node = nodeMap.get(currUp);
    currUp = node?.parentId || null;
  }
  pathUp.reverse();

  const pathDown: string[] = [];
  const visitedDown = new Set<string>();
  let currDown = activeId;
  let iterationsDown = 0;
  while (currDown && !visitedDown.has(currDown) && iterationsDown < 1000) {
    iterationsDown++;
    visitedDown.add(currDown);
    const children = childrenMap.get(currDown);
    if (!children || children.length === 0) break;
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
    currDown = children[0].id;
    if (!visitedDown.has(currDown)) {
      pathDown.push(currDown);
    }
  }

  return Array.from(new Set([...pathUp, ...pathDown]));
};

export const computeDescendantIds = (
  nodes: PuuNode[],
  activeId: string | null,
): Set<string> => {
  if (!activeId) return new Set<string>();
  const { childrenMap } = buildTreeIndex(nodes);

  const ids = new Set<string>();
  const visited = new Set<string>();
  const queue = [activeId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (visited.has(curr)) continue;
    visited.add(curr);

    if (curr !== activeId) ids.add(curr);
    const children = childrenMap.get(curr);
    if (children) {
      queue.push(...children.map((n) => n.id));
    }
  }
  return ids;
};

export const getOrderedChildren = (
  nodes: PuuNode[],
  parentId: string | null,
): PuuNode[] => {
  const { childrenMap } = buildTreeIndex(nodes);
  const children = childrenMap.get(parentId) || [];
  return children.sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const getDepthFirstNodes = (
  nodes: PuuNode[],
): (PuuNode & { depth: number })[] => {
  const { childrenMap } = buildTreeIndex(nodes);
  const result: (PuuNode & { depth: number })[] = [];
  const visited = new Set<string>();

  const traverse = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
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
