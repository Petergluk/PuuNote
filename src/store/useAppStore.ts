import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PuuNode, PuuDocument } from "../types";
import { generateId } from "../utils/id";
import { exportNodesToMarkdown } from "../utils/markdownParser";

interface AppState {
  documents: PuuDocument[];
  activeFileId: string | null;
  nodes: PuuNode[];
  past: PuuNode[][];
  future: PuuNode[][];
  activeId: string | null;
  editingId: string | null;
  draggedId: string | null;
  fullScreenId: string | null;
  fileMenuOpen: boolean;
  theme: string;
  cardsCollapsed: boolean;
  timelineOpen: boolean;
  colWidth: number;
}

interface AppActions {
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  setCardsCollapsed: (col: boolean) => void;
  toggleCardsCollapsed: () => void;
  setTimelineOpen: (open: boolean) => void;
  setColWidth: (width: number) => void;
  setActiveId: (id: string | null) => void;
  setEditingId: (id: string | null) => void;
  setDraggedId: (id: string | null) => void;
  setFullScreenId: (id: string | null) => void;
  setFileMenuOpen: (open: boolean) => void;
  setNodesRaw: (nodes: PuuNode[]) => void;
  setNodes: (updater: PuuNode[] | ((prev: PuuNode[]) => PuuNode[])) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  exportToMarkdown: () => void;
  updateContent: (id: string, content: string) => void;
  addChild: (parentId: string | null) => void;
  addSibling: (siblingId: string | null) => void;
  deleteNode: (id: string) => void;
  splitNode: (id: string, textBefore: string, textAfter: string) => void;
  moveNode: (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ) => void;
}

