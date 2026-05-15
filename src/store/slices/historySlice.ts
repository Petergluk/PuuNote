import type { AppSlice, HistorySlice, HistoryStep } from "../appStoreTypes";
import { compare, applyPatch } from "fast-json-patch";

import { PluginRegistry } from "../../plugins/registry";
import type { PuuNode } from "../../types";
import { MAX_HISTORY_STATES } from "../../constants";

const MAX_HISTORY_STEPS_LIMIT = MAX_HISTORY_STATES;
const MAX_HISTORY_VOLUME_BYTES = 1024 * 1024 * 5; // 5 MB of patches limit
const DEFAULT_HISTORY_GROUP_DELAY_MS = 5000;
const MAX_GROUP_DURATION_MS = 30000; // max 30s per group

let activeHistoryGroup: { key: string; updatedAt: number; createdAt: number } | null = null;

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
      JSON.stringify(prev.metadata) !== JSON.stringify(next.metadata)
    ) {
      PluginRegistry.emitNodeUpdated(next);
    }
  }
};

const enforceHistoryLimits = (past: HistoryStep[]) => {
  let newPast = [...past];
  // Trim by count
  if (newPast.length > MAX_HISTORY_STEPS_LIMIT) {
    newPast = newPast.slice(newPast.length - MAX_HISTORY_STEPS_LIMIT);
  }
  // Trim by total volume (rough estimation using JSON.stringify for patches)
  let totalVolume = 0;
  for (let i = newPast.length - 1; i >= 0; i--) {
    const step = newPast[i];
    const size = JSON.stringify(step.patch).length + JSON.stringify(step.inversePatch).length;
    totalVolume += size;
    if (totalVolume > MAX_HISTORY_VOLUME_BYTES) {
      newPast = newPast.slice(i + 1);
      break;
    }
  }
  return newPast;
};

export const createHistorySlice: AppSlice<HistorySlice> = (set, get) => ({
  nodes: [],
  past: [],
  future: [],

  /**
   * ⚠️ Полностью сбрасывает undo/redo историю.
   * Используется ТОЛЬКО при загрузке/переключении файлов (hydration).
   * Не вызывать из пользовательских действий или плагинов.
   */
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
      now - activeHistoryGroup.createdAt <= MAX_GROUP_DURATION_MS &&
      state.past.length > 0;

    if (shouldGroup && activeHistoryGroup) {
      activeHistoryGroup.updatedAt = now;
    } else {
      activeHistoryGroup = historyGroupKey
        ? { key: historyGroupKey, updatedAt: now, createdAt: now }
        : null;
    }

    const patch = compare(currentNodes, nextNodes);
    const inversePatch = compare(nextNodes, currentNodes);

    let newPast = [...state.past];
    
    if (shouldGroup) {
      // Merge with the last step
      const lastStep = newPast[newPast.length - 1];
      // To keep inverse intact relative to original, we must apply diff over combined?
      // Actually, compare(originalNodes, nextNodes). But we don't hold originalNodes cheaply.
      // Easiest grouping: we just pop the last step, apply its inverse to current to find original, 
      // then generate patches again.
      newPast.pop();
      const originalNodes = applyPatch([...currentNodes], lastStep.inversePatch, false, false).newDocument;
      const combinedPatch = compare(originalNodes, nextNodes);
      const combinedInverse = compare(nextNodes, originalNodes);
      newPast.push({
        patch: combinedPatch,
        inversePatch: combinedInverse,
        timestamp: lastStep.timestamp
      });
    } else {
      newPast.push({ patch, inversePatch, timestamp: now });
    }

    newPast = enforceHistoryLimits(newPast);

    set({
      nodes: nextNodes,
      past: newPast,
      future: [],
    });
    diffAndEmit(currentNodes, nextNodes);
  },

  undo: () => {
    activeHistoryGroup = null;
    const { past, nodes, future } = get();
    if (past.length === 0) return;
    const step = past[past.length - 1];
    
    // Applying inverse patch to go back
    const previous = applyPatch([...nodes], step.inversePatch, false, false).newDocument;
    
    set({
      past: past.slice(0, -1),
      nodes: previous,
      future: [step, ...future],
    });
    diffAndEmit(nodes, previous);
  },

  redo: () => {
    activeHistoryGroup = null;
    const { past, nodes, future } = get();
    if (future.length === 0) return;
    const step = future[0];
    
    // Applying patch to go forward
    const next = applyPatch([...nodes], step.patch, false, false).newDocument;
    
    set({
      past: [...past, step],
      nodes: next,
      future: future.slice(1),
    });
    diffAndEmit(nodes, next);
  },
});
