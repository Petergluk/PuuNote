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
  activeId: string | null,
  activePath: string[],
  timelineOpen: boolean,
  columnsContextDependencies: any[],
) {
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const initializedCols = useRef<Set<number>>(new Set());

  const activePathString = activePath.join(",");

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
  }, columnsContextDependencies); // trigger on columns change

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

        // Vertical Alignment for all path items
        const currentPath = activePathString ? activePathString.split(",") : [];
        for (const pathId of currentPath) {
          const el = document.getElementById(`card-${pathId}`);
          if (el) {
            const col = el.closest(".overflow-y-auto");
            if (col) {
              const elRect = el.getBoundingClientRect();
              const colRect = col.getBoundingClientRect();
              const desiredTop = Math.max(
                colRect.top + 32,
                colRect.top + col.clientHeight / 2 - el.offsetHeight / 2,
              );
              const diff = elRect.top - desiredTop;
              if (Math.abs(diff) > 2) {
                col.scrollTo({ top: col.scrollTop + diff, behavior: "smooth" });
              }
            }
          }
        }
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [activeId, activePathString, timelineOpen]);

  return { colRefs, initializedCols };
}
