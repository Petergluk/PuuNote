import { useState, useRef, useEffect, useMemo } from "react";
import { Minimize2, Copy, Download, Check } from "lucide-react";
import { motion } from "motion/react";

import { PuuNode } from "../types";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { WysiwygEditor } from "./WysiwygEditor";
import { useAppStore } from "../store/useAppStore";
import { SafeMarkdown } from "./SafeMarkdown";
import { PROSE_FULL } from "../utils/proseClasses";
import { COPY_SUCCESS_TIMEOUT_MS, FULLSCREEN_IDLE_TIMEOUT_MS } from "../constants";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";

import { useFocusTrap } from "../hooks/useFocusTrap";
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
  const editorMode = useAppStore((s) => s.editorMode);
  const focusModeScope = useAppStore((s) => s.focusModeScope);
  const [localActiveId, setLocalActiveId] = useState<string | null>(nodeId);
  const activeElRef = useRef<HTMLDivElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true, onClose);
  
  const [copied, setCopied] = useState(false);
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);

  const handleUserActivity = () => {
    setIsIdle(false);
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), FULLSCREEN_IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    if (activeElRef.current && localActiveId === nodeId) {
      activeElRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      handleUserActivity();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleUserActivity();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, []);

  const targetNode = nodes.find((n: PuuNode) => n.id === nodeId);
  const visibleNodes = useMemo(() => {
    if (!targetNode) return [];

    if (focusModeScope === "single") return [targetNode];

    if (focusModeScope === "branchLevel") {
      // All siblings (nodes with the same parent)
      const parentId = targetNode.parentId;
      return nodes
        .filter((n: PuuNode) => n.parentId === parentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    if (focusModeScope === "column") {
      // Entire column (all nodes at the exact same depth)
      const ordered = getDepthFirstNodes(nodes);
      const augmentedTarget = ordered.find((n) => n.id === targetNode.id);
      const depth = augmentedTarget ? augmentedTarget.depth : 0;
      return ordered.filter((n) => n.depth === depth);
    }

    return [targetNode];
  }, [nodes, targetNode, focusModeScope]);

  const toggleCheckbox = useToggleCheckbox();

  if (!targetNode) return null;

  const getCombinedText = () => {
    return visibleNodes.map((n: PuuNode) => n.content || "").join("\n\n");
  };

  const handleCopy = async () => {
    const text = getCombinedText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_SUCCESS_TIMEOUT_MS);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const handleExport = () => {
    const text = getCombinedText();
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `puunote-export-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
      onClick={() => setLocalActiveId(null)}
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
    >
      <div className={`absolute top-6 right-6 z-10 flex items-center gap-2 transition-opacity duration-1000 ${isIdle ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(); }}
          className="p-2 text-app-text-muted hover:text-app-text-primary bg-app-card/50 hover:bg-app-card border border-app-border/50 hover:border-app-border rounded-full transition-all backdrop-blur-sm"
          title="Copy Markdown"
          aria-label="Copy Markdown"
        >
          {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleExport(); }}
          className="p-2 text-app-text-muted hover:text-app-text-primary bg-app-card/50 hover:bg-app-card border border-app-border/50 hover:border-app-border rounded-full transition-all backdrop-blur-sm"
          title="Export as Markdown"
          aria-label="Export as Markdown"
        >
          <Download size={20} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="p-2 text-app-text-muted hover:text-app-text-primary bg-app-card/50 hover:bg-app-card border border-app-border/50 hover:border-app-border rounded-full transition-all backdrop-blur-sm"
          title="Close Focus Mode (Esc)"
          aria-label="Close Focus Mode"
        >
          <Minimize2 size={20} />
        </button>
      </div>

      <div className="hide-scrollbar flex-1 overflow-auto px-6 py-14 sm:px-10 lg:px-16 lg:py-20 max-w-4xl mx-auto w-full flex flex-col gap-5 relative pb-[35vh]">
        {visibleNodes.map((n: PuuNode) => {
          const isLocalActive = n.id === localActiveId;
          const isGlobalUnfocused = localActiveId === null;
          return (
            <div
              key={n.id}
              ref={n.id === nodeId ? activeElRef : null}
              onClick={(e) => { e.stopPropagation(); setLocalActiveId(n.id); }}
              className={`rounded border px-6 py-4 transition-all duration-200 cursor-text ${
                isLocalActive || isGlobalUnfocused
                  ? "border-transparent bg-transparent opacity-100"
                  : "border-transparent opacity-35 hover:border-app-border hover:opacity-80"
              }`}
            >
              {isLocalActive ? (
                /* 
                 We check editorMode here because the user can toggle between 
                 a rich text editor (WysiwygEditor) and a plain markdown text area.
                 Both modes are core features intended to co-exist.
                */
                editorMode === "visual" ? (
                  <WysiwygEditor
                    initialValue={n.content}
                    onChange={(val: string) => updateContent(n.id, val)}
                    autoFocus
                    className={`${PROSE_FULL} w-full outline-none focus:outline-none`}
                  />
                ) : (
                  <AutoSizeTextarea
                    value={n.content}
                    onChange={(val: string) => updateContent(n.id, val)}
                    autoFocus
                    dataAutoFocus
                    placeholder="Type here..."
                    className="block w-full resize-none overflow-hidden bg-transparent font-sans text-app-text-primary leading-relaxed lg:text-lg focus-visible:!outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0"
                    style={{ outline: "none", boxShadow: "none" }}
                  />
                )
              ) : (
                <div className={PROSE_FULL}>
                  <SafeMarkdown
                    onToggleCheckbox={(idx, val) =>
                      toggleCheckbox(n.id, n.content || "", idx, val)
                    }
                  >
                    {n.content ||
                      (n.metadata?.isGenerating
                        ? "*Generating...*"
                        : "*Empty card...*")}
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

