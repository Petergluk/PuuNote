import type { AppSlice, HistorySlice } from "../appStoreTypes";

import { PluginRegistry } from "../../plugins/registry";
import type { PuuNode } from "../../types";

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const diffAndEmit = (prevNodes: PuuNode[], nextNodes: PuuNode[]) => {
  const prevMap = new Map(prevNodes.map((n) => [n.id, n]));
  const nextMap = new Map(nextNodes.map((n) => [n.id, n]));

  for (const prev of prevNodes) {
    if (!nextMap.has(prev.id)) PluginRegistry.emitNodeDeleted(prev.id);
  }

  for (const next of nextNodes) {
    const prev = prevMap.get(next.id);
    if (!prev) PluginRegistry.emitNodeCreated(next);
    else if (
      prev.content !== next.content ||
      prev.parentId !== next.parentId ||
      prev.order !== next.order ||
      prev.metadata !== next.metadata
    ) {
      PluginRegistry.emitNodeUpdated(next);
    }
  }
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
      past: [...state.past.slice(-49), currentNodes],
      future: [],
    });
    diffAndEmit(currentNodes, nextNodes);
  },

  undo: () => {
    const { past, nodes, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      nodes: previous,
      future: [nodes, ...future.slice(0, 49)],
    });
    diffAndEmit(nodes, previous);
  },

  redo: () => {
    const { past, nodes, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past.slice(-49), nodes],
      nodes: next,
      future: future.slice(1),
    });
    diffAndEmit(nodes, next);
  },
});
