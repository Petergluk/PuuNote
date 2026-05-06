import React, { lazy, Suspense, useMemo, useRef, useState } from "react";
import { Maximize2, Scissors } from "lucide-react";
import { SafeMarkdown } from "./SafeMarkdown";
import { PuuNode } from "../types";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import type { WysiwygEditorHandle } from "./WysiwygEditor";
import { useAppStore } from "../store/useAppStore";
import { useShallow } from "zustand/shallow";
import {
  PROSE_CARD,
  PROSE_CARD_BRIGHT,
  PROSE_CARD_DIM,
} from "../utils/proseClasses";
import { cn } from "../utils/cn";
import type { BranchColor } from "../utils/branchColors";

type DropZone = "none" | "top" | "bottom" | "right";

const WysiwygEditor = lazy(() =>
  import("./WysiwygEditor").then((module) => ({
    default: module.WysiwygEditor,
  })),
);

/**
 * Compute the Tailwind class string for the card based on its visual state.
 * Extracted from the render body so the JSX stays readable.
 */
function buildCardClasses(state: {
  isActive: boolean;
  isSelected: boolean;
  hasActiveNode: boolean;
  isBright: boolean;
  isDragged: boolean;
}): string {
  const { isActive, isSelected, hasActiveNode, isBright, isDragged } = state;
  const base =
    "transition-colors duration-200 text-app-text-primary motion-safe:transition-[background-color,border-color,box-shadow,opacity]";

  let variant: string;

  if (isActive) {
    variant =
      "bg-app-card-active border border-app-border-hover border-l-4 !border-l-[var(--branch-accent,#f97316)] shadow-md opacity-100 z-50";
  } else if (isSelected) {
    variant =
      "bg-app-card border border-app-accent border-l-4 opacity-100 shadow-md z-40";
  } else if (!hasActiveNode) {
    variant =
      "bg-app-card border border-app-border opacity-100 hover:bg-app-card-hover hover:border-app-border-hover z-20";
  } else if (isBright) {
    variant =
      "bg-app-card border border-app-border opacity-100 shadow-sm hover:bg-app-card-hover hover:border-app-border-hover z-20";
  } else {
    // Dim / inactive state
    variant =
      "inactive-card bg-app-panel border border-app-border hover:bg-app-bg";
  }

  return cn(base, variant, isDragged && "!opacity-10 scale-95");
}

