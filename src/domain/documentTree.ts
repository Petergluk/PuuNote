import { PuuNode } from "../types";
import { generateId } from "../utils/id";

export const documentApi = {
  updateContent: (nodes: PuuNode[], id: string, content: string): PuuNode[] => {
    const targetNode = nodes.find((n) => n.id === id);
    if (targetNode && targetNode.content === content) return nodes;
    return nodes.map((n) => (n.id === id ? { ...n, content } : n));
  },

  addChild: (
    nodes: PuuNode[],
    parentId: string | null
  ): { nextNodes: PuuNode[]; newId: string } => {
    const newId = generateId();
    const siblings = nodes.filter((n) => n.parentId === parentId);
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
    targetId: string | null
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
    
    nextNodes.push({ id: newId, content: "", parentId, order: targetOrder + 1 });
    return { nextNodes, newId };
  },

  deleteNode: (
    nodes: PuuNode[],
    id: string
  ): { nextNodes: PuuNode[]; parentFallback: string | null } => {
    const idsToRemove = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      idsToRemove.add(curr);
      const children = nodes.filter((n) => n.parentId === curr);
      for (const c of children) queue.push(c.id);
    }
    const parentFallback = nodes.find((n) => n.id === id)?.parentId || null;
    const nextNodes = nodes.filter((n) => !idsToRemove.has(n.id));
    return { nextNodes, parentFallback };
  },

  splitNode: (
    nodes: PuuNode[],
    id: string,
    textBefore: string,
    textAfter: string
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
    position: "before" | "after" | "child"
  ): PuuNode[] => {
    const isDescendant = (childId: string, parentId: string) => {
      let curr = nodes.find((n) => n.id === childId);
      while (curr) {
        if (curr.parentId === parentId) return true;
        curr = nodes.find((n) => n.id === curr?.parentId);
      }
      return false;
    };
    
    if (sourceId === targetId || isDescendant(targetId, sourceId)) {
      return nodes;
    }
    
    const copy = nodes.map((n) => ({ ...n }));
    const targetNode = copy.find((n) => n.id === targetId);
    const sourceIdx = copy.findIndex((n) => n.id === sourceId);
    
    if (!targetNode || sourceIdx === -1) {
      return nodes;
    }
    
    const source = copy[sourceIdx];
    copy.splice(sourceIdx, 1); // remove source
    
    let newParentId = targetNode.parentId;
    if (position === "child") {
      newParentId = targetId;
      const destSiblings = copy
        .filter((n) => n.parentId === newParentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      source.parentId = newParentId;
      source.order =
        destSiblings.length > 0
          ? (destSiblings[destSiblings.length - 1].order || 0) + 1
          : 0;
      copy.push(source);
    } else {
      newParentId = targetNode.parentId;
      source.parentId = newParentId;
      const destSiblings = copy
        .filter((n) => n.parentId === newParentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const targetIdx = destSiblings.findIndex((n) => n.id === targetId);
      destSiblings.splice(
        position === "before" ? targetIdx : targetIdx + 1,
        0,
        source
      );
      // Reorder siblings
      destSiblings.forEach((n, i) => {
        n.order = i;
        const objInCopy = copy.find((x) => x.id === n.id);
        if (objInCopy) objInCopy.order = i;
        if (n.id === source.id) source.order = i;
      });
      copy.push(source);
    }
    return copy;
  },
};
