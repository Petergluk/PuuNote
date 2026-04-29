import type { StoreApi } from "zustand";
import type { PuuDocument, PuuNode } from "../types";

export interface UiSlice {
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
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  setCardsCollapsed: (collapsed: boolean) => void;
  toggleCardsCollapsed: () => void;
  setTimelineOpen: (open: boolean) => void;
  setColWidth: (width: number) => void;
  setUiMode: (mode: "normal" | "fullscreen" | "zen") => void;
  setFileMenuOpen: (open: boolean) => void;
  openConfirm: (message: string, onConfirm: () => void | Promise<void>) => void;
  closeConfirm: () => void;
}

export interface SelectionSlice {
  activeId: string | null;
  selectedIds: string[];
  editingId: string | null;
  draggedId: string | null;
  fullScreenId: string | null;
  setActiveId: (id: string | null) => void;
  toggleSelection: (id: string, isShift?: boolean) => void;
  clearSelection: () => void;
  setEditingId: (id: string | null) => void;
  setDraggedId: (id: string | null) => void;
  setFullScreenId: (id: string | null) => void;
}

export interface HistorySlice {
  nodes: PuuNode[];
  past: PuuNode[][];
  future: PuuNode[][];
  setNodesRaw: (nodes: PuuNode[]) => void;
  setNodes: (updater: PuuNode[] | ((prev: PuuNode[]) => PuuNode[])) => void;
  undo: () => void;
  redo: () => void;
}

export interface DocumentSlice {
  documents: PuuDocument[];
  activeFileId: string | null;
  exportToMarkdown: () => void;
  exportToJson: () => void;
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

export type AppStore = UiSlice & SelectionSlice & HistorySlice & DocumentSlice;
export type AppStoreSet = StoreApi<AppStore>["setState"];
export type AppStoreGet = StoreApi<AppStore>["getState"];
export type AppSlice<T> = (set: AppStoreSet, get: AppStoreGet) => T;
