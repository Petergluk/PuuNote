import { PuuNode } from "../types";
import { generateId } from "../utils/id";
import {
  buildTreeIndex,
  computeDescendantIdsFromIndex,
  getDepthFirstNodesFromIndex,
  orderedChildrenFromIndex,
} from "../utils/tree";

export interface MergeValidationResult {
  ok: boolean;
  orderedIds: string[];
  reason?: string;
}

const normalizeSiblingOrder = (
  nodes: PuuNode[],
  parentId: string | null,
): PuuNode[] => {
  const index = buildTreeIndex(nodes);
  const siblings = orderedChildrenFromIndex(index, parentId);
  const idToOrder = new Map(siblings.map((s, i) => [s.id, i]));
  return nodes.map((n) =>
    idToOrder.has(n.id) ? { ...n, order: idToOrder.get(n.id)! } : n,
  );
};

export const canMergeNodes = (
  nodes: PuuNode[],
  masterId: string,
  nodeIdsToMerge: string[],
): MergeValidationResult => {
  const uniqueIds = Array.from(new Set([masterId, ...nodeIdsToMerge]));
  if (uniqueIds.length < 2) {
    return {
      ok: false,
      orderedIds: uniqueIds,
      reason: "Select at least two cards to merge.",
    };
  }

  const index = buildTreeIndex(nodes);
  const mergeNodes = uniqueIds.map((id) => index.nodeMap.get(id));
  if (mergeNodes.some((node) => !node)) {
    return {
      ok: false,
      orderedIds: uniqueIds,
      reason: "One or more selected cards no longer exist.",
    };
  }

  const parentId = mergeNodes[0]!.parentId;
  if (mergeNodes.some((node) => node!.parentId !== parentId)) {
    return {
      ok: false,
      orderedIds: uniqueIds,
      reason: "Only sibling cards can be merged.",
    };
  }

  for (const id of uniqueIds) {
    const descendants = computeDescendantIdsFromIndex(index, id);
    if (uniqueIds.some((selectedId) => descendants.has(selectedId))) {
      return {
        ok: false,
        orderedIds: uniqueIds,
        reason: "Ancestor and descendant cards cannot be merged together.",
      };
    }
  }

  const depthFirstIds = getDepthFirstNodesFromIndex(index).map(
    (node) => node.id,
  );
  const orderedIds = uniqueIds.sort(
    (a, b) => depthFirstIds.indexOf(a) - depthFirstIds.indexOf(b),
  );

  return { ok: true, orderedIds };
};

