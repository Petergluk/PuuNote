import { useEffect, useRef, Suspense, lazy } from "react";
import { AnimatePresence } from "motion/react";
import { Toaster, toast } from "sonner";
import { isFullscreen, exitFullscreen } from "./utils/fullscreen";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { FileMenu } from "./components/FileMenu";
import { JobPanel } from "./components/JobPanel";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { FloatingCardActions } from "./components/FloatingCardActions";
import { SettingsPanel } from "./components/SettingsPanel";
import { PluginsPanel } from "./components/PluginsPanel";
import { PluginOverlays } from "./components/PluginOverlays";

import { Minimize } from "lucide-react";

const FullScreenModal = lazy(() =>
  import("./components/FullScreenModal").then((module) => ({
    default: module.FullScreenModal,
  })),
);
const TimelineView = lazy(() =>
  import("./components/TimelineView").then((module) => ({
    default: module.TimelineView,
  })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((module) => ({
    default: module.CommandPalette,
  })),
);

import { useFileSystemInit } from "./hooks/useFileSystem";
import { usePreferencesInit } from "./hooks/usePreferences";
import { useAppHotkeys } from "./hooks/useAppHotkeys";
import { useGlobalHotkeys } from "./hooks/useGlobalHotkeys";
import { useAppStore } from "./store/useAppStore";
import { useFileImport } from "./hooks/useFileImport";
import { BoardView } from "./components/BoardView";
import { Sidebar } from "./components/Sidebar";
import { useAppCommands } from "./hooks/useAppCommands";
import { useFileSystemActions } from "./hooks/useFileSystemActions";

const CssVariables = () => {
  const colWidth = useAppStore((s) => s.colWidth);
  const inactiveCardDim = useAppStore((s) => s.inactiveCardDim);
  const inactiveCardOpacity = Math.max(
    0.08,
    Math.min(1, (50 + inactiveCardDim) / 100),
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--col-width", `${colWidth}px`);
    document.documentElement.style.setProperty("--inactive-card-opacity", `${inactiveCardOpacity}`);
  }, [colWidth, inactiveCardOpacity]);

  return null;
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appCommands = useAppCommands();
  const { switchFile } = useFileSystemActions();

  /* Initialize Managers */
  useFileSystemInit();
  usePreferencesInit();
  useGlobalHotkeys(appCommands);
  const { handleKeyDown } = useAppHotkeys(containerRef);
  const uiMode = useAppStore((s) => s.uiMode);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const fullScreenId = useAppStore((s) => s.fullScreenId);
  const setFullScreenId = useAppStore((s) => s.setFullScreenId);

  const { handleImport } = useFileImport();

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!isFullscreen(document)) {
        useAppStore.getState().setUiMode("normal");
      }
    };
    const onBlur = () => {
      useAppStore.getState().setDraggedId(null);
    };
    const onDragEnd = () => {
      useAppStore.getState().setDraggedId(null);
    };
    const onNavigate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { title, id } = customEvent.detail || {};
      const { documents } = useAppStore.getState();
      let targetDoc = null;
      if (id) {
         targetDoc = documents.find(d => d.id === id);
      }
      if (!targetDoc && title) {
         targetDoc = documents.find(d => d.title.toLowerCase() === decodeURIComponent(title).toLowerCase());
      }
      if (targetDoc) {
         switchFile(targetDoc.id);
      } else {
         toast.error("Document not found");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("blur", onBlur);
    document.addEventListener("mouseleave", onBlur);
    window.addEventListener("dragend", onDragEnd);
    window.addEventListener("puunote-navigate", onNavigate);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("blur", onBlur);
      document.removeEventListener("mouseleave", onBlur);
      window.removeEventListener("dragend", onDragEnd);
      window.removeEventListener("puunote-navigate", onNavigate);
    };
  }, [switchFile]);

  return (
    <div
      ref={containerRef}
      id="puunote-app-container"
      className="min-h-screen h-screen bg-app-bg text-app-text-primary font-sans flex flex-col overflow-hidden outline-none transition-colors duration-300"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onPointerDown={(e) => {
        /* If clicked directly on the main background areas (not on cards) */
        if (
          (e.target as HTMLElement).id === "puunote-app-container" ||
          (e.target as HTMLElement).id === "main-scroller" ||
          (e.target as HTMLElement).classList.contains("col-spacer")
        ) {
          useAppStore.getState().clearSelection();
          useAppStore.getState().setActiveId(null);
          useAppStore.getState().setEditingId(null);
        }
      }}
    >
      <Toaster theme="system" position="bottom-right" richColors />{" "}
      <CssVariables />
      {uiMode !== "zen" && <Header handleImport={handleImport} />}{" "}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        <Sidebar />
        <main
          id="main-scroller"
          className={`flex-1 overflow-x-auto h-full w-full flex items-start relative bg-app-bg transition-colors duration-300 snap-x snap-mandatory sm:snap-none ${!timelineOpen ? "overflow-y-hidden" : "overflow-y-auto"}`}
        >
          <BoardView />
          {timelineOpen && (
            <Suspense
              fallback={
                <div className="p-8 text-app-text-muted">Loading timeline...</div>
              }
            >
              <TimelineView />
            </Suspense>
          )}
        </main>
      </div>
      {!timelineOpen && (
        <ErrorBoundary>
          <FloatingCardActions />
        </ErrorBoundary>
      )}{" "}
      {uiMode !== "zen" && <Footer />}{" "}
      {uiMode === "zen" && (
        <button
          style={{ zIndex: 99999, pointerEvents: "auto" }}
          onClick={(e) => {
            e.stopPropagation();
            useAppStore.getState().setUiMode("normal");
            try {
              if (isFullscreen(document)) {
                const exitFunc = exitFullscreen(document);
                if (exitFunc && exitFunc.catch) {
                  exitFunc.catch(() => {
                    /* ignore */
                  });
                }
              }
            } catch (err) {
              console.warn("Fullscreen exit error", err);
            }
          }}
          className="fixed top-3 right-3 p-2 sm:top-4 sm:right-4 sm:p-3 bg-black/20 hover:bg-black/50 border border-white/20 text-white/50 hover:text-white rounded-full backdrop-blur-md transition-all cursor-pointer shadow-lg"
          title="Exit Zen Mode"
          aria-label="Exit Zen Mode"
        >
          <Minimize size={14} />
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
        <ErrorBoundary>
          <FileMenu />
        </ErrorBoundary>
        <ErrorBoundary>
          <CommandPalette />
        </ErrorBoundary>
        <ErrorBoundary>
          <JobPanel />
        </ErrorBoundary>
        <ErrorBoundary>
          <SettingsPanel />
        </ErrorBoundary>
        <ErrorBoundary>
          <PluginsPanel />
        </ErrorBoundary>
        <ErrorBoundary>
          <ConfirmDialog />
        </ErrorBoundary>
        <ErrorBoundary>
          <PluginOverlays />
        </ErrorBoundary>
      </Suspense>
    </div>
  );
}

// force update 2