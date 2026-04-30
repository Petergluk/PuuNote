import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Combine, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { canMergeNodes } from "../domain/documentTree";
import { computeDescendantIds } from "../utils/tree";
import { useAppStore } from "../store/useAppStore";

interface CardRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const ACTION_CLASS =
  "pointer-events-auto fixed h-7 w-7 rounded-full border border-app-border bg-app-card text-app-accent shadow-lg transition-colors flex items-center justify-center hover:bg-app-card-hover hover:border-app-accent dark:hover:border-app-accent";

const DELETE_ACTION_CLASS =
  "pointer-events-auto fixed h-7 w-7 rounded-full border border-app-border bg-app-card text-app-text-muted opacity-80 shadow-lg transition-all flex items-center justify-center hover:opacity-100 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400";

const pointInsideRect = (
  point: { x: number; y: number } | null,
  rect: DOMRect,
) => {
  if (!point) return false;
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
};

export function FloatingCardActions() {
  const activeId = useAppStore((state) => state.activeId);
  const editingId = useAppStore((state) => state.editingId);
  const nodes = useAppStore((state) => state.nodes);
  const selectedIds = useAppStore((state) => state.selectedIds);
  const addChild = useAppStore((state) => state.addChild);
  const addSibling = useAppStore((state) => state.addSibling);
  const deleteNode = useAppStore((state) => state.deleteNode);
  const mergeNodes = useAppStore((state) => state.mergeNodes);
  const floatingActionsVisible = useAppStore(
    (state) => state.floatingActionsVisible,
  );

  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionsHoveredRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const [cardRect, setCardRect] = useState<CardRect | null>(null);
  const [visibleCardId, setVisibleCardId] = useState<string | null>(null);

  const mergeValidation = useMemo(() => {
    if (!activeId || selectedIds.length < 2) {
      return { ok: false, orderedIds: [] };
    }
    return canMergeNodes(nodes, activeId, selectedIds);
  }, [activeId, nodes, selectedIds]);

  /** True on touch-primary devices (phones, tablets) */
  const isTouchDevice = useMemo(
    () => window.matchMedia("(pointer: coarse)").matches,
    [],
  );

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const showActions = useCallback(() => {
    if (!activeId) return;
    clearHideTimer();
    setVisibleCardId(activeId);
  }, [activeId, clearHideTimer]);

  const hideActionsSoon = useCallback(() => {
    clearHideTimer();
    hideTimerRef.current = setTimeout(() => {
      if (actionsHoveredRef.current) return;
      setVisibleCardId(null);
    }, 220);
  }, [clearHideTimer]);

  const updateCardRect = useCallback(() => {
    if (!activeId || editingId) {
      setCardRect(null);
      return;
    }

    const activeCard = document.getElementById(`card-${activeId}`);
    if (!activeCard) {
      setCardRect(null);
      return;
    }

    const rect = activeCard.getBoundingClientRect();
    if (
      rect.bottom < 0 ||
      rect.right < 0 ||
      rect.top > window.innerHeight ||
      rect.left > window.innerWidth
    ) {
      setCardRect(null);
      return;
    }

    setCardRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, [activeId, editingId]);

  const scheduleRectUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      updateCardRect();
    });
  }, [updateCardRect]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  useEffect(() => {
    clearHideTimer();
    scheduleRectUpdate();

    if (!activeId || editingId) return;

    const activeCard = document.getElementById(`card-${activeId}`);
    if (!activeCard) return;

    const handleCardEnter = () => {
      updateCardRect();
      showActions();
    };
    const handleCardLeave = () => hideActionsSoon();

    activeCard.addEventListener("mouseenter", handleCardEnter);
    activeCard.addEventListener("mouseleave", handleCardLeave);

    // M9: keyboard-triggered visibility (Space)
    if (floatingActionsVisible) {
      requestAnimationFrame(() => {
        updateCardRect();
        showActions();
      });
    } else if (isTouchDevice) {
      // UX-1: on touch devices, show actions immediately without hover
      requestAnimationFrame(showActions);
    } else {
      const rect = activeCard.getBoundingClientRect();
      if (pointInsideRect(pointerRef.current, rect)) {
        requestAnimationFrame(showActions);
      }
    }

    return () => {
      activeCard.removeEventListener("mouseenter", handleCardEnter);
      activeCard.removeEventListener("mouseleave", handleCardLeave);
    };
  }, [
    activeId,
    clearHideTimer,
    editingId,
    floatingActionsVisible,
    hideActionsSoon,
    isTouchDevice,
    scheduleRectUpdate,
    showActions,
    updateCardRect,
  ]);

  // Reset keyboard-triggered visibility when activeId changes
  useEffect(() => {
    useAppStore.getState().setFloatingActionsVisible(false);
  }, [activeId]);

  useEffect(() => {
    if (!activeId || editingId) return;

    window.addEventListener("resize", scheduleRectUpdate);
    window.addEventListener("scroll", scheduleRectUpdate, true);

    return () => {
      window.removeEventListener("resize", scheduleRectUpdate);
      window.removeEventListener("scroll", scheduleRectUpdate, true);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [activeId, editingId, scheduleRectUpdate]);

  useEffect(() => {
    return () => clearHideTimer();
  }, [clearHideTimer]);

  if (typeof document === "undefined") return null;

  const shouldShow =
    visibleCardId === activeId && cardRect && activeId && !editingId;
  const centerX = cardRect ? cardRect.left + cardRect.width / 2 : 0;
  const rightX = cardRect ? cardRect.left + cardRect.width : 0;
  const middleY = cardRect ? cardRect.top + cardRect.height / 2 : 0;

  const keepVisibleHandlers = {
    onPointerEnter: () => {
      actionsHoveredRef.current = true;
      showActions();
    },
    onPointerLeave: () => {
      actionsHoveredRef.current = false;
      hideActionsSoon();
    },
  };

  return createPortal(
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="fixed inset-0 z-[80] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.button
            type="button"
            className={ACTION_CLASS}
            style={{
              left: centerX,
              top: cardRect.top + cardRect.height,
              transform: "translate(-50%, -50%)",
            }}
            title="Add Sibling (Shift+Enter)"
            onClick={(event) => {
              event.stopPropagation();
              addSibling(activeId);
            }}
            {...keepVisibleHandlers}
          >
            <Plus size={14} />
          </motion.button>
          <motion.button
            type="button"
            className={ACTION_CLASS}
            style={{
              left: rightX,
              top: middleY,
              transform: "translate(-50%, -50%)",
            }}
            title="Add Child (Tab)"
            onClick={(event) => {
              event.stopPropagation();
              addChild(activeId);
            }}
            {...keepVisibleHandlers}
          >
            <Plus size={14} />
          </motion.button>
          <motion.button
            type="button"
            className={DELETE_ACTION_CLASS}
            style={{
              left: rightX,
              top: cardRect.top,
              transform: "translate(-50%, -50%)",
            }}
            title="Delete"
            onClick={(event) => {
              event.stopPropagation();
              const state = useAppStore.getState();
              const descendantCount = computeDescendantIds(
                state.nodes,
                activeId,
              ).size;
              if (descendantCount > 0) {
                state.openConfirm(
                  `This will delete the card and its ${descendantCount} descendant branches. Are you sure?`,
                  () => deleteNode(activeId),
                );
              } else {
                deleteNode(activeId);
              }
            }}
            {...keepVisibleHandlers}
          >
            <Trash2 size={12} />
          </motion.button>
          {mergeValidation.ok && (
            <motion.button
              type="button"
              className={ACTION_CLASS}
              style={{
                left: centerX,
                top: cardRect.top,
                transform: "translate(-50%, -50%)",
              }}
              title="Merge Selected"
              onClick={(event) => {
                event.stopPropagation();
                const count = mergeValidation.orderedIds.length;
                useAppStore
                  .getState()
                  .openConfirm(
                    `Merge ${count} cards into one? This cannot be undone easily.`,
                    () => mergeNodes(activeId, selectedIds),
                  );
              }}
              {...keepVisibleHandlers}
            >
              <Combine size={12} />
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
