import { useMemo, useEffect, useRef } from "react";
import { PuuNode } from "../types";

import { buildTreeIndex, TreeIndex, orderedChildrenFromIndex } from "../utils/tree";

export function buildBoardColumns(
  treeIndex: TreeIndex,
  activePath: string[] = [],
  activeId: string | null = null,
  useActiveCorridor = false,
) {
  const cols: PuuNode[][] = [];

  if (useActiveCorridor) {
    const roots = orderedChildrenFromIndex(treeIndex, null);
    cols.push(roots);
    if (roots.length === 0) {
      return cols;
    }

    if (activePath.length === 0 || !activeId) {
      let currentLevel = roots;
      while (currentLevel.length > 0) {
        const nextLevel: PuuNode[] = [];
        for (const parent of currentLevel) {
          nextLevel.push(...orderedChildrenFromIndex(treeIndex, parent.id));
        }
        if (nextLevel.length > 0) cols.push(nextLevel);
        currentLevel = nextLevel;
      }
      return cols;
    }

    for (const pathId of activePath) {
      const children = orderedChildrenFromIndex(treeIndex, pathId);
      if (children.length > 0) cols.push(children);
    }

    let currentLevel = orderedChildrenFromIndex(treeIndex, activeId);
    while (currentLevel.length > 0) {
      const nextLevel: PuuNode[] = [];
      for (const parent of currentLevel) {
        nextLevel.push(...orderedChildrenFromIndex(treeIndex, parent.id));
      }
      if (nextLevel.length > 0) cols.push(nextLevel);
      currentLevel = nextLevel;
    }

    return cols;
  }

  let currentLevel = orderedChildrenFromIndex(treeIndex, null);
  if (currentLevel.length === 0) {
    cols.push([]);
    return cols;
  }

  while (currentLevel.length > 0) {
    cols.push(currentLevel);
    const nextLevel: PuuNode[] = [];
    for (const parent of currentLevel) {
      nextLevel.push(...orderedChildrenFromIndex(treeIndex, parent.id));
    }
    currentLevel = nextLevel;
  }

  return cols;
}

export function useColumns(
  nodes: PuuNode[],
  treeIndex?: TreeIndex,
  activePath: string[] = [],
  activeId: string | null = null,
  useActiveCorridor = false,
) {
  const columns = useMemo(() => {
    const index = treeIndex || buildTreeIndex(nodes);
    return buildBoardColumns(
      index,
      activePath,
      activeId,
      useActiveCorridor,
    );
  }, [
    activeId,
    activePath,
    nodes,
    treeIndex,
    useActiveCorridor,
  ]);

  return columns;
}

export function useActivePathScroll(
  activeFileId: string | null,
  activeId: string | null,
  editingId: string | null,
  activeAncestorPath: string[],
  activeDescendantIds: Set<string>,
  timelineOpen: boolean,
  columnsLength: number,
  layoutAlignTrigger: number,
) {
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const initializedCols = useRef<Set<number>>(new Set());

  useEffect(() => {
    initializedCols.current.clear();
  }, [activeFileId]);

  useEffect(() => {
    const initCols = initializedCols.current;
    return () => {
      initCols.clear();
      colRefs.current = [];
    };
  }, []);

  useEffect(() => {
    colRefs.current = colRefs.current.slice(0, columnsLength);
  }, [columnsLength]);

  const ancestorStr = activeAncestorPath.join(",");
  const descendantStr = Array.from(activeDescendantIds).sort().join(",");

  // Manage column initialization and active path alignment in a single effect
  useEffect(() => {
    if (timelineOpen || editingId !== null) return;

    let rafId: number;
    const updateScroll = () => {
      // 1. First establish baseline scroll for any new/uninitialized columns
      colRefs.current.forEach((col, index) => {
        if (!col) return;
        if (!initializedCols.current.has(index)) {
          const firstCard = col.querySelector('[id^="card-"]') as HTMLElement;
          if (firstCard) {
            col.scrollTop = firstCard.offsetTop - 64;
            initializedCols.current.add(index);
          }
        }
      });

      // 2. Now measure the active element, since initialization may have moved it
      const activeEl = activeId ? document.getElementById(`card-${activeId}`) : null;
      const activeRect = activeEl ? activeEl.getBoundingClientRect() : null;

      const activeAncestorIds = new Set(activeAncestorPath);
      const isInActiveBranch = (id: string) => {
        return (
          id === activeId ||
          activeAncestorIds.has(id) ||
          activeDescendantIds.has(id)
        );
      };

      colRefs.current.forEach((col) => {
        if (!col) return;

        let activeNodeInCol: HTMLElement | null = null;
        const cards = Array.from(col.querySelectorAll<HTMLElement>('[id^="card-"]'));

        for (const card of cards) {
          const id = card.id.replace(/^card-/, "");
          if (isInActiveBranch(id)) {
            activeNodeInCol = card;
            break;
          }
        }

        if (activeNodeInCol && activeRect && activeId) {
          const elRect = activeNodeInCol.getBoundingClientRect();
          const colRect = col.getBoundingClientRect();

          let desiredTop = activeRect.top;
          const minTop = colRect.top + 64;
          const maxTop = Math.max(minTop, colRect.bottom - 16 - elRect.height);
          
          if (desiredTop < minTop) {
            desiredTop = minTop;
          } else if (desiredTop > maxTop) {
            desiredTop = maxTop;
          }

          const targetDiff = elRect.top - desiredTop;
          const targetScrollTop = col.scrollTop + targetDiff;

          const maxScrollTop = col.scrollHeight - col.clientHeight;
          const clampedScrollTop = Math.max(0, Math.min(maxScrollTop || 0, targetScrollTop));

          if (Math.abs(clampedScrollTop - col.scrollTop) > 1) {
            col.scrollTop = clampedScrollTop;
          }
        }
      });
    };

    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(updateScroll);
    });

    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeId,
    editingId,
    ancestorStr,
    descendantStr,
    timelineOpen,
    columnsLength,
    layoutAlignTrigger,
  ]);

  const setColRef = (index: number, el: HTMLDivElement | null) => {
    colRefs.current[index] = el;
  };

  return { setColRef, initializedCols };
}
