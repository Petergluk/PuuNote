import React, { useState, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { PuuNode } from "../types";
import { useAppStore } from "../store/useAppStore";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { SafeMarkdown } from "./SafeMarkdown";
import { COPY_SUCCESS_TIMEOUT_MS } from "../constants";

export const TimelineView = ({ nodes }: { nodes: PuuNode[] }) => {
  const activeId = useAppStore((s) => s.activeId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const updateContent = useAppStore((s) => s.updateContent);
  const [copied, setCopied] = useState(false);

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
        const match = line.match(/^(#{1,3})\s+(.*)$/);
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
          {copied ? "Скопировано!" : "Скопировать всё"}
        </button>
      </div>

      {outline.length > 0 && (
        <div className="absolute left-8 lg:left-12 top-8 lg:top-16 bottom-0 hidden xl:block w-56 xl:w-64 z-10 pointer-events-none">
          <aside className="sticky top-8 lg:top-16 self-start max-h-[80vh] overflow-y-auto hide-scrollbar border-l border-app-border pl-6 pointer-events-auto">
            <div className="text-xs font-mono tracking-widest uppercase text-app-text-muted mb-6 font-bold">
              Outline
            </div>
            <ul className="flex flex-col gap-3">
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
          </aside>
        </div>
      )}

      <div className="w-full max-w-3xl flex flex-col gap-8 pb-[20vh] min-w-0">
        {orderedNodes.length === 0 ? (
          <div className="text-app-text-muted italic">Document is empty...</div>
        ) : (
          orderedNodes.map((n) => {
            const isLocalActive = n.id === activeId;
            return (
              <div
                id={`tl-node-${n.id}`}
                key={n.id}
                onClick={() => setActiveId(n.id)}
                className={`transition-all duration-200 cursor-text rounded-lg border-2 ${isLocalActive ? "p-4 border-app-accent bg-app-card shadow-sm" : "border-transparent hover:bg-app-card-hover"}`}
              >
                {isLocalActive ? (
                  <AutoSizeTextarea
                    value={n.content}
                    onChange={(val: string) => updateContent(n.id, val)}
                    autoFocus
                    placeholder="Empty node..."
                    className="w-full h-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed lg:text-lg"
                  />
                ) : (
                  <div className="prose dark:prose-invert max-w-none prose-lg prose-headings:font-serif prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary prose-headings:font-normal prose-headings:tracking-tight prose-p:text-app-text-secondary dark:prose-p:text-app-text-secondary prose-p:leading-relaxed prose-a:text-app-accent prose-strong:text-app-text-primary dark:prose-strong:text-app-text-primary prose-ul:text-app-text-secondary dark:prose-ul:text-app-text-secondary prose-ol:text-app-text-secondary dark:prose-ol:text-app-text-secondary prose-li:text-app-text-secondary dark:prose-li:text-app-text-secondary prose-h1:text-[2.2em] prose-h2:text-[1.8em] prose-h3:text-[1.4em] prose-h4:text-[1.1em] prose-h4:opacity-80 prose-h5:font-sans prose-h5:text-[1em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75 prose-h6:font-mono prose-h6:text-[0.9em] prose-h6:opacity-60 prose-code:text-app-text-primary dark:prose-code:text-app-accent prose-code:bg-transparent dark:prose-code:bg-transparent prose-code:px-1 prose-code:rounded">
                    <SafeMarkdown>
                      {n.content || "*Empty node...*"}
                    </SafeMarkdown>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
