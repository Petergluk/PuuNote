import { useMemo, useEffect, useRef } from "react";
import { PuuNode } from "../types";

export function useColumns(nodes: PuuNode[]) {
  const columns = useMemo(() => {
    const cols: PuuNode[][] = [];
    const childrenMap = new Map<string | null, PuuNode[]>();
    for (const node of nodes) {
      if (!childrenMap.has(node.parentId)) {
        childrenMap.set(node.parentId, []);
      }
      childrenMap.get(node.parentId)!.push(node);
    }
    for (const group of childrenMap.values()) {
      group.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    let currentLevel = childrenMap.get(null) || [];
    if (currentLevel.length === 0) {
      cols.push([]);
      return cols;
    }
    while (currentLevel.length > 0) {
      cols.push(currentLevel);
      const nextLevel: PuuNode[] = [];
      for (const parent of currentLevel) {
        const children = childrenMap.get(parent.id) || [];
        nextLevel.push(...children);
      }
      currentLevel = nextLevel;
    }
    return cols;
  }, [nodes]);

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
        const activeEl = document.getElementById(`card-${activeId}`);
        if (!activeEl) return;
        if (timelineOpen) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return;
        }

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

        // Vertical Alignment for all columns
        let globalTargetY = 0;
        let baselineFound = false;

        const intendedCenters = new Map<string, number>();
        const scrollTasks: { col: Element; diff: number; top: number }[] = [];

        colRefs.current.forEach((col) => {
          if (!col) return;
          
          let elToAlign: Element | null = null;
          let elToAlignIsActive = false;

          // 1. Check if the column has a node in activePath
          for (const pathId of activePath) {
            const el = document.getElementById(`card-${pathId}`);
            if (el && col.contains(el)) {
              elToAlign = el;
              elToAlignIsActive = true;
              break;
            }
          }

          // 2. If not, use the first card in the column
          if (!elToAlign) {
            elToAlign = col.querySelector('[id^="card-"]');
          }

          if (elToAlign) {
            const elRect = elToAlign.getBoundingClientRect();
            const colRect = col.getBoundingClientRect();

            let desiredCenterY = colRect.top + col.clientHeight / 2;

            if (!baselineFound && elToAlignIsActive) {
                const isFirstCardInColumn = col.querySelector('[id^="card-"]') === elToAlign;
                if (isFirstCardInColumn) {
                    desiredCenterY = colRect.top + 64 + (elToAlign as HTMLElement).offsetHeight / 2;
                } else {
                    desiredCenterY = colRect.top + col.clientHeight / 2;
                }
                globalTargetY = desiredCenterY;
                baselineFound = true;
            }

            if (elToAlignIsActive) {
                desiredCenterY = globalTargetY;
            } else {
                const parentId = elToAlign.getAttribute("data-parent-id");
                if (parentId && intendedCenters.has(parentId)) {
                    desiredCenterY = intendedCenters.get(parentId)!;
                } else {
                    const parentEl = document.getElementById(`card-${parentId}`);
                    if (parentEl) {
                        const pRect = parentEl.getBoundingClientRect();
                        desiredCenterY = pRect.top + pRect.height / 2;
                    } else if (baselineFound) {
                        desiredCenterY = globalTargetY;
                    }
                }
            }

            const currentCenterY = elRect.top + elRect.height / 2;
            const targetDiff = currentCenterY - desiredCenterY;

            let maxScrollTop = col.scrollHeight - col.clientHeight;
            if (maxScrollTop < 0) maxScrollTop = 0;
            
            const targetScrollTop = col.scrollTop + targetDiff;
            const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
            const appliedDiff = clampedScrollTop - col.scrollTop;

            const cardsInCol = col.querySelectorAll('[id^="card-"]');
            cardsInCol.forEach(card => {
                const cRect = card.getBoundingClientRect();
                const cardCenterY = cRect.top + cRect.height / 2;
                const cId = card.id.replace("card-", "");
                intendedCenters.set(cId, cardCenterY - appliedDiff);
            });

            if (Math.abs(appliedDiff) > 2) {
              scrollTasks.push({ col, diff: appliedDiff, top: clampedScrollTop });
            }
          }
        });

        scrollTasks.forEach(task => {
          task.col.scrollTo({ top: task.top, behavior: "smooth" });
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
