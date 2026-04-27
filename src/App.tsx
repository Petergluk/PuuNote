import React, { useEffect, useRef, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { PuuNode } from "./types";
import { Card } from "./components/Card";
import { FullScreenModal } from "./components/FullScreenModal";
import { TimelineView } from "./components/TimelineView";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { FileMenu } from "./components/FileMenu";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import { useFileSystemInit, useFileSystemActions } from "./hooks/useFileSystem";
import { usePreferencesInit } from "./hooks/usePreferences";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { useAppStore, computeActivePath } from "./store/useAppStore";
export default function App() {
  /* Initialize Managers */
  useFileSystemInit();
  usePreferencesInit();
  const { handleKeyDown } =
    useAppHotkeys(); /* binds zero-argument global and scoped hooks */
  const { createNewFile } = useFileSystemActions();
  const {
    activeId,
    setActiveId,
    editingId,
    setEditingId,
    fullScreenId,
    setFullScreenId,
    timelineOpen,
    setTimelineOpen,
    colWidth,
    nodes,
    setNodesRaw,
    addChild,
  } = useAppStore();
  const activePath = useMemo(
    () => computeActivePath(nodes, activeId),
    [nodes, activeId],
  ); /* Build column arrays */
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
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const initializedCols = useRef<Set<number>>(new Set());
  useEffect(() => {
    const timer = setTimeout(() => {
      colRefs.current.forEach((col, index) => {
        if (col && !initializedCols.current.has(index)) {
          const innerFlex = col.children[0];
          const firstCard = innerFlex && (innerFlex.children[0] as HTMLElement);
          if (firstCard) {
            col.scrollTop = firstCard.offsetTop - 64;
            initializedCols.current.add(index);
          }
        }
      });
    }, 50);
    return () => clearTimeout(timer);
  }, [
    columns,
  ]); /* Center the active path vertically and horizontally when the active node changes */
  useEffect(() => {
    let r1: number;
    let r2: number;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        if (!activeId) return;
        const activeEl = document.getElementById(`card-${activeId}`);
        if (!activeEl) return;
        if (timelineOpen) {
          activeEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
          return;
        } /* Horizontal Scroll onto active column */
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
        } /* Vertical Alignment for all path items */
        for (const pathId of activePath) {
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
  }, [activeId, activePath, timelineOpen]); /* Run when activePath is rebuilt */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const mdText = event.target?.result as string;
      if (!mdText) return;
      const imported = parseMarkdownToNodes(mdText);
      if (imported.length > 0) {
        setNodesRaw(imported);
        setActiveId(imported[0].id);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; /* reset input */
  };
  return (
    <div
      id="puunote-app-container"
      className="min-h-screen h-screen bg-app-bg text-app-text-primary font-sans flex flex-col overflow-hidden outline-none transition-colors duration-300"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onClick={(e) => {
        /* If clicked directly on the main background areas (not on cards) */
        if (
          (e.target as HTMLElement).id === "puunote-app-container" ||
          (e.target as HTMLElement).id === "main-scroller" ||
          (e.target as HTMLElement).classList.contains("col-spacer")
        ) {
          setActiveId(null);
          setEditingId(null);
        }
      }}
    >
      {" "}
      <Header handleImport={handleImport} />{" "}
      <main
        id="main-scroller"
        style={{ "--col-width": `${colWidth}px` } as React.CSSProperties}
        className={`flex-1 overflow-x-auto w-full flex items-start relative bg-app-bg transition-colors duration-300 snap-x snap-mandatory sm:snap-none ${!timelineOpen ? "overflow-y-hidden" : "overflow-y-auto"}`}
      >
        {" "}
        {!timelineOpen ? (
          <div
            className="flex flex-row items-start gap-0 px-0 sm:px-4 py-0 min-h-full h-full w-max relative col-spacer"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setActiveId(null);
                setEditingId(null);
              }
            }}
          >
            {" "}
            {columns.map((colNodes, colIndex) => {
              return (
                <div
                  key={colIndex}
                  ref={(el) => {
                    colRefs.current[colIndex] = el;
                  }}
                  className="column-container h-full shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar scroll-smooth px-2 transition-all duration-200 col-spacer"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) {
                      setActiveId(null);
                      setEditingId(null);
                    }
                  }}
                >
                  {" "}
                  <div
                    className="column-inner relative flex flex-col gap-3 pt-[50vh] pb-[50vh] mx-auto transition-all duration-200 col-spacer"
                    onClick={(e) => {
                      if (e.target === e.currentTarget) {
                        setActiveId(null);
                        setEditingId(null);
                      }
                    }}
                  >
                    {" "}
                    {colNodes.map((node) => (
                      <ErrorBoundary key={node.id}>
                        {" "}
                        <Card node={node} />{" "}
                      </ErrorBoundary>
                    ))}{" "}
                    {colNodes.length === 0 && colIndex === 0 && (
                      <div
                        onClick={() => addChild(null)}
                        className="bg-app-card border border-dashed border-app-border p-6 rounded flex justify-center items-center h-min group cursor-pointer hover:border-app-accent transition-colors shadow-sm"
                      >
                        {" "}
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-text-muted group-hover:text-app-accent transition-colors">
                          + Add Fragment
                        </span>{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>
              );
            })}{" "}
          </div>
        ) : (
          <TimelineView nodes={nodes} />
        )}{" "}
      </main>{" "}
      <Footer />{" "}
      <AnimatePresence>
        {" "}
        {fullScreenId && (
          <FullScreenModal
            nodeId={fullScreenId}
            onClose={() => setFullScreenId(null)}
          />
        )}{" "}
        <FileMenu />{" "}
      </AnimatePresence>{" "}
    </div>
  );
}
