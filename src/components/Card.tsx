import React, { useRef, useState } from "react";
import { Plus, Maximize2, Trash2, Scissors, Combine } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SafeMarkdown } from "./SafeMarkdown";
import { PuuNode } from "../types";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { useAppStore } from "../store/useAppStore";
import { canMergeNodes } from "../domain/documentTree";
export const Card = React.memo(
  ({
    node,
    isInPath,
    isDescendantFromActive,
  }: {
    node: PuuNode;
    isInPath: boolean;
    isDescendantFromActive: boolean;
  }) => {
    const hasActiveNode = useAppStore((s) => s.activeId !== null);
    const isActive = useAppStore((s) => s.activeId === node.id);
    const isSelected = useAppStore((s) => s.selectedIds.includes(node.id));
    const isEditing = useAppStore((s) => s.editingId === node.id);
    const isDragged = useAppStore((s) => s.draggedId === node.id);
    const setDraggedId = useAppStore((s) => s.setDraggedId);
    const cardsCollapsed = useAppStore((s) => s.cardsCollapsed);
    const setActiveId = useAppStore((s) => s.setActiveId);
    const setEditingId = useAppStore((s) => s.setEditingId);
    const setFullScreenId = useAppStore((s) => s.setFullScreenId);
    const addChild = useAppStore((s) => s.addChild);
    const addSibling = useAppStore((s) => s.addSibling);

    const updateContent = useAppStore((s) => s.updateContent);
    const splitNode = useAppStore((s) => s.splitNode);
    const deleteNode = useAppStore((s) => s.deleteNode);
    const moveNode = useAppStore((s) => s.moveNode);

    const toggleSelection = useAppStore((s) => s.toggleSelection);
    const mergeNodes = useAppStore((s) => s.mergeNodes);
    const selectedIds = useAppStore((s) => s.selectedIds);
    const nodes = useAppStore((s) => s.nodes);

    const cardRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [dropTarget, setDropTarget] = useState<
      "none" | "top" | "bottom" | "right"
    >("none");
    const toggleCheckbox = useToggleCheckbox();

    const handleSplitNode = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!textareaRef.current) return;
      const cursorPosition = textareaRef.current.selectionStart;
      const textPosition = textareaRef.current.value;
      const textBefore = textPosition.substring(0, cursorPosition).trimEnd();
      const textAfter = textPosition.substring(cursorPosition).trimStart();
      if (textAfter) {
        splitNode(node.id, textBefore, textAfter);
      }
    };
    const isBright =
      !hasActiveNode || isActive || isInPath || isDescendantFromActive;
    const shouldCollapse = cardsCollapsed && !isEditing && !isActive;
    const mergeValidation =
      selectedIds.length > 1
        ? canMergeNodes(nodes, node.id, selectedIds)
        : { ok: false, orderedIds: [] };
    let cardClasses =
      "bg-app-panel border border-app-border opacity-60 hover:opacity-100 transition-all duration-200 hover:bg-app-bg text-app-text-primary";
    if (isActive || isSelected) {
      cardClasses =
        "bg-app-card-active border border-app-border-hover border-l-4 !border-l-orange-500 shadow-md opacity-100 transition-all duration-200 transform scale-[1.01] z-50 text-app-text-primary";
      if (!isActive && isSelected) {
        cardClasses =
          "bg-app-card border border-app-accent border-l-4 opacity-100 shadow-md transition-all duration-200 transform z-40 text-app-text-primary";
      }
    } else if (!hasActiveNode) {
      cardClasses =
        "bg-app-card border border-app-border opacity-100 transition-all duration-200 hover:bg-app-card-hover hover:border-app-border-hover z-20 text-app-text-primary";
    } else if (isBright) {
      cardClasses =
        "bg-app-card border border-app-border opacity-100 shadow-sm transition-all duration-200 hover:bg-app-card-hover hover:border-app-border-hover z-20 text-app-text-primary";
    }
    if (isDragged) cardClasses += " !opacity-30 scale-95";
    if (dropTarget === "top")
      cardClasses += " !border-t-app-accent !border-t-4";
    if (dropTarget === "bottom")
      cardClasses += " !border-b-app-accent !border-b-4";
    if (dropTarget === "right")
      cardClasses += " !border-r-app-accent !border-r-4";
    return (
      <div
        className={`relative group/card-wrapper ${isActive || isEditing ? "z-40" : "z-10"}`}
        id={`card-${node.id}`}
        data-parent-id={node.parentId || ""}
        ref={cardRef}
      >
        <div
          draggable={!isEditing}
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData("nodeId", node.id);
            setDraggedId(node.id);
          }}
          onDragEnd={() => setDraggedId(null)}
          onDragOver={(e) => {
            e.preventDefault();
            if (isDragged) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const xRatio = (e.clientX - rect.left) / rect.width;
            const yRatio = (e.clientY - rect.top) / rect.height;
            let target: "top" | "bottom" | "right" = "bottom";
            if (xRatio > 0.6) {
              target = "right";
            } else if (yRatio < 0.5) {
              target = "top";
            }
            if (dropTarget !== target) setDropTarget(target);
          }}
          onDragLeave={() => setDropTarget("none")}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDropTarget("none");
            setDraggedId(null);
            const sourceId = e.dataTransfer.getData("nodeId");
            if (sourceId && sourceId !== node.id) {
              const position =
                dropTarget === "right"
                  ? "child"
                  : dropTarget === "top"
                    ? "before"
                    : "after";
              moveNode(sourceId, node.id, position);
            }
          }}
          className={`w-full shrink-0 px-4 py-3 rounded cursor-text min-h-[40px] flex flex-col ${cardClasses}`}
          onClick={(e) => {
            e.stopPropagation();
            if (e.metaKey || e.ctrlKey || e.shiftKey) {
              toggleSelection(node.id, e.shiftKey);
            } else {
              if (!isActive) setActiveId(node.id);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (!isActive) setActiveId(node.id);
            if (!isEditing) setEditingId(node.id);
          }}
        >
          {" "}
          {isEditing ? (
            <div className="relative group/edit w-full">
              {" "}
              <AutoSizeTextarea
                ref={textareaRef}
                value={node.content}
                onChange={(val: string) => updateContent(node.id, val)}
                onBlur={() => setEditingId(null)}
                autoFocus
                className="w-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
              />{" "}
              <div className="absolute -top-3 -right-0 flex items-center gap-1 opacity-0 group-hover/edit:opacity-100 transition-opacity z-10 shadow-lg bg-app-card-hover border border-app-border rounded p-1">
                {" "}
                <button
                  onMouseDown={handleSplitNode}
                  className="p-1 rounded text-app-text-secondary hover:text-app-accent dark:hover:text-app-accent"
                  title="Split node at cursor"
                >
                  {" "}
                  <Scissors size={12} />{" "}
                </button>{" "}
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setFullScreenId(node.id);
                  }}
                  className="p-1 rounded text-app-text-secondary hover:text-app-accent dark:hover:text-app-accent"
                  title="Expand to full screen"
                >
                  {" "}
                  <Maximize2 size={12} />{" "}
                </button>{" "}
              </div>{" "}
            </div>
          ) : (
            <div className="relative">
              {node.metadata?.isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-app-accent/10 to-transparent transform -skew-x-12 animate-[shimmer_2s_infinite] overflow-hidden rounded pointer-events-none" />
              )}
              <div
                className={`prose prose-sm max-w-none break-words prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-wide ${isBright ? "prose-headings:text-app-text-primary dark:prose-headings:text-app-text-primary prose-p:text-app-text-primary dark:prose-p:text-app-text-primary prose-li:text-app-text-primary dark:prose-li:text-app-text-primary prose-strong:text-app-text-primary dark:prose-strong:text-app-text-primary" : "prose-headings:text-app-text-muted dark:prose-headings:text-app-text-muted prose-p:text-app-text-muted dark:prose-p:text-app-text-muted prose-li:text-app-text-muted dark:prose-li:text-app-text-muted prose-strong:text-app-text-secondary dark:prose-strong:text-app-text-secondary"} prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1.5 prose-li:my-0.5 prose-h1:text-[1.8em] prose-h2:text-[1.5em] prose-h3:text-[1.25em] prose-h4:text-[1.05em] prose-h4:opacity-85 prose-h5:font-sans prose-h5:text-[0.9em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75 prose-h6:font-mono prose-h6:text-[0.8em] prose-h6:opacity-60 prose-a:text-app-accent prose-hr:border-t-2 prose-hr:border-app-border prose-hr:my-4 prose-code:text-app-text-primary dark:prose-code:text-app-accent prose-code:bg-app-card dark:prose-code:bg-app-card prose-code:px-1 prose-code:rounded ${shouldCollapse ? "max-h-[14em] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]" : ""} ${node.metadata?.isGenerating ? "opacity-70 motion-safe:animate-pulse" : ""}`}
              >
                {" "}
                <SafeMarkdown
                  onToggleCheckbox={(idx, val) =>
                    toggleCheckbox(node.id, node.content || "", idx, val)
                  }
                >
                  {node.content ||
                    (node.metadata?.isGenerating
                      ? "*Generating...*"
                      : "*Empty node...*")}
                </SafeMarkdown>{" "}
              </div>
            </div>
          )}{" "}
        </div>{" "}
        {/* Actions Menu */}
        <AnimatePresence>
          {isActive && !isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              {" "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addSibling(node.id);
                }}
                className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-app-card border border-app-border text-app-accent rounded-full p-1.5 shadow-lg hover:bg-app-card-hover hover:border-app-accent dark:hover:border-app-accent transition-colors z-20 flex items-center justify-center"
                title="Add Sibling (Shift+Enter)"
              >
                {" "}
                <Plus size={14} />{" "}
              </button>{" "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addChild(node.id);
                }}
                className="absolute top-1/2 right-[-13px] -translate-y-1/2 bg-app-card border border-app-border text-app-accent rounded-full p-1.5 shadow-lg hover:bg-app-card-hover hover:border-app-accent dark:hover:border-app-accent transition-colors z-20 flex items-center justify-center"
                title="Add Child (Tab)"
              >
                {" "}
                <Plus size={14} />{" "}
              </button>{" "}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const state = useAppStore.getState();
                  const childrenCount = state.nodes.filter(
                    (n) => n.parentId === node.id,
                  ).length;
                  if (childrenCount > 0) {
                    state.openConfirm(
                      `This will delete the card and its ${childrenCount} descendant branches. Are you sure?`,
                      () => {
                        deleteNode(node.id);
                      },
                    );
                  } else {
                    deleteNode(node.id);
                  }
                }}
                className="absolute -top-3 right-[-13px] bg-app-card border border-app-border text-app-text-muted opacity-75 hover:opacity-100 rounded-full p-1.5 shadow-lg hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all z-20 flex items-center justify-center"
                title="Delete"
              >
                {" "}
                <Trash2 size={12} />{" "}
              </button>{" "}
              {mergeValidation.ok && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    mergeNodes(node.id, selectedIds);
                  }}
                  className="absolute -top-3 left-1/2 -translate-x-1/2 bg-app-card border border-app-accent text-app-accent hover:opacity-100 rounded-full p-1.5 shadow-lg hover:bg-app-card-hover transition-all z-20 flex items-center justify-center"
                  title="Merge Selected"
                >
                  <Combine size={12} />
                </button>
              )}
            </motion.div>
          )}{" "}
        </AnimatePresence>{" "}
      </div>
    );
  },
);
