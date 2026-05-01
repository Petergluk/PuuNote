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
  activeAncestorPath: string[],

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
    if (timelineOpen || !activeId) return;

    let rafId: number;
    const updateScroll = () => {
      // Find the deepest column that has an active card
      let targetColIndex = -1;
      let targetCardId: string | null = null;

      // 1. Try to find activeId in the visible DOM
      const activeCard = document.getElementById(`card-${activeId}`);
      if (activeCard) {
        // Find which column this card belongs to by checking its parent
        const colContainer = activeCard.closest(".column-container");
        if (colContainer) {
          const indexStr = colContainer.getAttribute("data-col-index");
          if (indexStr) {
            targetColIndex = parseInt(indexStr, 10);
            targetCardId = activeId;
          } else {
            // Fallback: search through colRefs
            targetColIndex = colRefs.current.findIndex((col) =>
              col?.contains(activeCard),
            );
            if (targetColIndex !== -1) targetCardId = activeId;
          }
        }
      }

      // 2. If activeId not found, look for deepest ancestor
      if (targetColIndex === -1 && activeAncestorPath.length > 0) {
        // Iterate backwards from the deepest ancestor
        for (let i = activeAncestorPath.length - 1; i >= 0; i--) {
          const ancestorId = activeAncestorPath[i];
          const ancestorCard = document.getElementById(`card-${ancestorId}`);
          if (ancestorCard) {
            const colContainer = ancestorCard.closest(".column-container");
            if (colContainer) {
              const indexStr = colContainer.getAttribute("data-col-index");
              if (indexStr) {
                targetColIndex = parseInt(indexStr, 10);
                targetCardId = ancestorId;
              } else {
                targetColIndex = colRefs.current.findIndex((col) =>
                  col?.contains(ancestorCard),
                );
                if (targetColIndex !== -1) targetCardId = ancestorId;
              }
            }
            if (targetColIndex !== -1) break;
          }
        }
      }

      // 3. Scroll the target column to the target card
      if (targetColIndex !== -1 && targetCardId) {
        const colEl = colRefs.current[targetColIndex];
        const cardEl = document.getElementById(`card-${targetCardId}`);

        if (colEl && cardEl) {
          const cardTop = cardEl.offsetTop;
          const cardHeight = cardEl.offsetHeight;
          const colHeight = colEl.offsetHeight;

          // Ideal scroll position: card is vertically centered
          let targetScrollTop = cardTop - colHeight / 2 + cardHeight / 2;

          // Prevent scrolling past the top or bottom
          targetScrollTop = Math.max(0, targetScrollTop);
          targetScrollTop = Math.min(
            targetScrollTop,
            colEl.scrollHeight - colHeight,
          );

          // Smoothly scroll the column
          colEl.scrollTo({
            top: targetScrollTop,
            behavior: "smooth",
          });
        }
      }
    };

    // Double requestAnimationFrame ensures layout is calculated
    rafId = requestAnimationFrame(() => {
      rafId = requestAnimationFrame(updateScroll);
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeId, activeAncestorPath, timelineOpen]);

  const setColRef = (index: number, el: HTMLDivElement | null) => {
    colRefs.current[index] = el;
  };

  return { setColRef, initializedCols };
}
