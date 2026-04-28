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

export const getAncestors = (
  nodes: PuuNode[],
  startId: string | null,
): string[] => {
  if (!startId) return [];
  const { nodeMap } = buildTreeIndex(nodes);
  const path: string[] = [];
  let curr: string | null = startId;

  while (curr) {
    path.push(curr);
    const node = nodeMap.get(curr);
    curr = node?.parentId || null;
  }
  return path.reverse();
};

export const computeActivePath = (
  nodes: PuuNode[],
  activeId: string | null,
): string[] => {
  if (!activeId) return [];
  const { nodeMap, childrenMap } = buildTreeIndex(nodes);

  const pathUp: string[] = [];
  let currUp: string | null = activeId;
  while (currUp) {
    pathUp.push(currUp);
    const node = nodeMap.get(currUp);
    currUp = node?.parentId || null;
  }
  pathUp.reverse();

  const pathDown: string[] = [];
  let currDown = activeId;
  while (true) {
    const children = childrenMap.get(currDown);
    if (!children || children.length === 0) break;
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
    currDown = children[0].id;
    pathDown.push(currDown);
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
  const queue = [activeId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
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

  const traverse = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const child of children) {
      result.push({ ...child, depth });
      traverse(child.id, depth + 1);
    }
  };

  traverse(null, 0);
  return result;
};
