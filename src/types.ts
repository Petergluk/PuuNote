import { MutableRefObject } from "react";
export interface PuuNode {
  id: string;
  content: string;
  parentId: string | null;
  order?: number;
}
export interface PuuDocument {
  id: string;
  title: string;
  updatedAt: number;
}
export interface EditorContextType {
  activeId: string | null;
  editingId: string | null;
  activePath: string[];
  descendantIds: Set<string>;
  fullScreenId: string | null;
  cardRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
  draggedId: string | null;
  setDraggedId: (id: string | null) => void;
  moveNode: (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ) => void;
  setActive: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setFullScreen: (id: string | null) => void;
  updateContent: (id: string, content: string) => void;
  addSibling: (targetId: string) => void;
  addChild: (parentId: string | null) => void;
  deleteNode: (id: string) => void;
  cardsCollapsed: boolean;
  splitNode: (id: string, textBefore: string, textAfter: string) => void;
}
