import React, { useState, useMemo, useCallback } from "react";
import { Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { PuuNode } from "../types";
import { useAppStore } from "../store/useAppStore";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { SafeMarkdown } from "./SafeMarkdown";
import { COPY_SUCCESS_TIMEOUT_MS } from "../constants";
import { useTranslation } from "react-i18next";

export const TimelineView = ({ nodes }: { nodes: PuuNode[] }) => {
  const { t } = useTranslation();
  const activeId = useAppStore((s) => s.activeId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const updateContent = useAppStore((s) => s.updateContent);
  const [copied, setCopied] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);

  /* Use useMemo to prevent unnecessary calculations and mutations inside render */
  const orderedNodes = useMemo(() => {
    const parentMap = new Map<string | null, PuuNode[]>();
    for (const node of nodes) {
      if (!parentMap.has(node.parentId)) parentMap.set(node.parentId, []);
      parentMap.get(node.parentId)!.push(node);
    }
    for (const children of parentMap.values()) {
      children.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    const result: PuuNode[] = [];
    const traverse = (parentId: string | null) => {
      const children = parentMap.get(parentId) || [];
      for (const child of children) {
        result.push(child);
        traverse(child.id);
      }
    };
    traverse(null);
    return result;
  }, [nodes]);

  const handleToggleCheckbox = useCallback((node: PuuNode, index: number, newValue: boolean) => {
    let count = 0;
    const newContent = (node.content || "").replace(
      /^(\s*(?:[-*+]|\d+\.)\s+\[)([\sXx])(\](?:\s+|$))/gm,
      (match, p1, p2, p3) => {
        if (count === index) {
          count++;
          return p1 + (newValue ? "x" : " ") + p3;
        }
        count++;
        return match;
      }
    );
    if (newContent !== node.content) {
      updateContent(node.id, newContent);
    }
  }, [updateContent]);

  /* Extract outline (headings) from nodes */
  const outline = useMemo(() => {
    const items: {
      id: string;
      nodeId: string;
      title: string;
      level: number;
    }[] = [];
    let hId = 0;
    orderedNodes.forEach((n) => {
      const lines = n.content.split("\n");
      lines.forEach((line) => {
        const match = line.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          items.push({
            id: `h-${hId++}`,
            nodeId: n.id,
            title: match[2],
            level: match[1].length,
          });
        }
      });
    });
    return items;
  }, [orderedNodes]);

  const scrollToNode = (nodeId: string) => {
    const element = document.getElementById(`tl-node-${nodeId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(nodeId);
    }
  };

  const handleCopyAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = orderedNodes.map((n) => n.content).join("\n\n");
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_SUCCESS_TIMEOUT_MS);
    } catch (err) {
      console.error("Failed to copy clipboard:", err);
    }
  };

  return (
    <div
      className="w-full relative flex justify-center p-8 lg:p-16 col-spacer"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActiveId(null);
      }}
    >
      <div className="absolute top-8 right-8 lg:top-16 lg:right-12 z-20">
        <button
          onClick={handleCopyAll}
          className="flex items-center gap-2 px-4 py-2 bg-app-card border border-app-border rounded-full shadow-sm hover:bg-app-card-hover transition font-medium text-sm text-app-text-secondary"
        >
          {copied ? (
            <Check size={16} className="text-green-500" />
          ) : (
            <Copy size={16} />
          )}
          {copied ? t("Copied") : t("Copy all")}
        </button>
      </div>

      {outline.length > 0 && (
        <div className={`absolute left-0 pl-4 lg:pl-8 top-8 lg:top-16 bottom-0 hidden xl:flex flex-col z-10 pointer-events-none transition-all duration-300`} style={{ width: isOutlineOpen ? 'calc(50vw - 26rem)' : '6rem', maxWidth: '30rem' }}>
          <aside className="sticky top-8 lg:top-16 self-start max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden w-full pr-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setIsOutlineOpen(!isOutlineOpen)}
                className="p-1.5 rounded bg-app-card hover:bg-app-card-hover border border-app-border text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
                title="Toggle Outline"
              >
                {isOutlineOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
              </button>
              {isOutlineOpen && (
                <div className="text-xs font-mono tracking-widest uppercase text-app-text-muted font-bold truncate">
                  Outline
                </div>
              )}
            </div>
            
            {isOutlineOpen && (
              <div className="overflow-y-auto hide-scrollbar border-l border-app-border pl-4">
                <ul className="flex flex-col gap-3 pb-8">
                  {outline.map((item) => (
                    <li
                      key={item.id}
                      className="cursor-pointer text-sm text-app-text-secondary hover:text-app-accent transition-colors truncate"
                      style={{ paddingLeft: `${(item.level - 1) * 12}px` }}
                      onClick={() => scrollToNode(item.nodeId)}
                      title={item.title}
                    >
                      {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        </div>
      )}

      <div className="w-full max-w-3xl flex flex-col gap-8 pb-[20vh] min-w-0 pointer-events-auto">
        {orderedNodes.length === 0 ? (
          <div className="text-app-text-muted italic">{t("Document is empty")}</div>
        ) : (
          <div className="w-full flex flex-col gap-8">
            {orderedNodes.map((n) => {
              const isLocalActive = n.id === activeId;
              return (
                <div key={n.id} id={`tl-node-${n.id}`}>
                  <div
                    onClick={() => setActiveId(n.id)}
                    className={`transition-all duration-200 cursor-text rounded-lg border-2 ${isLocalActive ? "p-4 border-app-accent bg-app-card shadow-sm" : "border-transparent hover:bg-app-card-hover"}`}
                  >
                    {isLocalActive ? (
                    <AutoSizeTextarea
                      value={n.content}
                      onChange={(val: string) => updateContent(n.id, val)}
                      autoFocus
                      placeholder={t("Empty node")}
                      className="w-full h-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed lg:text-lg"
                    />
                  ) : (
                    <div className="prose dark:prose-invert max-w-none prose-lg prose-headings:font-serif prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary prose-headings:font-normal prose-headings:tracking-wide prose-p:text-app-text-secondary dark:prose-p:text-app-text-secondary prose-p:leading-relaxed prose-a:text-app-accent prose-strong:text-app-text-primary dark:prose-strong:text-app-text-primary prose-ul:text-app-text-secondary dark:prose-ul:text-app-text-secondary prose-ol:text-app-text-secondary dark:prose-ol:text-app-text-secondary prose-li:text-app-text-secondary dark:prose-li:text-app-text-secondary prose-h1:text-[2.2em] prose-h2:text-[1.8em] prose-h3:text-[1.4em] prose-h4:text-[1.1em] prose-h4:opacity-80 prose-h5:font-sans prose-h5:text-[1em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75 prose-h6:font-mono prose-h6:text-[0.9em] prose-h6:opacity-60 prose-hr:border-t-2 prose-hr:border-app-border prose-hr:my-6 prose-code:text-app-text-primary dark:prose-code:text-app-accent prose-code:bg-transparent dark:prose-code:bg-transparent prose-code:px-1 prose-code:rounded">
                      <SafeMarkdown onToggleCheckbox={(idx, val) => handleToggleCheckbox(n, idx, val)}>
                        {n.content || `*${t("Empty node")}*`}
                      </SafeMarkdown>
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
