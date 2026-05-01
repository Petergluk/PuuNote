import { useState, useRef, useEffect, useMemo } from "react";
import { Minimize2 } from "lucide-react";
import { motion } from "motion/react";

import { PuuNode } from "../types";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { useAppStore } from "../store/useAppStore";
import { SafeMarkdown } from "./SafeMarkdown";
import { PROSE_FULL } from "../utils/proseClasses";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";

import { useFocusTrap } from "../hooks/useFocusTrap";

export const FullScreenModal = ({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) => {
  const nodes = useAppStore((s) => s.nodes);
  const updateContent = useAppStore((s) => s.updateContent);
  const [localActiveId, setLocalActiveId] = useState(nodeId);
  const activeElRef = useRef<HTMLDivElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);

  useEffect(() => {
    if (activeElRef.current) {
      activeElRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const targetNode = nodes.find((n: PuuNode) => n.id === nodeId);
  const visibleNodes = useMemo(() => {
    if (!targetNode) return [];

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    // Basic cycle check
    const isDescendant = (
      childId: string,
      ancestorId: string | null,
    ): boolean => {
      let currentId = ancestorId;
      while (currentId) {
        if (currentId === childId) return true;
        const node = nodeMap.get(currentId);
        currentId = node?.parentId ?? null;
      }
      return false;
    };

    let targetParentId = targetNode.parentId;
    if (isDescendant(nodeId, targetParentId)) {
      targetParentId = null;
    }

    const columnNodes = nodes.filter(
      (n: PuuNode) => n.parentId === targetParentId,
    );
    return columnNodes.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [nodes, nodeId, targetNode]);

  const toggleCheckbox = useToggleCheckbox();

  if (!targetNode) return null;

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Focus mode"
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] bg-app-bg flex flex-col outline-none"
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 p-2 text-app-text-muted hover:text-app-text-primary bg-app-card/50 hover:bg-app-card border border-app-border/50 hover:border-app-border rounded-full transition-all backdrop-blur-sm"
        title="Close Focus Mode (Esc)"
        aria-label="Close Focus Mode"
      >
        <Minimize2 size={20} />
      </button>

      <div className="hide-scrollbar flex-1 overflow-auto px-6 py-14 sm:px-10 lg:px-16 lg:py-20 max-w-4xl mx-auto w-full flex flex-col gap-5 relative pb-[35vh]">
        {visibleNodes.map((n: PuuNode) => {
          const isLocalActive = n.id === localActiveId;
          return (
            <div
              key={n.id}
              ref={n.id === nodeId ? activeElRef : null}
              onClick={() => setLocalActiveId(n.id)}
              className={`rounded border px-6 py-4 transition-all duration-200 cursor-text ${
                isLocalActive
                  ? "border-transparent bg-transparent opacity-100"
                  : "border-transparent opacity-35 hover:border-app-border hover:opacity-80"
              }`}
            >
              {isLocalActive ? (
                <AutoSizeTextarea
                  value={n.content}
                  onChange={(val: string) => updateContent(n.id, val)}
                  autoFocus
                  dataAutoFocus
                  placeholder="Type here..."
                  className="block w-full resize-none overflow-hidden outline-none bg-transparent font-sans text-app-text-primary leading-relaxed lg:text-lg"
                />
              ) : (
                <div className={PROSE_FULL}>
                  <SafeMarkdown
                    onToggleCheckbox={(idx, val) =>
                      toggleCheckbox(n.id, n.content || "", idx, val)
                    }
                  >
                    {n.content || "*Empty card...*"}
                  </SafeMarkdown>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