export const Card = React.memo(
  ({
    node,
    isInPath,
    isDescendantFromActive,
    branchColor,
  }: {
    node: PuuNode;
    isInPath: boolean;
    isDescendantFromActive: boolean;
    branchColor: BranchColor | null;
  }) => {
    const {
      hasActiveNode,
      isActive,
      isSelected,
      isEditing,
      isDragged,
      cardsCollapsed,
      editorMode,
    } = useAppStore(
      useShallow((s) => ({
        hasActiveNode: s.activeId !== null,
        isActive: s.activeId === node.id,
        isSelected: s.selectedIds.includes(node.id),
        isEditing: s.editingId === node.id,
        isDragged: s.draggedId === node.id,
        cardsCollapsed: s.cardsCollapsed,
        editorMode: s.editorMode,
      })),
    );

    const {
      setDraggedId,
      setActiveId,
      setEditingId,
      setFullScreenId,
      updateContent,
      splitNode,
      moveNodes,
      toggleSelection,
    } = useAppStore(
      useShallow((s) => ({
        setDraggedId: s.setDraggedId,
        setActiveId: s.setActiveId,
        setEditingId: s.setEditingId,
        setFullScreenId: s.setFullScreenId,
        updateContent: s.updateContent,
        splitNode: s.splitNode,
        moveNodes: s.moveNodes,
        toggleSelection: s.toggleSelection,
      })),
    );

    const toggleCheckbox = useToggleCheckbox();

    const cardRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const wysiwygRef = useRef<WysiwygEditorHandle>(null);
    const [dropTarget, setDropTarget] = useState<DropZone>("none");

    const handleSplitNode = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const split =
        editorMode === "visual"
          ? wysiwygRef.current?.getSplitMarkdown()
          : textareaRef.current
            ? {
                textBefore: textareaRef.current.value
                  .substring(0, textareaRef.current.selectionStart)
                  .trimEnd(),
                textAfter: textareaRef.current.value
                  .substring(textareaRef.current.selectionStart)
                  .trimStart(),
              }
            : null;
      if (!split) return;

      const { textBefore, textAfter } = split;
      if (textAfter) {
        splitNode(node.id, textBefore, textAfter);
      }
    };
    const isBright =
      !hasActiveNode || isActive || isInPath || isDescendantFromActive;
    const shouldCollapse = cardsCollapsed && !isEditing && !isActive;

    const cardClasses = buildCardClasses({
      isActive,
      isSelected,
      hasActiveNode,
      isBright,
      isDragged,
    });
    const branchStyle = useMemo(
      () =>
        branchColor
          ? ({
              "--branch-rgb": branchColor.rgb,
              "--branch-accent": `rgb(${branchColor.rgb})`,
              "--branch-tint": branchColor.settings.intensity / 100,
              "--branch-fill": branchColor.settings.fill / 100,
              "--branch-bg-opacity": branchColor.settings.opacity / 100,
              "--branch-gradient-mid-pos": `${
                26 + branchColor.settings.gradient * 0.45
              }%`,
              "--branch-gradient-mid-mix": `${
                7 + branchColor.settings.gradient * 0.1
              }%`,
              "--branch-gradient-end-mix": `${
                branchColor.settings.gradient * 0.1
              }%`,
            } as React.CSSProperties)
          : undefined,
      [branchColor],
    );

    return (
      <div
        className={cn(
          "relative group/card-wrapper",
          isActive || isEditing ? "z-40" : "z-10",
        )}
        id={`card-${node.id}`}
        data-parent-id={node.parentId || ""}
        ref={cardRef}
      >
        <div
          draggable={!isEditing}
          style={branchStyle}
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
            let target: DropZone = "bottom";
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
              const state = useAppStore.getState();
              const sourceIds =
                state.selectedIds.length > 1 &&
                state.selectedIds.includes(sourceId)
                  ? state.selectedIds
                  : [sourceId];
              moveNodes(sourceIds, node.id, position);
            }
          }}
          className={cn(
            "relative w-full shrink-0 px-4 py-3 rounded cursor-text min-h-[40px] flex flex-col",
            isEditing && "group/edit",
            cardClasses,
            branchColor && "branch-card",
            branchColor?.settings.solid && "branch-fill-solid",
            branchColor && isActive && "branch-card-active",
            branchColor && isSelected && !isActive && "branch-card-selected",
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (e.metaKey || e.ctrlKey || e.shiftKey) {
              toggleSelection(node.id, e.shiftKey);
            } else {
              setActiveId(node.id);
            }
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            setActiveId(node.id);
            if (!isEditing) setEditingId(node.id);
          }}
        >
          {/* Editing toolbar layout invariant:
             The scissors/fullscreen toolbar must be pinned to the real top-right
             corner of the card border box. It is intentionally rendered here as
             a direct absolute child of the card, whose class above includes
             `relative`. Do not move this toolbar into the editor/text wrapper:
             that wrapper participates in the card's `px-4`/text spacing, so
             `right-0 top-0` there means "edge of the text area", not "edge of
             the card". That mistake repeatedly leaves a visible inset from the
             right or top edge.

             The text clearance is handled separately below. The card already
             has `py-3` (12px); the editing content wrapper adds `pt-3` (12px),
             giving exactly 24px before the first text line. This leaves room for
             the hover toolbar without making every editing card look like it has
             a large permanent blank header. */}
          {isEditing && (
            <div className="absolute right-0 top-0 flex items-center divide-x divide-app-border opacity-0 group-hover/edit:opacity-100 [@media(pointer:coarse)]:opacity-100 transition-opacity z-10 shadow-lg bg-app-card border border-app-border rounded-md overflow-hidden">
              <button
                onMouseDown={handleSplitNode}
                className="p-1 text-app-text-secondary cursor-pointer hover:bg-app-text-primary hover:text-app-card transition-colors"
                title="Split node at cursor"
              >
                <Scissors size={14} />
              </button>
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFullScreenId(node.id);
                }}
                className="p-1 text-app-text-secondary cursor-pointer hover:bg-app-text-primary hover:text-app-card transition-colors"
                title="Expand to full screen"
              >
                <Maximize2 size={14} />
              </button>
            </div>
          )}
          {isEditing ? (
            <div className="w-full pt-3">
              {/* 
                 The application deliberately supports both "visual" (WysiwygEditor) 
                 and "markdown" (AutoSizeTextarea) modes. Maintaining both options 
                 is important because users have different preferences for text editing.
                 WysiwygEditor uses Tiptap for a rich experience, while AutoSizeTextarea 
                 provides raw Markdown control.
              */}
              {editorMode === "visual" ? (
                <Suspense
                  fallback={
                    <div
                      className={cn(
                        PROSE_CARD,
                        isBright ? PROSE_CARD_BRIGHT : PROSE_CARD_DIM,
                        "min-h-[24px] text-app-text-muted",
                      )}
                    >
                      Loading editor...
                    </div>
                  }
                >
                  <WysiwygEditor
                    ref={wysiwygRef}
                    initialValue={node.content}
                    onChange={(val: string) => updateContent(node.id, val)}
                    onBlur={() => setEditingId(null)}
                    autoFocus
                    className={cn(
                      PROSE_CARD,
                      isBright ? PROSE_CARD_BRIGHT : PROSE_CARD_DIM,
                      "w-full outline-none focus:outline-none min-h-[24px]",
                    )}
                  />
                </Suspense>
              ) : (
                <AutoSizeTextarea
                  ref={textareaRef}
                  value={node.content}
                  onChange={(val: string) => updateContent(node.id, val)}
                  onBlur={() => setEditingId(null)}
                  autoFocus
                  className="w-full resize-none outline-none focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
                />
              )}
            </div>
          ) : (
            <div className="relative">
              {node.metadata?.isGenerating && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-app-accent/10 to-transparent transform -skew-x-12 animate-[shimmer_2s_infinite] overflow-hidden rounded pointer-events-none" />
              )}
              <div
                className={cn(
                  PROSE_CARD,
                  isBright ? PROSE_CARD_BRIGHT : PROSE_CARD_DIM,
                  shouldCollapse &&
                    "max-h-[14em] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]",
                  node.metadata?.isGenerating &&
                    "opacity-70 motion-safe:animate-pulse",
                )}
              >
                <SafeMarkdown
                  onToggleCheckbox={(idx, val) =>
                    toggleCheckbox(node.id, node.content || "", idx, val)
                  }
                >
                  {node.content ||
                    (node.metadata?.isGenerating
                      ? "*Generating...*"
                      : "*Empty node...*")}
                </SafeMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* DnD drop-zone overlay indicators — rendered outside the card body
            so they don't cause layout shifts (no border changes). */}
        {dropTarget !== "none" && (
          <>
            {dropTarget === "top" && (
              <div className="absolute top-0 left-1 right-1 h-[3px] bg-app-accent rounded-full pointer-events-none z-50 shadow-[0_0_6px_var(--app-accent)]" />
            )}
            {dropTarget === "bottom" && (
              <div className="absolute bottom-0 left-1 right-1 h-[3px] bg-app-accent rounded-full pointer-events-none z-50 shadow-[0_0_6px_var(--app-accent)]" />
            )}
            {dropTarget === "right" && (
              <div className="absolute top-1 bottom-1 right-0 w-[3px] bg-app-accent rounded-full pointer-events-none z-50 shadow-[0_0_6px_var(--app-accent)]" />
            )}
          </>
        )}
      </div>
    );
  },
);
