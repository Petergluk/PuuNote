import { useTranslation } from "react-i18next";
import {
  INITIAL_NODES,
  TUTORIAL_DOCUMENT_TITLE,
  withTutorialMetadata,
} from "../constants";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { PuuDocumentMetadata } from "../types";

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTutorialId: string | null;
  createNewFile: (
    nodes: typeof INITIAL_NODES,
    title: string,
    metadata?: PuuDocumentMetadata,
  ) => void;
  markTutorialDocument: (documentId: string | null) => void;
  switchFile: (fileId: string) => Promise<void>;
}

export function TutorialModal({
  isOpen,
  onClose,
  existingTutorialId,
  createNewFile,
  markTutorialDocument,
  switchFile,
}: TutorialModalProps) {
  const { t } = useTranslation();
  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app-bg/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-modal-title"
        tabIndex={-1}
        className="bg-app-panel border border-app-border rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="tutorial-modal-title" className="text-lg font-serif">
          {t("Tutorial Exists Title")}
        </h3>
        <p className="text-sm text-app-text-muted">
          {t("Tutorial Exists Msg")}
        </p>
        <div className="flex flex-col gap-2 mt-4 font-sans">
          <button
            onClick={() => {
              if (existingTutorialId) switchFile(existingTutorialId);
              onClose();
            }}
            className="w-full text-left px-4 py-3 bg-app-card hover:bg-app-card-hover border border-app-border rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{t("Open old tutorial")}</span>
            <span className="text-app-text-muted text-xs">&rarr;</span>
          </button>

          <button
            onClick={() => {
              createNewFile(
                INITIAL_NODES,
                `${TUTORIAL_DOCUMENT_TITLE} (New)`,
                withTutorialMetadata(),
              );
              onClose();
            }}
            className="w-full text-left px-4 py-3 bg-app-card hover:bg-app-card-hover border border-app-border rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{t("Create new tutorial")}</span>
            <span className="text-app-text-muted text-xs">&rarr;</span>
          </button>

          <button
            onClick={() => {
              useAppStore
                .getState()
                .openConfirm(t("Reset Tutorial Confirm"), async () => {
                  const tutorialNodes = INITIAL_NODES.map((n, i) => ({
                    ...n,
                    order: n.order ?? i,
                    id: n.id,
                  }));
                  if (existingTutorialId) {
                    await switchFile(existingTutorialId);
                  }
                  const state = useAppStore.getState();
                  state.setNodesRaw(tutorialNodes);
                  state.setActiveId(tutorialNodes[0]?.id || null);
                  markTutorialDocument(
                    existingTutorialId || useAppStore.getState().activeFileId,
                  );
                });
              onClose();
            }}
            className="w-full text-left px-4 py-3 bg-app-card hover:bg-red-900/20 hover:text-red-500 hover:border-red-500/50 border border-app-border rounded-lg transition-colors flex items-center justify-between"
          >
            <span>{t("Reset tutorial")}</span>
            <span className="text-app-text-muted text-xs">&rarr;</span>
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-2 text-sm text-app-text-muted hover:text-app-text-primary transition-colors text-center p-2"
        >
          {t("Cancel")}
        </button>
      </div>
    </div>
  );
}
