import type { StoreApi } from "zustand";
import type { PuuDocument, PuuNode } from "../types";

export type InactiveBranchesMode = "dim" | "hide";
export type PasteSplitMode = "separator" | "paragraph";
export type EditorEnterMode = "enterNewline" | "enterCard";
export type SaveStatus = "saved" | "saving" | "unsaved" | "error";
export type FocusModeScope = "single" | "column" | "branchLevel";
export type EditorMode = "markdown" | "visual";

export interface UiSlice {
  fileMenuOpen: boolean;
  theme: string;
  cardsCollapsed: boolean;
  inactiveBranchesMode: InactiveBranchesMode;
  editorEnterMode: EditorEnterMode;
  pasteSplitMode: PasteSplitMode;
  focusModeScope: FocusModeScope;
  editorMode: EditorMode;
  settingsOpen: boolean;
  timelineOpen: boolean;
  colWidth: number;
  commandPaletteOpen: boolean;
  uiMode: "normal" | "fullscreen" | "zen";
  saveStatus: SaveStatus;
  layoutAlignTrigger: number;
  confirmDialog: {
    isOpen: boolean;
    message: string;
    onConfirm?: () => void | Promise<void>;
  };
  floatingActionsVisible: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  triggerLayoutAlign: () => void;
  setCardsCollapsed: (collapsed: boolean) => void;
  toggleCardsCollapsed: () => void;
  setInactiveBranchesMode: (mode: InactiveBranchesMode) => void;
  setEditorEnterMode: (mode: EditorEnterMode) => void;
  setPasteSplitMode: (mode: PasteSplitMode) => void;
  setFocusModeScope: (mode: FocusModeScope) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSettingsOpen: (open: boolean) => void;
  setTimelineOpen: (open: boolean) => void;
  setColWidth: (width: number) => void;
  setUiMode: (mode: "normal" | "fullscreen" | "zen") => void;
  setSaveStatus: (status: SaveStatus) => void;
  setFileMenuOpen: (open: boolean) => void;
  setFloatingActionsVisible: (visible: boolean) => void;
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
  exportToStructuredMarkdown: () => void;
  exportToJson: () => void;
  updateContent: (id: string, content: string) => void;
  addChild: (parentId: string | null) => void;
  addSibling: (siblingId: string | null) => void;
  deleteNode: (id: string) => void;
  deleteNodes: (ids: string[]) => void;
  deleteNodesPromoteChildren: (ids: string[]) => void;
  splitNode: (id: string, textBefore: string, textAfter: string) => void;
  mergeNodes: (masterId: string, nodeIdsToMerge: string[]) => void;
  moveNode: (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ) => void;
  moveNodes: (
    sourceIds: string[],
    targetId: string,
    position: "before" | "after" | "child",
  ) => void;
}

export type AppStore = UiSlice & SelectionSlice & HistorySlice & DocumentSlice;
export type AppStoreSet = StoreApi<AppStore>["setState"];
export type AppStoreGet = StoreApi<AppStore>["getState"];
export type AppSlice<T> = (set: AppStoreSet, get: AppStoreGet) => T;
