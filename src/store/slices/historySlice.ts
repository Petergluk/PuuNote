import type { AppSlice, HistorySlice } from "../appStoreTypes";

import { PluginRegistry } from "../../plugins/registry";
import type { PuuNode } from "../../types";

const HISTORY_LIMIT = 50;
const DEFAULT_HISTORY_GROUP_DELAY_MS = 1500;

let activeHistoryGroup: { key: string; updatedAt: number } | null = null;

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
    activeHistoryGroup = null;
    set({ nodes: uniqueById(nodes), past: [], future: [] });
  },

  setNodes: (updater, options) => {
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

    const now = Date.now();
    const historyGroupKey = options?.historyGroupKey;
    const historyGroupDelayMs =
      options?.historyGroupDelayMs ?? DEFAULT_HISTORY_GROUP_DELAY_MS;
    const shouldGroup =
      historyGroupKey !== undefined &&
      historyGroupKey.length > 0 &&
      activeHistoryGroup !== null &&
      activeHistoryGroup.key === historyGroupKey &&
      now - activeHistoryGroup.updatedAt <= historyGroupDelayMs &&
      state.past.length > 0;

    activeHistoryGroup = historyGroupKey
      ? { key: historyGroupKey, updatedAt: now }
      : null;

    set({
      nodes: nextNodes,
      past: shouldGroup
        ? state.past
        : [...state.past.slice(-(HISTORY_LIMIT - 1)), currentNodes],
      future: [],
    });
    diffAndEmit(currentNodes, nextNodes);
  },

  undo: () => {
    activeHistoryGroup = null;
    const { past, nodes, future } = get();
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      nodes: previous,
      future: [nodes, ...future.slice(0, HISTORY_LIMIT - 1)],
    });
    diffAndEmit(nodes, previous);
  },

  redo: () => {
    activeHistoryGroup = null;
    const { past, nodes, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), nodes],
      nodes: next,
      future: future.slice(1),
    });
    diffAndEmit(nodes, next);
  },
});