export const documentApi = {
  updateContent: (nodes: PuuNode[], id: string, content: string): PuuNode[] => {
    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode && targetNode.content === content) return nodes;
    return nodes.map((n) => (n.id === id ? { ...n, content } : n));
  },

  addChild: (
    nodes: PuuNode[],
    parentId: string | null,
  ): { nextNodes: PuuNode[]; newId: string } => {
    const newId = generateId();
    const index = buildTreeIndex(nodes);
    const siblings = orderedChildrenFromIndex(index, parentId);
    const maxOrder =
      siblings.length > 0 ? Math.max(...siblings.map((n) => n.order || 0)) : -1;

    const nextNodes = [
      ...nodes,
      { id: newId, content: "", parentId, order: maxOrder + 1 },
    ];
    return { nextNodes, newId };
  },

  addSibling: (
    nodes: PuuNode[],
    targetId: string | null,
  ): { nextNodes: PuuNode[]; newId: string | null } => {
    const newId = generateId();
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode) return { nextNodes: nodes, newId: null };

    const parentId = targetNode.parentId;
    const targetOrder = targetNode.order || 0;

    const nextNodes = nodes.map((n) => {
      if (n.parentId === parentId && (n.order || 0) > targetOrder) {
        return { ...n, order: (n.order || 0) + 1 };
      }
      return n;
    });

    nextNodes.push({
      id: newId,
      content: "",
      parentId,
      order: targetOrder + 1,
    });
    return { nextNodes, newId };
  },

  deleteNode: (
    nodes: PuuNode[],
    id: string,
  ): { nextNodes: PuuNode[]; parentFallback: string | null } => {
    const index = buildTreeIndex(nodes);
    const idsToRemove = new Set<string>();
    const queue = [id];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      idsToRemove.add(curr);
      const children = index.childrenMap.get(curr) || [];
      for (const c of children) queue.push(c.id);
    }
    const parentFallback = index.nodeMap.get(id)?.parentId ?? null;
    const nextNodes = nodes.filter((n) => !idsToRemove.has(n.id));
    return { nextNodes, parentFallback };
  },

  deleteNodes: (
    nodes: PuuNode[],
    ids: string[],
  ): { nextNodes: PuuNode[]; parentFallback: string | null } => {
    const index = buildTreeIndex(nodes);
    const idsToRemove = new Set<string>();
    const queue = [...ids];
    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      if (!idsToRemove.has(curr)) {
        idsToRemove.add(curr);
        const children = index.childrenMap.get(curr) || [];
        for (const c of children) queue.push(c.id);
      }
    }
    const firstRemovedNode = index.nodeMap.get(ids[0]);
    const parentFallback = firstRemovedNode?.parentId ?? null;
    const nextNodes = nodes.filter((n) => !idsToRemove.has(n.id));
    return { nextNodes, parentFallback };
  },

  deleteNodesPromoteChildren: (
    nodes: PuuNode[],
    ids: string[],
  ): { nextNodes: PuuNode[]; parentFallback: string | null } => {
    const idsToRemove = new Set(ids);
    if (idsToRemove.size === 0) {
      return { nextNodes: nodes, parentFallback: null };
    }

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const firstRemoved = ids.find((id) => nodeMap.has(id)) || null;
    if (!firstRemoved) {
      return { nextNodes: nodes, parentFallback: null };
    }

    const nearestKeptParent = (node: PuuNode) => {
      let parentId = node.parentId;
      while (parentId && idsToRemove.has(parentId)) {
        parentId = nodeMap.get(parentId)?.parentId ?? null;
      }
      return parentId ?? null;
    };

    const orderKeyFor = (node: PuuNode, originalIndex: number): number[] => {
      const pathOrders = [node.order ?? originalIndex];
      let parentId = node.parentId;
      while (parentId && idsToRemove.has(parentId)) {
        const parent = nodeMap.get(parentId);
        pathOrders.unshift(parent?.order ?? 0);
        parentId = parent?.parentId ?? null;
      }
      return pathOrders;
    };

    const kept = nodes
      .map((node, originalIndex) => ({ node, originalIndex }))
      .filter(({ node }) => !idsToRemove.has(node.id))
      .map(({ node, originalIndex }) => ({
        node: {
          ...node,
          parentId: nearestKeptParent(node),
        },
        orderKey: orderKeyFor(node, originalIndex),
        originalIndex,
      }));

    const orderById = new Map<string, number>();
    const groups = new Map<string, typeof kept>();
    kept.forEach((entry) => {
      const key = entry.node.parentId ?? "__root__";
      groups.set(key, [...(groups.get(key) || []), entry]);
    });

    groups.forEach((siblings) => {
      siblings
        .sort((a, b) => {
          const len = Math.max(a.orderKey.length, b.orderKey.length);
          for (let i = 0; i < len; i++) {
            const valA = a.orderKey[i] ?? -1;
            const valB = b.orderKey[i] ?? -1;
            if (valA !== valB) return valA - valB;
          }
          return a.originalIndex - b.originalIndex;
        })
        .forEach((entry, index) => orderById.set(entry.node.id, index));
    });

    const firstRemovedNode = nodeMap.get(firstRemoved);
    const parentFallback = firstRemovedNode
      ? nearestKeptParent(firstRemovedNode)
      : null;

    return {
      nextNodes: kept.map((entry) => ({
        ...entry.node,
        order: orderById.get(entry.node.id) ?? entry.node.order ?? 0,
      })),
      parentFallback,
    };
  },

  splitNode: (
    nodes: PuuNode[],
    id: string,
    textBefore: string,
    textAfter: string,
  ): { nextNodes: PuuNode[]; newId: string | null } => {
    const newId = generateId();
    const targetNode = nodes.find((n) => n.id === id);
    if (!targetNode) return { nextNodes: nodes, newId: null };

    const next = nodes.map((n) => {
      if (n.id === id) return { ...n, content: textBefore };
      if (
        n.parentId === targetNode.parentId &&
        (n.order || 0) > (targetNode.order || 0)
      ) {
        return { ...n, order: (n.order || 0) + 1 };
      }
      return n;
    });

    const nextNodes = [
      ...next,
      {
        id: newId,
        content: textAfter,
        parentId: targetNode.parentId,
        order: (targetNode.order || 0) + 1,
      },
    ];
    return { nextNodes, newId };
  },

  moveNode: (
    nodes: PuuNode[],
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ): PuuNode[] => {
    return documentApi.moveNodes(nodes, [sourceId], targetId, position);
  },

  moveNodes: (
    nodes: PuuNode[],
    sourceIds: string[],
    targetId: string,
    position: "before" | "after" | "child",
  ): PuuNode[] => {
    const idsToMove = Array.from(new Set(sourceIds));
    if (idsToMove.length === 0 || idsToMove.includes(targetId)) {
      return nodes;
    }

    const copy = nodes.map((n) => ({ ...n }));
    const treeIdx = buildTreeIndex(nodes);
    const targetNode = copy.find((n) => n.id === targetId);
    const movingNodes = idsToMove
      .map((sourceId) => copy.find((n) => n.id === sourceId))
      .filter((node): node is PuuNode => Boolean(node))
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    if (!targetNode || movingNodes.length !== idsToMove.length) {
      return nodes;
    }

    // Guard: target is a descendant of one of the moved nodes (O(d) per check using nodeMap)
    const isDescendant = (childId: string, ancestorId: string): boolean => {
      let curr = treeIdx.nodeMap.get(childId);
      while (curr) {
        if (curr.parentId === ancestorId) return true;
        curr = curr.parentId ? treeIdx.nodeMap.get(curr.parentId) : undefined;
      }
      return false;
    };

    if (idsToMove.some((sourceId) => isDescendant(targetId, sourceId))) {
      return nodes;
    }

    const originalParentId = movingNodes[0].parentId;
    if (movingNodes.some((node) => node.parentId !== originalParentId)) {
      return nodes;
    }

    let withoutMoving = copy.filter((node) => !idsToMove.includes(node.id));

    let newParentId = targetNode.parentId;
    if (position === "child") {
      newParentId = targetId;
      const destSiblings = orderedChildrenFromIndex(
        buildTreeIndex(withoutMoving),
        newParentId,
      );
      let nextOrder =
        destSiblings.length > 0
          ? (destSiblings[destSiblings.length - 1].order || 0) + 1
          : 0;
      for (const source of movingNodes) {
        source.parentId = newParentId;
        source.order = nextOrder++;
      }
      withoutMoving = [...withoutMoving, ...movingNodes];
    } else {
      newParentId = targetNode.parentId;
      const destSiblings = orderedChildrenFromIndex(
        buildTreeIndex(withoutMoving),
        newParentId,
      );
      const targetIdx = destSiblings.findIndex((n) => n.id === targetId);
      if (targetIdx === -1) return nodes;

      movingNodes.forEach((source) => {
        source.parentId = newParentId;
      });

      const insertIdx = position === "before" ? targetIdx : targetIdx + 1;
      const newSiblings = [
        ...destSiblings.slice(0, insertIdx),
        ...movingNodes,
        ...destSiblings.slice(insertIdx)
      ];

      newSiblings.forEach((n, i) => {
        n.order = i;
        const objInCopy = withoutMoving.find((x) => x.id === n.id);
        if (objInCopy) objInCopy.order = i;
      });

      withoutMoving = [...withoutMoving, ...movingNodes];
    }
    withoutMoving = normalizeSiblingOrder(withoutMoving, originalParentId);
    withoutMoving = normalizeSiblingOrder(withoutMoving, newParentId);
    return withoutMoving;
  },

  mergeNodes: (
    nodes: PuuNode[],
    masterId: string,
    nodeIdsToMerge: string[],
  ): PuuNode[] => {
    const validation = canMergeNodes(nodes, masterId, nodeIdsToMerge);
    if (!validation.ok) return nodes;

    let nextNodes = nodes.map((n) => ({ ...n }));
    const masterNode = nextNodes.find((n) => n.id === masterId);
    if (!masterNode) return nodes;

    const idsToMerge = validation.orderedIds.filter((id) => id !== masterId);
    if (idsToMerge.length === 0) return nodes;

    const orderedNodes = validation.orderedIds
      .map((id) => nextNodes.find((n) => n.id === id))
      .filter((node): node is PuuNode => Boolean(node));
    const combinedContent = orderedNodes
      .map((node) => node.content.trim())
      .filter(Boolean)
      .join("\n\n");
    const allChildrenToMove: PuuNode[] = [];

    for (const id of idsToMerge) {
      const nodeToMerge = nextNodes.find((n) => n.id === id);
      if (nodeToMerge) {
        const children = nextNodes.filter((n) => n.parentId === id);
        allChildrenToMove.push(...children);
      }
    }

    let maxOrder = -1;
    const masterChildren = nextNodes.filter((n) => n.parentId === masterId);
    if (masterChildren.length > 0) {
      maxOrder = Math.max(...masterChildren.map((n) => n.order || 0));
    }

    allChildrenToMove.forEach((child) => {
      child.parentId = masterId;
      maxOrder++;
      child.order = maxOrder;
    });

    masterNode.content = combinedContent;

    const idsToRemove = new Set(idsToMerge);
    nextNodes = nextNodes.filter((n) => !idsToRemove.has(n.id));
    nextNodes = normalizeSiblingOrder(nextNodes, masterNode.parentId);
    nextNodes = normalizeSiblingOrder(nextNodes, masterId);

    return nextNodes;
  },
};
