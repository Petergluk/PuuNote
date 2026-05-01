import React, { useRef, useState } from "react";
import { Maximize2, Scissors } from "lucide-react";
import { SafeMarkdown } from "./SafeMarkdown";
import { PuuNode } from "../types";
import { useToggleCheckbox } from "../hooks/useToggleCheckbox";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import { useAppStore } from "../store/useAppStore";
import { useShallow } from "zustand/shallow";
import {
  PROSE_CARD,
  PROSE_CARD_BRIGHT,
  PROSE_CARD_DIM,
} from "../utils/proseClasses";
import { cn } from "../utils/cn";

type DropZone = "none" | "top" | "bottom" | "right";

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
  const base = "transition-all duration-200 text-app-text-primary";

  let variant: string;

  if (isActive) {
    variant =
      "bg-app-card-active border border-app-border-hover border-l-4 !border-l-orange-500 shadow-md opacity-100 transform scale-[1.01] z-50";
  } else if (isSelected) {
    variant =
      "bg-app-card border border-app-accent border-l-4 opacity-100 shadow-md transform z-40";
  } else if (!hasActiveNode) {
    variant =
      "bg-app-card border border-app-border opacity-100 hover:bg-app-card-hover hover:border-app-border-hover z-20";
  } else if (isBright) {
    variant =
      "bg-app-card border border-app-border opacity-100 shadow-sm hover:bg-app-card-hover hover:border-app-border-hover z-20";
  } else {
    // Dim / inactive state
    variant =
      "bg-app-panel border border-app-border opacity-60 hover:opacity-100 hover:bg-app-bg";
  }

  return cn(base, variant, isDragged && "!opacity-10 scale-95");
}

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
    const {
      hasActiveNode,
      isActive,
      isSelected,
      isEditing,
      isDragged,
      cardsCollapsed,
    } = useAppStore(
      useShallow((s) => ({
        hasActiveNode: s.activeId !== null,
        isActive: s.activeId === node.id,
        isSelected: s.selectedIds.includes(node.id),
        isEditing: s.editingId === node.id,
        isDragged: s.draggedId === node.id,
        cardsCollapsed: s.cardsCollapsed,
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
    const [dropTarget, setDropTarget] = useState<DropZone>("none");

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

    const cardClasses = buildCardClasses({
      isActive,
      isSelected,
      hasActiveNode,
      isBright,
      isDragged,
    });

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
            "w-full shrink-0 px-4 py-3 rounded cursor-text min-h-[40px] flex flex-col",
            cardClasses,
          )}
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
          {isEditing ? (
            <div className="relative group/edit w-full pt-4">
              <AutoSizeTextarea
                ref={textareaRef}
                value={node.content}
                onChange={(val: string) => updateContent(node.id, val)}
                onBlur={() => setEditingId(null)}
                autoFocus
                className="w-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
              />
              <div className="absolute -top-3 -right-3 flex items-center divide-x divide-app-border opacity-0 group-hover/edit:opacity-100 transition-opacity z-10 shadow-lg bg-app-card border border-app-border rounded-md overflow-hidden">
                <button
                  onMouseDown={handleSplitNode}
                  className="p-1.5 text-app-text-secondary cursor-pointer hover:bg-app-text-primary hover:text-app-card transition-colors"
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
                  className="p-1.5 text-app-text-secondary cursor-pointer hover:bg-app-text-primary hover:text-app-card transition-colors"
                  title="Expand to full screen"
                >
                  <Maximize2 size={14} />
                </button>
              </div>
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
