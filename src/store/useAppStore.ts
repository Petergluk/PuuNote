import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { PuuNode, PuuDocument } from "../types";
import { exportNodesToMarkdown } from "../utils/markdownParser";
import { documentApi } from "../domain/documentTree";

interface AppState {
  documents: PuuDocument[];
  activeFileId: string | null;
  nodes: PuuNode[];
  past: PuuNode[][];
  future: PuuNode[][];
  activeId: string | null;
  selectedIds: string[];
  editingId: string | null;
  draggedId: string | null;
  fullScreenId: string | null;
  fileMenuOpen: boolean;
  theme: string;
  cardsCollapsed: boolean;
  timelineOpen: boolean;
  colWidth: number;
  commandPaletteOpen: boolean;
  uiMode: "normal" | "fullscreen" | "zen";
  confirmDialog: {
    isOpen: boolean;
    message: string;
    onConfirm?: () => void | Promise<void>;
  };
}

interface AppActions {
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  setCardsCollapsed: (col: boolean) => void;
  toggleCardsCollapsed: () => void;
  setTimelineOpen: (open: boolean) => void;
  setColWidth: (width: number) => void;
  setActiveId: (id: string | null) => void;
  toggleSelection: (id: string, isShift?: boolean) => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;
  setDraggedId: (id: string | null) => void;
  setFullScreenId: (id: string | null) => void;
  setUiMode: (mode: "normal" | "fullscreen" | "zen") => void;
  setFileMenuOpen: (open: boolean) => void;
  openConfirm: (message: string, onConfirm: () => void | Promise<void>) => void;
  closeConfirm: () => void;
  setNodesRaw: (nodes: PuuNode[]) => void;
  setNodes: (updater: PuuNode[] | ((prev: PuuNode[]) => PuuNode[])) => void;
  undo: () => void;
  redo: () => void;
  exportToMarkdown: () => void;
  updateContent: (id: string, content: string) => void;
  addChild: (parentId: string | null) => void;
  addSibling: (siblingId: string | null) => void;
  deleteNode: (id: string) => void;
  splitNode: (id: string, textBefore: string, textAfter: string) => void;
  mergeNodes: (masterId: string, nodeIdsToMerge: string[]) => void;
  moveNode: (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ) => void;
}

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    documents: [],
    activeFileId: null,
    nodes: [],
    past: [],
    future: [],
    activeId: null,
    selectedIds: [],
    editingId: null,
    draggedId: null,
    fullScreenId: null,
    fileMenuOpen: false,
    theme: "light",
    cardsCollapsed: false,
    timelineOpen: false,
    colWidth: 320,
    commandPaletteOpen: false,
    uiMode: "normal",
    confirmDialog: { isOpen: false, message: "" },

    openConfirm: (message, onConfirm) =>
      set({
        confirmDialog: { isOpen: true, message, onConfirm },
      }),
    closeConfirm: () =>
      set((state) => ({
        confirmDialog: { ...state.confirmDialog, isOpen: false },
      })),

    setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    setTheme: (theme) => set({ theme }),
    toggleTheme: () =>
      set((s) => {
        const themes = ["light", "dark", "blue", "brown"];
        const currentIndex = themes.indexOf(s.theme);
        const nextTheme =
          currentIndex === -1
            ? "light"
            : themes[(currentIndex + 1) % themes.length];
        return { theme: nextTheme };
      }),
    setCardsCollapsed: (cardsCollapsed) => set({ cardsCollapsed }),
    toggleCardsCollapsed: () =>
      set((s) => ({ cardsCollapsed: !s.cardsCollapsed })),
    setTimelineOpen: (timelineOpen) => set({ timelineOpen }),
    setColWidth: (colWidth) => set({ colWidth }),
    setActiveId: (activeId) => set({ activeId, selectedIds: activeId ? [activeId] : [] }),
    toggleSelection: (id, isShift) => set((state) => {
      const { selectedIds, activeId } = state;
      if (isShift && activeId) {
        // We ideally want the depth-first ordered nodes here, but doing a simpler range or just falling back to push
        // Let's just do simple toggle for now and improve later if needed, but we can import tree logic if needed.
        // For now, toggle behavior:
      }
      
      if (selectedIds.includes(id)) {
        return { selectedIds: selectedIds.filter(x => x !== id) };
      } else {
        return { selectedIds: [...selectedIds, id] };
      }
    }),
    clearSelection: () => set({ selectedIds: [] }),
    setEditingId: (editingId) => set({ editingId }),
    setDraggedId: (draggedId) => set({ draggedId }),
    setFullScreenId: (fullScreenId) => set({ fullScreenId }),
    setUiMode: (uiMode) => set({ uiMode }),
    setFileMenuOpen: (fileMenuOpen) => set({ fileMenuOpen }),

    setNodesRaw: (nodes) => {
      const seen = new Set<string>();
      const uniqueNodes = nodes.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });
      set({ nodes: uniqueNodes, past: [], future: [] });
    },
    setNodes: (updater) => {
      const state = get();
      const currentNodes = state.nodes;
      let nextNodes =
        typeof updater === "function" ? updater(currentNodes) : updater;

      if (currentNodes === nextNodes) return;

      const seen = new Set<string>();
      nextNodes = nextNodes.filter((n) => {
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      });

      if (
        currentNodes.length === nextNodes.length &&
        currentNodes.every((n, i) => n === nextNodes[i])
      )
        return;

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
      try {
        const md = exportNodesToMarkdown(nodes);
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.md`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      } catch (err) {
        console.error("Failed to export markdown", err);
      }
    },

      updateContent: (id, content) => {
        get().setNodes((prev) => documentApi.updateContent(prev, id, content));
      },

      addChild: (parentId) => {
        let newIdValue: string | null = null;
        get().setNodes((prev) => {
          const { nextNodes, newId } = documentApi.addChild(prev, parentId);
          newIdValue = newId;
          return nextNodes;
        });
        if (newIdValue) set({ activeId: newIdValue, editingId: newIdValue });
      },

      addSibling: (targetId) => {
        let newIdValue: string | null = null;
        get().setNodes((prev) => {
          const { nextNodes, newId } = documentApi.addSibling(prev, targetId);
          newIdValue = newId;
          return nextNodes;
        });
        if (newIdValue) set({ activeId: newIdValue, editingId: newIdValue });
      },

      deleteNode: (id) => {
        let parentFallbackValue: string | null = null;
        get().setNodes((prev) => {
          const { nextNodes, parentFallback } = documentApi.deleteNode(prev, id);
          parentFallbackValue = parentFallback;
          return nextNodes;
        });
        const activeId = get().activeId;
        if (activeId === id) set({ activeId: parentFallbackValue });
      },

      splitNode: (id, textBefore, textAfter) => {
        let newIdValue: string | null = null;
        get().setNodes((prev) => {
          const { nextNodes, newId } = documentApi.splitNode(prev, id, textBefore, textAfter);
          newIdValue = newId;
          return nextNodes;
        });
        if (newIdValue) set({ activeId: newIdValue, selectedIds: [newIdValue], editingId: newIdValue });
      },

      mergeNodes: (masterId, nodeIdsToMerge) => {
        get().setNodes((prev) => documentApi.mergeNodes(prev, masterId, nodeIdsToMerge));
        set({ activeId: masterId, selectedIds: [masterId], editingId: null });
      },

      moveNode: (sourceId, targetId, position) => {
        get().setNodes((prev) => documentApi.moveNode(prev, sourceId, targetId, position));
        set({ activeId: sourceId, draggedId: null });
      },
  })),
);
