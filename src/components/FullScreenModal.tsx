import { useState, useRef, useEffect, useMemo } from "react";
import { Minimize2 } from "lucide-react";
import { motion } from "motion/react";

import { PuuNode } from "../types";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { useAppStore } from "../store/useAppStore";
import { SafeMarkdown } from "./SafeMarkdown";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";
import { getDepthFirstNodes } from "../utils/tree";

export const FullScreenModal = ({
  nodeId,
  onClose,
}: {
  nodeId: string;
  onClose: () => void;
}) => {
  const nodes = useAppStore((s) => s.nodes);
  const updateContent = useAppStore((s) => s.updateContent);
  const focusModeScope = useAppStore((s) => s.focusModeScope);
  const [localActiveId, setLocalActiveId] = useState(nodeId);
  const activeElRef = useRef<HTMLDivElement>(null);

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
    if (focusModeScope === "single") return [targetNode];

    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    // Basic cycle check to prevent infinite loops or broken UI if data provides a cycle
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
      console.warn("Cycle detected in node hierarchy, falling back to root");
      targetParentId = null;
    }

    if (focusModeScope === "branchLevel") {
      const columnNodes = nodes.filter(
        (n: PuuNode) => n.parentId === targetParentId,
      );
      return columnNodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    const depthFirstNodes = getDepthFirstNodes(nodes);
    const targetDepth =
      depthFirstNodes.find((node) => node.id === nodeId)?.depth ?? 0;
    return depthFirstNodes.filter((node) => node.depth === targetDepth);
  }, [focusModeScope, nodes, nodeId, targetNode]);

  const toggleCheckbox = useToggleCheckbox();

  if (!targetNode) return null;

  return (
    <motion.div
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
                  placeholder="Type here..."
                  className="block w-full resize-none overflow-hidden outline-none bg-transparent font-sans text-app-text-primary leading-relaxed lg:text-lg"
                />
              ) : (
                <div className="prose dark:prose-invert max-w-none prose-base prose-headings:font-serif prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary prose-headings:font-normal prose-headings:tracking-wide prose-p:text-app-text-secondary dark:prose-p:text-app-text-muted prose-p:leading-relaxed prose-p:my-2 prose-a:text-app-accent prose-strong:text-app-text-primary dark:prose-strong:text-app-text-secondary prose-ul:text-app-text-secondary dark:prose-ul:text-app-text-muted prose-ol:text-app-text-secondary dark:prose-ol:text-app-text-muted prose-h1:text-[2em] prose-h2:text-[1.6em] prose-h3:text-[1.25em] prose-h4:text-[1.05em] prose-h4:opacity-80 prose-h5:font-sans prose-h5:text-[1em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75 prose-h6:font-mono prose-h6:text-[0.9em] prose-h6:opacity-60 prose-a:text-app-accent prose-hr:border-t-2 prose-hr:border-app-border prose-hr:my-4 prose-code:text-app-accent prose-code:bg-app-card dark:prose-code:bg-app-card-hover prose-code:px-1 prose-code:rounded">
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
