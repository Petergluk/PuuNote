import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { buildTreeIndex, computeDescendantIdsFromIndex } from "../utils/tree";

export const FindReplaceModal: React.FC = () => {
  const { t } = useTranslation();
  const isOpen = useAppStore((s) => s.findReplaceOpen);
  const close = () => useAppStore.getState().setFindReplaceOpen(false);
  
  const nodes = useAppStore((s) => s.nodes);
  const selectedIds = useAppStore((s) => s.selectedIds);
  const activeId = useAppStore((s) => s.activeId);
  const updateNodes = useAppStore((s) => s.setNodes);

  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");

  const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, close);

  if (!isOpen) return null;

  const targetRootIds = selectedIds.length > 1 ? selectedIds : (activeId ? [activeId] : []);
  const hasSelection = targetRootIds.length > 0;
  
  const handleReplaceAll = () => {
    if (!findText) return;

    let targetIds = new Set<string>();

    if (hasSelection) {
      const treeIndex = buildTreeIndex(nodes);
      targetRootIds.forEach((id) => {
        targetIds.add(id);
        const descendants = computeDescendantIdsFromIndex(treeIndex, id);
        descendants.forEach(d => targetIds.add(d));
      });
    } else {
      nodes.forEach(n => targetIds.add(n.id));
    }

    let hasUpdates = false;

    const updates: { id: string; content: string }[] = [];

    const newNodes = nodes.map(node => {
      if (targetIds.has(node.id) && (node.content || "").includes(findText)) {
        const newText = (node.content || "").split(findText).join(replaceText);
        if (newText !== node.content) {
          hasUpdates = true;
          updates.push({ id: node.id, content: newText });
          return { ...node, content: newText };
        }
      }
      return node;
    });

    if (hasUpdates) {
      updateNodes(newNodes);
      updates.forEach(u => {
        window.dispatchEvent(new CustomEvent('sandbox:nodeChanged', { detail: { id: u.id, content: u.content } }));
      });
    }
    close();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-app-panel border border-app-border rounded-xl shadow-2xl p-6 max-w-sm w-full relative"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6">
            <h3 className="text-lg font-medium text-app-text-primary mb-2">
              {t("Find and Replace")}
            </h3>
            <p className="text-sm text-app-text-secondary mb-4">
              {hasSelection ? t("Scope: Selected branch") : t("Scope: Entire document")}
            </p>

            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-app-text-secondary mb-1">
                  {t("Find")}
                </label>
                <input
                  type="text"
                  autoFocus
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleReplaceAll();
                    }
                  }}
                  className="w-full px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-inset focus:ring-app-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-app-text-secondary mb-1">
                  {t("Replace with")}
                </label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleReplaceAll();
                    }
                  }}
                  className="w-full px-3 py-2 bg-app-input-bg border border-app-border rounded-md text-sm text-app-text-primary focus:outline-none focus:ring-1 focus:ring-inset focus:ring-app-accent"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={close}
              className="px-4 py-2 text-sm font-medium text-app-text-secondary bg-app-card hover:bg-app-card-hover border border-app-border rounded transition-colors"
            >
              {t("Cancel")}
            </button>
            <button
              onClick={handleReplaceAll}
              disabled={!findText}
              className="px-4 py-2 text-sm font-medium text-white bg-app-accent hover:bg-app-accent-hover rounded transition-colors disabled:opacity-50"
            >
              {t("Replace All")}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
