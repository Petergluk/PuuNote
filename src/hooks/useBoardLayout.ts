import { useMemo, useEffect, useRef } from "react";
import { PuuNode } from "../types";

import { buildTreeIndex, TreeIndex } from "../utils/tree";

const orderedChildren = (
  treeIndex: TreeIndex,
  parentId: string | null,
): PuuNode[] => {
  return [...(treeIndex.childrenMap.get(parentId) || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
};

export function buildBoardColumns(
  treeIndex: TreeIndex,
  activePath: string[] = [],
  activeId: string | null = null,
  useActiveCorridor = false,
) {
  const cols: PuuNode[][] = [];

  if (useActiveCorridor) {
    const roots = orderedChildren(treeIndex, null);
    cols.push(roots);
    if (roots.length === 0) {
      return cols;
    }

    if (activePath.length === 0 || !activeId) {
      let currentLevel = roots;
      while (currentLevel.length > 0) {
        const nextLevel: PuuNode[] = [];
        for (const parent of currentLevel) {
          nextLevel.push(...orderedChildren(treeIndex, parent.id));
        }
        if (nextLevel.length > 0) cols.push(nextLevel);
        currentLevel = nextLevel;
      }
      return cols;
    }

    for (const pathId of activePath) {
      const children = orderedChildren(treeIndex, pathId);
      if (children.length > 0) cols.push(children);
    }

    let currentLevel = orderedChildren(treeIndex, activeId);
    while (currentLevel.length > 0) {
      const nextLevel: PuuNode[] = [];
      for (const parent of currentLevel) {
        nextLevel.push(...orderedChildren(treeIndex, parent.id));
      }
      if (nextLevel.length > 0) cols.push(nextLevel);
      currentLevel = nextLevel;
    }

    return cols;
  }

  let currentLevel = orderedChildren(treeIndex, null);
  if (currentLevel.length === 0) {
    cols.push([]);
    return cols;
  }

  while (currentLevel.length > 0) {
    cols.push(currentLevel);
    const nextLevel: PuuNode[] = [];
    for (const parent of currentLevel) {
      nextLevel.push(...orderedChildren(treeIndex, parent.id));
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
    return buildBoardColumns(index, activePath, activeId, useActiveCorridor);
  }, [activeId, activePath, nodes, treeIndex, useActiveCorridor]);

  return columns;
}

export function useActivePathScroll(
  activeFileId: string | null,
  activeId: string | null,
  activeAncestorPath: string[],
  activeDescendantIds: Set<string>,
  timelineOpen: boolean,
  columnsLength: number,
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

  useEffect(() => {
    let rafId: number;
    const updateScroll = () => {
      colRefs.current.forEach((col, index) => {
        if (col && !initializedCols.current.has(index)) {
          const firstCard = col.querySelector('[id^="card-"]') as HTMLElement;
          if (firstCard) {
            col.scrollTop = firstCard.offsetTop - 64;
            initializedCols.current.add(index);
          }
        }
      });
    };
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(updateScroll); // Double raf guarantees paint
    });
    return () => cancelAnimationFrame(rafId);
  }, [columnsLength]); // trigger on columns change

  // Align active path by top edge.
  useEffect(() => {
    let r2: number;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        if (!activeId) return;
        if (timelineOpen) return;
        const activeEl = document.getElementById(`card-${activeId}`);
        if (!activeEl) return;
        const activeRect = activeEl.getBoundingClientRect();

        // Horizontal Scroll onto active column
        const mainScroller = document.getElementById("main-scroller");
        const activeCol = activeEl.closest(".overflow-y-auto") as HTMLElement;
        if (mainScroller && activeCol) {
          const scrollerRect = mainScroller.getBoundingClientRect();
          const colRect = activeCol.getBoundingClientRect();
          const hDiff =
            colRect.left +
            activeCol.offsetWidth / 2 -
            (scrollerRect.left + mainScroller.clientWidth / 2);
          if (Math.abs(hDiff) > 2) {
            mainScroller.scrollTo({
              left: mainScroller.scrollLeft + hDiff,
              behavior: "smooth",
            });
          }
        }

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
          const cards = Array.from(
            col.querySelectorAll<HTMLElement>('[id^="card-"]'),
          );
          for (const card of cards) {
            const id = card.id.replace(/^card-/, "");
            if (isInActiveBranch(id)) {
              activeNodeInCol = card;
              break;
            }
          }

          if (activeNodeInCol) {
            const elRect = activeNodeInCol.getBoundingClientRect();
            const colRect = col.getBoundingClientRect();

            let desiredTop = activeRect.top;
            const minTop = colRect.top + 64;
            const maxTop = Math.max(
              minTop,
              colRect.bottom - 16 - elRect.height,
            );
            if (desiredTop < minTop) {
              desiredTop = minTop;
            } else if (desiredTop > maxTop) {
              desiredTop = maxTop;
            }

            const targetDiff = elRect.top - desiredTop;

            let maxScrollTop = col.scrollHeight - col.clientHeight;
            if (maxScrollTop < 0) maxScrollTop = 0;

            const targetScrollTop = col.scrollTop + targetDiff;
            const clampedScrollTop = Math.max(
              0,
              Math.min(maxScrollTop, targetScrollTop),
            );

            if (Math.abs(clampedScrollTop - col.scrollTop) > 2) {
              col.scrollTop = clampedScrollTop;
            }
          }
        });
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [activeAncestorPath, activeDescendantIds, activeId, timelineOpen]);

  return { colRefs, initializedCols };
}
