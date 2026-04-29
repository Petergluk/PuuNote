import { useMemo, useEffect, useRef } from "react";
import { PuuNode } from "../types";

import { buildTreeIndex, TreeIndex } from "../utils/tree";
import { BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD } from "../constants";

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
  useActiveCorridor = false,
) {
  const cols: PuuNode[][] = [];

  if (useActiveCorridor) {
    const roots = orderedChildren(treeIndex, null);
    cols.push(roots);
    if (roots.length === 0 || activePath.length === 0) return cols;

    for (let index = 1; index < activePath.length; index++) {
      cols.push(orderedChildren(treeIndex, activePath[index - 1]));
    }

    const lastPathId = activePath[activePath.length - 1];
    const children = orderedChildren(treeIndex, lastPathId);
    if (children.length > 0) cols.push(children);
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
) {
  const columns = useMemo(() => {
    const index = treeIndex || buildTreeIndex(nodes);
    return buildBoardColumns(
      index,
      activePath,
      nodes.length > BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD,
    );
  }, [activePath, nodes, treeIndex]);

  return columns;
}

export function useActivePathScroll(
  activeFileId: string | null,
  activeId: string | null,
  activePath: string[],
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

  // Make deep comparison or just use length/first-element as heuristic
  // but standard React expects same reference or JSON stringification
  // Let's use activePath as a string key just for `useEffect` deps without doing split back
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

  // Center active path
  useEffect(() => {
    let r2: number;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        if (!activeId) return;
        if (timelineOpen) return;
        const activeEl = document.getElementById(`card-${activeId}`);
        if (!activeEl) return;

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

        colRefs.current.forEach((col, colIndex) => {
          if (!col) return;

          let activeNodeInCol: Element | null = null;
          // Find the active node in this column
          for (const pathId of activePath) {
            const el = document.getElementById(`card-${pathId}`);
            if (el && col.contains(el)) {
              activeNodeInCol = el;
              break;
            }
          }

          if (activeNodeInCol) {
            const elRect = activeNodeInCol.getBoundingClientRect();
            const colRect = col.getBoundingClientRect();

            let desiredCenterY = elRect.top + elRect.height / 2;

            if (colIndex > 0) {
              // Align to parent's vertical center
              const parentId = activeNodeInCol.getAttribute("data-parent-id");
              if (parentId) {
                const parentEl = document.getElementById(`card-${parentId}`);
                if (parentEl) {
                  const pRect = parentEl.getBoundingClientRect();
                  desiredCenterY = pRect.top + pRect.height / 2;
                }
              }
            } else {
              // First column keeps its scroll, just ensure it's not totally out of bounds
              const minCenterY = colRect.top + 64 + elRect.height / 2;
              const maxCenterY = colRect.bottom - 16 - elRect.height / 2;
              if (desiredCenterY < minCenterY) {
                desiredCenterY = minCenterY;
              } else if (desiredCenterY > maxCenterY) {
                desiredCenterY = maxCenterY;
              }
            }

            const currentCenterY = elRect.top + elRect.height / 2;
            const targetDiff = currentCenterY - desiredCenterY;

            let maxScrollTop = col.scrollHeight - col.clientHeight;
            if (maxScrollTop < 0) maxScrollTop = 0;

            const targetScrollTop = col.scrollTop + targetDiff;
            const clampedScrollTop = Math.max(
              0,
              Math.min(maxScrollTop, targetScrollTop),
            );

            if (Math.abs(clampedScrollTop - col.scrollTop) > 2) {
              col.scrollTo({ top: clampedScrollTop, behavior: "smooth" });
            }
          }
        });
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [activeId, activePath, timelineOpen]);

  return { colRefs, initializedCols };
}
