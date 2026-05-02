import { buildTreeIndex, getDepthFirstNodesFromIndex } from "../../utils/tree";
import type { AppSlice, SelectionSlice } from "../appStoreTypes";

export const createSelectionSlice: AppSlice<SelectionSlice> = (set) => ({
  activeId: null,
  selectedIds: [],
  editingId: null,
  draggedId: null,
  fullScreenId: null,

  setActiveId: (activeId) =>
    set((state) => {
      if (state.activeId === activeId) {
        if (activeId) {
          // Trigger a layout re-alignment using a slight trick to break out of zustand set
          // Or just update layoutAlignTrigger right here
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return { layoutAlignTrigger: state.layoutAlignTrigger + 1 } as any;
        }
        return state;
      }
      return { activeId, selectedIds: activeId ? [activeId] : [] };
    }),

  toggleSelection: (id, isShift) =>
    set((state) => {
      const { selectedIds, activeId, nodes } = state;
      if (isShift && activeId) {
        const activeNode = nodes.find((n) => n.id === activeId);
        const targetNode = nodes.find((n) => n.id === id);

        if (
          activeNode &&
          targetNode &&
          activeNode.parentId === targetNode.parentId
        ) {
          const siblings = nodes
            .filter((n) => n.parentId === activeNode.parentId)
            .sort((a, b) => (a.order || 0) - (b.order || 0));

          const anchorIndex = siblings.findIndex((n) => n.id === activeId);
          const targetIndex = siblings.findIndex((n) => n.id === id);

          if (anchorIndex !== -1 && targetIndex !== -1) {
            const [from, to] =
              anchorIndex < targetIndex
                ? [anchorIndex, targetIndex]
                : [targetIndex, anchorIndex];
            return {
              activeId: id,
              selectedIds: siblings.slice(from, to + 1).map((n) => n.id),
            };
          }
        } else {
          // If different parents, just do standard depth-first but maybe it's confusing.
          // Let's fallback to depth-first if they are not siblings?
          // Actually, if we just filter depth-first to only match the same depth/level?
          // Let's stick to returning just the new selection without parents if possible.
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

            // Collect range
            const rangeIds = orderedIds.slice(from, to + 1);
            // Filter out parents: only keep nodes that are leaves within this range,
            // or just exclude ancestors of the target node?
            // A simple and robust way: exclude any node in the range that has a child ALSO in the range.
            // This prevents selecting a parent when its children are selected.
            const rangeSet = new Set(rangeIds);
            const filteredRangeIds = rangeIds.filter((rangeId) => {
              const nodeChildren = state.nodes.filter(
                (n) => n.parentId === rangeId,
              );
              const hasChildInRange = nodeChildren.some((child) =>
                rangeSet.has(child.id),
              );
              return !hasChildInRange;
            });

            return {
              activeId: id,
              selectedIds: filteredRangeIds,
            };
          }
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