export const computeActivePath = (
  nodes: PuuNode[],
  activeId: string | null,
): string[] => {
  if (!activeId) return [];
  const pathUp = [];
  let currUp: string | null = activeId;
  while (currUp) {
    pathUp.push(currUp);
    const node = nodes.find((n) => n.id === currUp);
    currUp = node?.parentId || null;
  }
  pathUp.reverse();
  const pathDown = [];
  let currDown = activeId;
  while (true) {
    const children = nodes.filter((n) => n.parentId === currDown);
    if (children.length === 0) break;
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
  const ids = new Set<string>();
  const queue = [activeId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr !== activeId) ids.add(curr);
    const children = nodes.filter((n) => n.parentId === curr);
    queue.push(...children.map((n) => n.id));
  }
  return ids;
};

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    documents: [],
    activeFileId: null,
    nodes: [],
    past: [],
    future: [],
    activeId: null,
    editingId: null,
    draggedId: null,
    fullScreenId: null,
    fileMenuOpen: false,
    theme: "light",
    cardsCollapsed: false,
    timelineOpen: false,
    colWidth: 320,

    setTheme: (theme) => set({ theme }),
    toggleTheme: () =>
      set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
    setCardsCollapsed: (cardsCollapsed) => set({ cardsCollapsed }),
    toggleCardsCollapsed: () =>
      set((s) => ({ cardsCollapsed: !s.cardsCollapsed })),
    setTimelineOpen: (timelineOpen) => set({ timelineOpen }),
    setColWidth: (colWidth) => set({ colWidth }),
    setActiveId: (activeId) => set({ activeId }),
    setEditingId: (editingId) => set({ editingId }),
    setDraggedId: (draggedId) => set({ draggedId }),
    setFullScreenId: (fullScreenId) => set({ fullScreenId }),
    setFileMenuOpen: (fileMenuOpen) => set({ fileMenuOpen }),

    setNodesRaw: (nodes) => set({ nodes, past: [], future: [] }),
    setNodes: (updater) => {
      const state = get();
      const currentNodes = state.nodes;
      const nextNodes =
        typeof updater === "function" ? updater(currentNodes) : updater;
      if (currentNodes === nextNodes) return;
      set({
        nodes: nextNodes,
        past: [...state.past, currentNodes].slice(-50),
        future: [],
      });
    },

    undo: () => {
      const { past, nodes, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        nodes: previous,
        future: [nodes, ...future],
      });
    },

    redo: () => {
      const { past, nodes, future } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({ past: [...past, nodes], nodes: next, future: future.slice(1) });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,

    exportToMarkdown: () => {
      const { nodes } = get();
      let filename = "puunote-export";
      if (nodes.length > 0) {
        const rootNodes = nodes.filter((n: PuuNode) => !n.parentId);
        if (rootNodes.length > 0) {
          const firstNodeContent = rootNodes[0].content;
          const match = firstNodeContent.match(/^#{1,6}\s+(.*)$/m);
          if (match && match[1]) {
            filename = match[1]
              .trim()
              .replace(/[^a-zA-Z0-9_\-\u0400-\u04FF\s]/g, "")
              .trim()
              .replace(/\s+/g, "-");
          } else {
            const words = firstNodeContent
              .split("\n")[0]
              .trim()
              .replace(/[^a-zA-Z0-9_\-\u0400-\u04FF\s]/g, "")
              .trim()
              .split(/\s+/)
              .slice(0, 3)
              .join("-");
            if (words) filename = words;
          }
        }
      }
      filename = filename || "puunote-export";
      const md = exportNodesToMarkdown(nodes);
      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },

    updateContent: (id, content) => {
      get().setNodes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, content } : n)),
      );
    },

    addChild: (parentId) => {
      const newId = generateId();
      get().setNodes((prev) => {
        const siblings = prev.filter((n) => n.parentId === parentId);
        const maxOrder =
          siblings.length > 0
            ? Math.max(...siblings.map((n) => n.order || 0))
            : -1;
        return [
          ...prev,
          { id: newId, content: "", parentId, order: maxOrder + 1 },
        ];
      });
      set({ activeId: newId, editingId: newId });
    },

    addSibling: (targetId) => {
      const newId = generateId();
      get().setNodes((prev) => {
        const targetNode = prev.find((n) => n.id === targetId);
        if (!targetNode) return prev;
        const parentId = targetNode.parentId;
        const targetOrder = targetNode.order || 0;
        const next = prev.map((n) => {
          if (n.parentId === parentId && (n.order || 0) > targetOrder) {
            return { ...n, order: (n.order || 0) + 1 };
          }
          return n;
        });
        return [
          ...next,
          { id: newId, content: "", parentId, order: targetOrder + 1 },
        ];
      });
      set({ activeId: newId, editingId: newId });
    },

    deleteNode: (id) => {
      let parentFallback: string | null = null;
      get().setNodes((prev) => {
        const idsToRemove = new Set<string>();
        const queue = [id];
        while (queue.length > 0) {
          const curr = queue.shift()!;
          idsToRemove.add(curr);
          const children = prev.filter((n) => n.parentId === curr);
          for (const c of children) queue.push(c.id);
        }
        parentFallback = prev.find((n) => n.id === id)?.parentId || null;
        return prev.filter((n) => !idsToRemove.has(n.id));
      });
      const activeId = get().activeId;
      if (activeId === id) set({ activeId: parentFallback });
    },

    splitNode: (id, textBefore, textAfter) => {
      const newId = generateId();
      get().setNodes((prev) => {
        const targetNode = prev.find((n) => n.id === id);
        if (!targetNode) return prev;
        const next = prev.map((n) => {
          if (n.id === id) return { ...n, content: textBefore };
          if (
            n.parentId === targetNode.parentId &&
            (n.order || 0) > (targetNode.order || 0)
          ) {
            return { ...n, order: (n.order || 0) + 1 };
          }
          return n;
        });
        return [
          ...next,
          {
            id: newId,
            content: textAfter,
            parentId: targetNode.parentId,
            order: (targetNode.order || 0) + 1,
          },
        ];
      });
      set({ activeId: newId, editingId: newId });
    },

    moveNode: (sourceId, targetId, position) => {
      get().setNodes((prev) => {
        const isDescendant = (childId: string, parentId: string) => {
          let curr = prev.find((n) => n.id === childId);
          while (curr) {
            if (curr.parentId === parentId) return true;
            curr = prev.find((n) => n.id === curr.parentId);
          }
          return false;
        };
        if (sourceId === targetId || isDescendant(targetId, sourceId)) {
          set({ draggedId: null });
          return prev;
        }
        const copy = prev.map((n) => ({ ...n }));
        const targetNode = copy.find((n) => n.id === targetId);
        const sourceIdx = copy.findIndex((n) => n.id === sourceId);
        if (!targetNode || sourceIdx === -1) {
          set({ draggedId: null });
          return prev;
        }
        const source = copy[sourceIdx];
        copy.splice(sourceIdx, 1);
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
            source,
          );
          destSiblings.forEach((n, i) => {
            n.order = i;
            const objInCopy = copy.find((x) => x.id === n.id);
            if (objInCopy) objInCopy.order = i;
            if (n.id === source.id) source.order = i;
          });
          copy.push(source);
        }
        return copy;
      });
      set({ activeId: sourceId, draggedId: null });
    },
  })),
);
