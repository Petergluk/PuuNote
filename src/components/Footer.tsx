import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { Keyboard, Columns, History, Combine } from "lucide-react";
import { toast } from "sonner";
import {
  getLocalizedInitialNodes,
  TUTORIAL_DOCUMENT_TITLE,
  isTutorialDocument,
  withTutorialMetadata,
} from "../constants";
import { useAppStore } from "../store/useAppStore";
import {
  buildTreeIndex,
  computeAncestorPathFromIndex,
  computeDescendantIdsFromIndex,
} from "../utils/tree";
import { useFileSystemActions } from "../hooks/useFileSystem";
import {
  fitColumnWidthForCount,
  fitOneFewerColumn,
  fitOneMoreColumn,
  getAvailableColumnWidth,
} from "../utils/columnSizing";
import { ShortcutsModal } from "./ShortcutsModal";
import { TutorialModal } from "./TutorialModal";
import { SnapshotPanel } from "./SnapshotPanel";
import { getMergeSelectionState } from "../utils/mergeSelection";
import { usePluginFooterActions } from "../plugins/registry";
import { PluginDropdownAction } from "./PluginDropdownAction";

export function Footer() {
  const { t, i18n } = useTranslation();
  const nodes = useAppStore((s) => s.nodes);
  const activeId = useAppStore((s) => s.activeId);
  const colWidth = useAppStore((s) => s.colWidth);
  const setColWidth = useAppStore((s) => s.setColWidth);
  const documents = useAppStore((s) => s.documents);
  const activeFileId = useAppStore((s) => s.activeFileId);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const saveStatus = useAppStore((s) => s.saveStatus);

  const { createNewFile, switchFile } = useFileSystemActions();

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSnapshotsOpen, setIsSnapshotsOpen] = useState(false);
  const [tutorialModalState, setTutorialModalState] = useState<
    "closed" | "exists"
  >("closed");
  const [existingTutorialId, setExistingTutorialId] = useState<string | null>(
    null,
  );

  const branchStats = useMemo(() => {
    const treeIndex = buildTreeIndex(nodes);
    let targetNodes = nodes;
    let activePathLength = 0;
    let cardsCount = nodes.length;

    if (activeId) {
      activePathLength = computeAncestorPathFromIndex(
        treeIndex,
        activeId,
      ).length;
      const descendantIds = computeDescendantIdsFromIndex(treeIndex, activeId);
      const idsToInclude = new Set([activeId, ...descendantIds]);
      targetNodes = nodes.filter((n) => idsToInclude.has(n.id));
      cardsCount = descendantIds.size + 1;
    }

    const wordCount = targetNodes.reduce((acc, n) => {
      const words = n.content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      return acc + words.length;
    }, 0);

    return { activePathLength, cardsCount, wordCount };
  }, [nodes, activeId]);

  const mergeSelection = useMemo(
    () => getMergeSelectionState(nodes, activeId, selectedIds),
    [activeId, nodes, selectedIds],
  );

  const mergeTitle = mergeSelection.ok
    ? `Merge ${mergeSelection.orderedIds.length} selected cards`
    : mergeSelection.reason || "Selected cards cannot be merged.";

  const handleMergeSelected = () => {
    if (!mergeSelection.ok || !mergeSelection.masterId) {
      toast.warning(mergeTitle);
      return;
    }

    const { masterId, nodeIdsToMerge, orderedIds } = mergeSelection;
    useAppStore
      .getState()
      .openConfirm(`Merge ${orderedIds.length} selected cards?`, () => {
        useAppStore.getState().mergeNodes(masterId, nodeIdsToMerge);
      });
  };

  const saveStatusClass =
    saveStatus === "error"
      ? "text-red-500"
      : saveStatus === "saved"
        ? "text-green-600 dark:text-green-400"
        : "text-app-accent";

  const markTutorialDocument = (documentId: string | null) => {
    if (!documentId) return;
    useAppStore.setState((state) => ({
      documents: state.documents.map((document) =>
        document.id === documentId
          ? {
              ...document,
              metadata: withTutorialMetadata(document.metadata),
            }
          : document,
      ),
    }));
  };

  const resetTutorialNodes = (documentId: string | null) => {
    const tutorialNodes = getLocalizedInitialNodes(i18n.language).map((n, i) => ({
      ...n,
      order: n.order ?? i,
      id: n.id,
    }));
    const state = useAppStore.getState();
    state.setNodesRaw(tutorialNodes);
    state.setActiveId(tutorialNodes[0]?.id || null);
    markTutorialDocument(documentId);
  };

  return (
    <>
      <footer className="h-10 shrink-0 border-t border-app-border bg-app-panel px-2 sm:px-6 flex items-center justify-between z-40 transition-colors duration-300">
        {" "}
        <div className="flex gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase hidden lg:flex">
          {" "}
          {selectedIds.length > 1 ? (
            <div className="flex items-center gap-3">
              <span className="text-app-accent font-semibold">
                SELECTED: {selectedIds.length}
              </span>
              <button
                type="button"
                onClick={handleMergeSelected}
                aria-disabled={!mergeSelection.ok}
                title={mergeTitle}
                aria-label={t("Merge selected cards")}
                className={`inline-flex h-6 items-center gap-1.5 rounded border px-2 text-[10px] font-semibold transition-colors ${
                  mergeSelection.ok
                    ? "border-app-accent text-app-accent hover:bg-app-card-hover"
                    : "border-app-border text-app-text-muted opacity-70 hover:bg-app-card-hover"
                }`}
              >
                <Combine size={13} />
                MERGE
              </button>
            </div>
          ) : (
            <>
              <span>
                {activeId ? "BRANCH CARDS:" : "CARDS:"} {branchStats.cardsCount}
              </span>{" "}
              <span>
                {activeId ? "BRANCH WORDS:" : "WORDS:"} {branchStats.wordCount}
              </span>{" "}
              {activeId && (
                <span>DEPTH: {branchStats.activePathLength}</span>
              )}{" "}
            </>
          )}
        </div>{" "}
        <div className="flex items-center gap-4 sm:gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase ml-auto">
          {" "}
          <span className={`${saveStatusClass} whitespace-nowrap`}>
            {t(`saveStatus.${saveStatus}`)}
          </span>
          <div className="flex items-center gap-2 border-r border-app-border pr-4 mr-2 hidden sm:flex">
            {" "}
            <button
              onClick={() => {
                setColWidth(
                  fitColumnWidthForCount(getAvailableColumnWidth(), 3),
                );
              }}
              className="text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
              title={t("Fit 3 columns")}
              aria-label={t("Fit 3 columns")}
            >
              <Columns size={16} />
            </button>{" "}
            <button
              onClick={() => {
                setColWidth(
                  fitOneMoreColumn(getAvailableColumnWidth(), colWidth),
                );
              }}
              className="w-5 h-5 flex items-center justify-center rounded bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer text-xs font-mono"
              title={t("Decrease width")}
              aria-label={t("Decrease width")}
            >
              -
            </button>
            <input
              type="range"
              min="220"
              max="1200"
              value={colWidth}
              onChange={(e) => setColWidth(Number(e.target.value))}
              className="w-20 lg:w-32 accent-[#a3966a] cursor-pointer"
              title={t("Col Width")}
              aria-label={t("Col Width")}
            />{" "}
            <button
              onClick={() => {
                setColWidth(
                  fitOneFewerColumn(getAvailableColumnWidth(), colWidth),
                );
              }}
              className="w-5 h-5 flex items-center justify-center rounded bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer text-xs font-mono"
              title={t("Increase width")}
              aria-label={t("Increase width")}
            >
              +
            </button>
          </div>{" "}
          
          {/* Dynamic Plugin Footer Actions */}
          {usePluginFooterActions().map(action => (
            action.dropdownItems && action.dropdownItems.length > 0 ? (
              <PluginDropdownAction
                key={action.id}
                action={action}
                dropup={true}
                buttonClassName="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
              />
            ) : (
              <button
                key={action.id}
                onClick={action.onClick}
                className="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
                title={action.label}
                aria-label={action.label}
              >
                <action.icon size={16} />
              </button>
            )
          ))}

          <button
            onClick={() => setIsSnapshotsOpen(true)}
            className="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
            title="Snapshots"
            aria-label="Snapshots"
          >
            <History size={16} />
          </button>{" "}
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-2 text-app-text-secondary hover:text-app-text-primary transition-colors bg-app-card py-1 px-3 rounded border border-app-border hover:bg-app-card-hover cursor-pointer"
            title={t("Keyboard Shortcuts")}
            aria-label={t("Keyboard Shortcuts")}
          >
            <Keyboard size={16} />
          </button>{" "}
          <button
            onClick={() => {
              const existingDoc = documents.find(isTutorialDocument);
              const activeDoc = documents.find((d) => d.id === activeFileId);

              if (isTutorialDocument(activeDoc)) {
                // If currently open document is named tutorial, prompt to overwrite
                useAppStore
                  .getState()
                  .openConfirm(t("Restore Tutorial Confirm"), () => {
                    resetTutorialNodes(activeFileId);
                  });
              } else if (existingDoc) {
                // Not active, but exists
                setExistingTutorialId(existingDoc.id);
                setTutorialModalState("exists");
              } else {
                // Does not exist, create silently
                createNewFile(
                  getLocalizedInitialNodes(i18n.language),
                  TUTORIAL_DOCUMENT_TITLE,
                  withTutorialMetadata(),
                );
              }
            }}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-app-card border border-app-border hover:bg-app-card-hover text-app-text-secondary hover:text-app-text-primary font-bold text-xs transition-colors shadow-inner cursor-pointer"
            title={t("Reset to Tutorial")}
            aria-label={t("Reset to Tutorial")}
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
        markTutorialDocument={markTutorialDocument}
        switchFile={switchFile}
      />
    </>
  );
}
