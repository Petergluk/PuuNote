import { buildTreeIndex, getDepthFirstNodesFromIndex } from "../../utils/tree";
import type { AppSlice, SelectionSlice } from "../appStoreTypes";

export const createSelectionSlice: AppSlice<SelectionSlice> = (set) => ({
  activeId: null,
  selectedIds: [],
  editingId: null,
  draggedId: null,
  fullScreenId: null,

  setActiveId: (activeId) =>
    set({ activeId, selectedIds: activeId ? [activeId] : [] }),

  toggleSelection: (id, isShift) =>
    set((state) => {
      const { selectedIds, activeId } = state;
      if (isShift && activeId) {
        const orderedIds = getDepthFirstNodesFromIndex(
          buildTreeIndex(state.nodes),
        ).map((node) => node.id);
        const anchorIndex = orderedIds.indexOf(activeId);
        const targetIndex = orderedIds.indexOf(id);
        if (anchorIndex !== -1 && targetIndex !== -1) {
          const [from, to] =
            anchorIndex < targetIndex
              ? [anchorIndex, targetIndex]
              : [targetIndex, anchorIndex];
          return {
            activeId: id,
            selectedIds: orderedIds.slice(from, to + 1),
          };
        }
      }

      if (selectedIds.includes(id)) {
        return {
          selectedIds: selectedIds.filter((selected) => selected !== id),
        };
      }
      return { selectedIds: [...selectedIds, id] };
    }),

  clearSelection: () => set({ selectedIds: [] }),
  setEditingId: (editingId) => set({ editingId }),
  setDraggedId: (draggedId) => set({ draggedId }),
  setFullScreenId: (fullScreenId) => set({ fullScreenId }),
});
