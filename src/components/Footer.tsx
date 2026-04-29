import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Keyboard, Columns, History } from "lucide-react";
import { INITIAL_NODES, TUTORIAL_DOCUMENT_TITLE } from "../constants";
import { useAppStore } from "../store/useAppStore";
import { computeActivePath, computeDescendantIds } from "../utils/tree";
import { useFileSystemActions } from "../hooks/useFileSystem";
import { ShortcutsModal } from "./ShortcutsModal";
import { TutorialModal } from "./TutorialModal";
import { SnapshotPanel } from "./SnapshotPanel";

export function Footer() {
  const { t } = useTranslation();
  const nodes = useAppStore((s) => s.nodes);
  const activeId = useAppStore((s) => s.activeId);
  const colWidth = useAppStore((s) => s.colWidth);
  const documents = useAppStore((s) => s.documents);
  const activeFileId = useAppStore((s) => s.activeFileId);

  const { createNewFile, switchFile } = useFileSystemActions();

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [tutorialModalState, setTutorialModalState] = useState<
    "closed" | "exists"
  >("closed");
  const [existingTutorialId, setExistingTutorialId] = useState<string | null>(
    null,
  );

  const activePathLength = useMemo(
    () => computeActivePath(nodes, activeId).length,
    [nodes, activeId],
  );

  const wordCount = useMemo(() => {
    let targetNodes = nodes;

    // If there's an active node, only count words for it and its descendants
    if (activeId) {
      const descendantIds = computeDescendantIds(nodes, activeId);
      const idsToInclude = new Set([activeId, ...descendantIds]);
      targetNodes = nodes.filter((n) => idsToInclude.has(n.id));
    }

    return targetNodes.reduce((acc, n) => {
      const words = n.content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      return acc + words.length;
    }, 0);
  }, [nodes, activeId]);

  const cardsCount = useMemo(() => {
    if (!activeId) return nodes.length;
    const descendantIds = computeDescendantIds(nodes, activeId);
    return descendantIds.size + 1;
  }, [nodes, activeId]);

  return (
    <>
      <footer className="h-10 shrink-0 border-t border-app-border bg-app-panel px-2 sm:px-6 flex items-center justify-between z-40 transition-colors duration-300">
        {" "}
        <div className="flex gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase hidden lg:flex">
          {" "}
          <span>
            {activeId ? "BRANCH CARDS:" : "CARDS:"} {cardsCount}
          </span>{" "}
          <span>
            {activeId ? "BRANCH WORDS:" : "WORDS:"} {wordCount}
          </span>{" "}
          {activeId && <span>DEPTH: {activePathLength}</span>}{" "}
        </div>{" "}
        <div className="flex items-center gap-4 sm:gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase ml-auto">
          {" "}
          <div className="flex items-center gap-2 border-r border-app-border pr-4 mr-2 hidden sm:flex">
            {" "}
            <button
              onClick={() => {
                const s = document.getElementById("main-scroller");
                const aw = s ? s.clientWidth : window.innerWidth;
                const cw = Math.floor(aw / 3) - 32;
                useAppStore.setState({
                  colWidth: Math.max(220, Math.min(1200, cw)),
                });
              }}
              className="text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
              title={t("Fit 3 columns")}
            >
              <Columns size={16} />
            </button>{" "}
            <button
              onClick={() => {
                const s = document.getElementById("main-scroller");
                const aw = s ? s.clientWidth : window.innerWidth;
                const cC = aw / (useAppStore.getState().colWidth + 32);
                const tC = Math.floor(cC + 0.1) + 1;
                const cw = aw / tC - 32;
                useAppStore.setState({
                  colWidth: Math.max(220, Math.min(1200, cw)),
                });
              }}
              className="w-5 h-5 flex items-center justify-center rounded bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer text-xs font-mono"
              title={t("Decrease width")}
            >
              -
            </button>
            <input
              type="range"
              min="220"
              max="1200"
              value={colWidth}
              onChange={(e) =>
                useAppStore.setState({ colWidth: Number(e.target.value) })
              }
              className="w-20 lg:w-32 accent-[#a3966a] cursor-pointer"
              title={t("Col Width")}
            />{" "}
            <button
              onClick={() => {
                const s = document.getElementById("main-scroller");
                const aw = s ? s.clientWidth : window.innerWidth;
                const cC = aw / (useAppStore.getState().colWidth + 32);
                let tC = Math.ceil(cC - 0.1) - 1;
                tC = Math.max(1, tC);
                const cw = aw / tC - 32;
                useAppStore.setState({
                  colWidth: Math.max(220, Math.min(1200, cw)),
                });
              }}
              className="w-5 h-5 flex items-center justify-center rounded bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer text-xs font-mono"
              title={t("Increase width")}
            >
              +
            </button>
          </div>{" "}
          <button
            onClick={() => setIsSnapshotsOpen(true)}
            className="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
            title="Snapshots"
          >
            <History size={16} />
          </button>{" "}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
            title={t("Keyboard Shortcuts")}
          >
            <Keyboard size={16} />
          </button>{" "}
          <button
            onClick={() => {
              const existingDoc = documents.find(
                (d) => d.title === TUTORIAL_DOCUMENT_TITLE,
              );

              if (
                documents.find((d) => d.id === activeFileId)?.title ===
                TUTORIAL_DOCUMENT_TITLE
              ) {
                // If currently open document is named tutorial, prompt to overwrite
                useAppStore
                  .getState()
                  .openConfirm(t("Restore Tutorial Confirm"), () => {
                    const tutorialNodes = INITIAL_NODES.map((n, i) => ({
                      ...n,
                      order: n.order ?? i,
                      id: n.id,
                    }));
                    const state = useAppStore.getState();
                    state.setNodesRaw(tutorialNodes);
                    state.setActiveId(tutorialNodes[0]?.id || null);
                  });
              } else if (existingDoc) {
                // Not active, but exists
                setExistingTutorialId(existingDoc.id);
                setTutorialModalState("exists");
              } else {
                // Does not exist, create silently
                createNewFile(INITIAL_NODES, TUTORIAL_DOCUMENT_TITLE);
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-secondary hover:text-app-text-primary font-bold text-xs transition-colors shadow-inner cursor-pointer"
            title={t("Reset to Tutorial")}
          >
            ?
          </button>{" "}
        </div>{" "}
      </footer>
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <SnapshotPanel
        isOpen={isSnapshotsOpen}
        onClose={() => setIsSnapshotsOpen(false)}
      />

      <TutorialModal
        isOpen={tutorialModalState === "exists"}
        onClose={() => setTutorialModalState("closed")}
        existingTutorialId={existingTutorialId}
        createNewFile={createNewFile}
        switchFile={switchFile}
      />
    </>
  );
}
