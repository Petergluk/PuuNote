import type { AppSlice, HistorySlice } from "../appStoreTypes";

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export const createHistorySlice: AppSlice<HistorySlice> = (set, get) => ({
  nodes: [],
  past: [],
  future: [],

  setNodesRaw: (nodes) => {
    set({ nodes: uniqueById(nodes), past: [], future: [] });
  },

  setNodes: (updater) => {
    const state = get();
    const currentNodes = state.nodes;
    let nextNodes =
      typeof updater === "function" ? updater(currentNodes) : updater;

    if (currentNodes === nextNodes) return;
    nextNodes = uniqueById(nextNodes);

    if (
      currentNodes.length === nextNodes.length &&
      currentNodes.every((node, index) => node === nextNodes[index])
    ) {
      return;
    }

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
      future: [nodes, ...future].slice(0, 50),
    });
  },

  redo: () => {
    const { past, nodes, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past, nodes].slice(-50),
      nodes: next,
      future: future.slice(1),
    });
  },
});
