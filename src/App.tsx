import { useEffect, useRef, useMemo, Suspense, lazy } from "react";
import { AnimatePresence } from "motion/react";
import { PuuNode } from "./types";
import { Card } from "./components/Card";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { FileMenu } from "./components/FileMenu";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Minimize } from "lucide-react";

const FullScreenModal = lazy(() => import("./components/FullScreenModal").then(module => ({ default: module.FullScreenModal })));
const TimelineView = lazy(() => import("./components/TimelineView").then(module => ({ default: module.TimelineView })));
const CommandPalette = lazy(() => import("./components/CommandPalette").then(module => ({ default: module.CommandPalette })));

import { parseMarkdownToNodes } from "./utils/markdownParser";
import { validateNodes } from "./utils/schema";
import { useFileSystemInit, useFileSystemActions } from "./hooks/useFileSystem";
import { usePreferencesInit } from "./hooks/usePreferences";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import {
  useAppStore,
} from "./store/useAppStore";
import { computeActivePath, computeDescendantIds } from "./utils/tree";
export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Initialize Managers */
  useFileSystemInit();
  usePreferencesInit();
  const { handleKeyDown } = useAppHotkeys(containerRef);
  const activeId = useAppStore((s) => s.activeId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const setEditingId = useAppStore((s) => s.setEditingId);
  const fullScreenId = useAppStore((s) => s.fullScreenId);
  const setFullScreenId = useAppStore((s) => s.setFullScreenId);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const colWidth = useAppStore((s) => s.colWidth);
  const nodes = useAppStore((s) => s.nodes);
  const addChild = useAppStore((s) => s.addChild);
  const uiMode = useAppStore((s) => s.uiMode);

  const { createNewFile } = useFileSystemActions();

  useEffect(() => {
    const onFullscreenChange = () => {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
      };
      if (!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)) {
        useAppStore.getState().setUiMode("normal");
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("mozfullscreenchange", onFullscreenChange);
    document.addEventListener("MSFullscreenChange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("mozfullscreenchange", onFullscreenChange);
      document.removeEventListener("MSFullscreenChange", onFullscreenChange);
    };
  }, []);

  const activePath = useMemo(
    () => computeActivePath(nodes, activeId),
    [nodes, activeId],
  );

  const activeDescendantIds = useMemo(
    () => computeDescendantIds(nodes, activeId),
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
    colRefs.current = colRefs.current.slice(0, columns.length);
  }, [columns.length]);
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
  }, [
    columns,
  ]); /* Center the active path vertically and horizontally when the active node changes */
  const activePathString = activePath.join(',');

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
        const currentPath = activePathString ? activePathString.split(',') : [];
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
  }, [activeId, activePathString, timelineOpen]); /* Run when activePath is rebuilt */
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large (max 5MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const mdText = event.target?.result as string;
      if (!mdText) return;
      const imported = parseMarkdownToNodes(mdText);
      try {
        const validated = validateNodes(imported);
        if (validated.length > 0) {
          useAppStore.getState().openConfirm("Import will create a new document. Proceed?", () => {
            const title = file.name.replace(/\.md$/i, "");
            createNewFile(validated, title);
          });
        }
      } catch (err) {
        console.error("Failed to validate imported nodes", err);
        alert("Imported file is invalid or corrupted.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; /* reset input */
  };
  return (
    <div
      ref={containerRef}
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
      {uiMode !== "zen" && <Header handleImport={handleImport} />}{" "}
      <main
        id="main-scroller"
        style={{ "--col-width": `${colWidth}px` } as React.CSSProperties}
        className={`flex-1 overflow-x-auto w-full flex items-start relative bg-app-bg transition-colors duration-300 snap-x snap-mandatory sm:snap-none ${!timelineOpen ? "overflow-y-hidden" : "overflow-y-auto"}`}
      >
        {" "}
        {!timelineOpen ? (
          <div className="flex flex-row items-start gap-0 px-0 sm:px-4 py-0 min-h-full h-full w-max relative col-spacer">
            {columns.map((colNodes, colIndex) => {
              return (
                <div
                  key={colIndex}
                  style={{ zIndex: 100 - colIndex }}
                  ref={(el) => {
                    colRefs.current[colIndex] = el;
                  }}
                  className="column-container h-full shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar scroll-smooth px-2 sm:pl-2 sm:pr-8 sm:-mr-6 transition-all duration-200 col-spacer relative"
                >
                  <div className="column-inner relative flex flex-col gap-3 pt-[50vh] pb-[50vh] mx-auto transition-all duration-200 col-spacer">
                    {colNodes.map((node) => (
                      <ErrorBoundary key={node.id}>
                        <Card
                          node={node}
                          isInPath={activePath.includes(node.id)}
                          isDescendantFromActive={activeDescendantIds.has(
                            node.id,
                          )}
                        />
                      </ErrorBoundary>
                    ))}
                    {colNodes.length === 0 && colIndex === 0 && (
                      <div
                        onClick={() => addChild(null)}
                        className="bg-app-card border border-dashed border-app-border p-6 rounded flex justify-center items-center h-min group cursor-pointer hover:border-app-accent transition-colors shadow-sm"
                      >
                        <span className="text-[10px] uppercase tracking-[0.2em] text-app-text-muted group-hover:text-app-accent transition-colors">
                          + Add Fragment
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Suspense fallback={<div className="p-8 text-app-text-muted">Loading timeline...</div>}>
            <TimelineView nodes={nodes} />
          </Suspense>
        )}{" "}
      </main>{" "}
      {uiMode !== "zen" && <Footer />}{" "}
      {uiMode === "zen" && (
        <button
          style={{ zIndex: 99999, pointerEvents: 'auto' }}
          onClick={(e) => {
            e.stopPropagation();
            useAppStore.getState().setUiMode("normal");
            try {
              const doc = document as Document & {
                webkitFullscreenElement?: Element;
                mozFullScreenElement?: Element;
                msFullscreenElement?: Element;
                exitFullscreen?: () => Promise<void>;
                webkitExitFullscreen?: () => Promise<void>;
                mozCancelFullScreen?: () => Promise<void>;
                msExitFullscreen?: () => Promise<void>;
              };
              const isFS = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
              if (isFS) {
                const exitFS = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
                if (exitFS) exitFS.call(doc).catch(() => { /* ignore */ });
              }
            } catch (err) {
              console.warn("Fullscreen exit error", err);
            }
          }}
          className="fixed top-4 right-4 p-3 bg-black/20 hover:bg-black/50 border border-white/20 text-white/50 hover:text-white rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="Exit Zen Mode"
        >
          <Minimize size={16} />
        </button>
      )}
      <Suspense fallback={null}>
        <AnimatePresence>
          {fullScreenId && (
            <FullScreenModal
              key="fullscreen-modal"
              nodeId={fullScreenId}
              onClose={() => setFullScreenId(null)}
            />
          )}
        </AnimatePresence>
        <FileMenu />
        <CommandPalette />
        <ConfirmDialog />
      </Suspense>
    </div>
  );
}
