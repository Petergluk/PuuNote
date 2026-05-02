import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import { useAppStore } from "../store/useAppStore";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { SafeMarkdown } from "./SafeMarkdown";
import { COPY_SUCCESS_TIMEOUT_MS } from "../constants";
import { useTranslation } from "react-i18next";
import { PROSE_TIMELINE } from "../utils/proseClasses";
import { getDepthFirstNodes } from "../utils/tree";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";
import type { PuuNode } from "../types";
import { WysiwygEditor } from "./WysiwygEditor";

const HEADING_REGEX = /^(#{1,6})\s+(.*)$/;

export const TimelineView = () => {
  const nodes = useAppStore((s) => s.nodes);
  const { t } = useTranslation();
  const editorMode = useAppStore((s) => s.editorMode);
  const activeId = useAppStore((s) => s.activeId);
  const setActiveId = useAppStore((s) => s.setActiveId);
  const clearSelection = useAppStore((s) => s.clearSelection);
  const updateContent = useAppStore((s) => s.updateContent);
  const [copied, setCopied] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const scrollParent =
    typeof document === "undefined"
      ? undefined
      : document.getElementById("main-scroller") || undefined;

  /* Use useMemo to prevent unnecessary calculations and mutations inside render */
  const orderedNodes = useMemo(() => {
    return getDepthFirstNodes(nodes);
  }, [nodes]);

  const nodeIndexById = useMemo(() => {
    return new Map(orderedNodes.map((node, index) => [node.id, index]));
  }, [orderedNodes]);
  const nodeIndexByIdRef = useRef(nodeIndexById);

  const toggleCheckbox = useToggleCheckbox();

  const blockScrollRef = useRef(false);

  useEffect(() => {
    nodeIndexByIdRef.current = nodeIndexById;
  }, [nodeIndexById]);

  useEffect(() => {
    if (!activeId) return;
    if (blockScrollRef.current) return;
    const index = nodeIndexByIdRef.current.get(activeId);
    if (index === undefined) return;
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "center",
      behavior: "smooth",
    });
  }, [activeId]);

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
        const match = line.match(HEADING_REGEX);
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
    const index = nodeIndexById.get(nodeId);
    if (index === undefined) return;
    virtuosoRef.current?.scrollToIndex({
      index,
      align: "start",
      behavior: "smooth",
    });
    setActiveId(nodeId);
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

  const renderItem = useCallback((_index: number, n: PuuNode & { depth: number }) => {
    const isLocalActive = n.id === activeId;
    const hasActiveNode = activeId !== null;
    const previousDepth =
      _index > 0 ? orderedNodes[_index - 1]?.depth : undefined;
    const showLevelSeparator =
      _index > 0 && previousDepth !== n.depth;
    const separatorIsRoot = n.depth === 0;

    return (
      <div
        key={n.id}
        id={`tl-node-${n.id}`}
        className="mb-1.5"
      >
        {showLevelSeparator && (
          <div
            className={`flex items-center gap-2 text-[10px] font-mono text-app-text-muted/70 ${
              separatorIsRoot ? "mt-5 mb-2.5" : "mt-2 mb-1"
            }`}
          >
            <span className="h-px flex-1 bg-app-border/60" />
            <span className="shrink-0 tabular-nums">
              {n.depth + 1}
            </span>
          </div>
        )}
        <div
          onClick={() => {
            blockScrollRef.current = true;
            setActiveId(n.id);
            setTimeout(() => { blockScrollRef.current = false; }, 50);
          }}
          className={`cursor-text rounded px-0 py-0.5 transition-opacity duration-200 ${
            !hasActiveNode || isLocalActive
              ? "opacity-100"
              : "opacity-45 hover:opacity-80"
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
                className={`${PROSE_TIMELINE} w-full outline-none focus:outline-none min-h-[24px]`}
              />
            ) : (
              <AutoSizeTextarea
                value={n.content}
                onChange={(val: string) => updateContent(n.id, val)}
                autoFocus
                placeholder={t("Empty node")}
                className="w-full h-full resize-none overflow-hidden outline-none bg-transparent font-sans text-app-text-primary leading-relaxed"
              />
            )
          ) : (
            <div className={PROSE_TIMELINE}>
              <SafeMarkdown
                onToggleCheckbox={(idx, val) =>
                  toggleCheckbox(n.id, n.content || "", idx, val)
                }
              >
                {n.content || `*${t("Empty node")}*`}
              </SafeMarkdown>
            </div>
          )}
        </div>
      </div>
    );
  }, [activeId, orderedNodes, t, toggleCheckbox, updateContent, setActiveId, editorMode]);

  return (
    <div
      className="w-full relative flex justify-center p-6 lg:p-12 col-spacer"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          clearSelection();
          setActiveId(null);
        }
      }}
    >
      <div className="absolute top-8 right-8 lg:top-16 lg:right-12 z-20 hidden sm:block">
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
        <div
          className={`absolute left-0 pl-4 lg:pl-8 top-8 lg:top-16 bottom-0 hidden xl:flex flex-col z-10 pointer-events-none transition-all duration-300`}
          style={{
            width: isOutlineOpen ? "calc(50vw - 26rem)" : "6rem",
            maxWidth: "30rem",
          }}
        >
          <aside className="sticky top-8 lg:top-16 self-start max-h-[80vh] flex flex-col pointer-events-auto overflow-hidden w-full pr-4">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setIsOutlineOpen(!isOutlineOpen)}
                className="p-1.5 rounded bg-app-card hover:bg-app-card-hover border border-app-border text-app-text-muted hover:text-app-text-primary transition-colors cursor-pointer"
                title="Toggle Outline"
              >
                {isOutlineOpen ? (
                  <ChevronLeft size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
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

      <div className="w-full max-w-3xl flex flex-col gap-2 pb-[20vh] min-w-0 pointer-events-auto">
        {orderedNodes.length === 0 ? (
          <div className="text-app-text-muted italic">
            {t("Document is empty")}
          </div>
        ) : (
          <div className="w-full">
            <Virtuoso
              ref={virtuosoRef}
              customScrollParent={scrollParent}
              data={orderedNodes}
              computeItemKey={(_index, node) => node.id}
              itemContent={renderItem}
            />
          </div>
        )}
      </div>
    </div>
  );
};
