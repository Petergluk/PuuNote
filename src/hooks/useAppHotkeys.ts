import { useEffect, useCallback } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { PuuNode } from "../types";

export function useAppHotkeys() {
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const { activeId, editingId, setNodes } = useAppStore.getState();
      if (activeId && !editingId) {
        const text = e.clipboardData?.getData("text");
        if (!text) return;

        const target = e.target as HTMLElement;
        if (
          target &&
          (target.tagName === "TEXTAREA" || target.tagName === "INPUT")
        ) {
          return;
        }

        const parts = text
          .split(/^\s*---\s*$/m)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);
        if (parts.length === 0) return;

        e.preventDefault();

        setNodes((prev) => {
          const siblings = prev.filter((n) => n.parentId === activeId);
          let maxOrder =
            siblings.length > 0
              ? Math.max(...siblings.map((n) => n.order || 0))
              : -1;
          const newNodes: PuuNode[] = parts.map((part) => {
            maxOrder++;
            return {
              id: generateId(),
              content: part,
              parentId: activeId,
              order: maxOrder,
            };
          });
          return [...prev, ...newNodes];
        });
      }
    };

    document.addEventListener("paste", handleGlobalPaste);
    return () => document.removeEventListener("paste", handleGlobalPaste);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const state = useAppStore.getState();

      if (e.ctrlKey || e.metaKey) {
        const isZ = e.key.toLowerCase() === "z";
        const isY = e.key.toLowerCase() === "y";
        if (isZ || isY) {
          const target = e.target as HTMLElement;
          if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
            return;
          }
          const isRedoAction = (isZ && e.shiftKey) || isY;
          const isUndoAction = isZ && !e.shiftKey;

          if (isUndoAction && state.canUndo()) {
            e.preventDefault();
            state.undo();
            state.setActiveId(null);
          } else if (isRedoAction && state.canRedo()) {
            e.preventDefault();
            state.redo();
            state.setActiveId(null);
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const state = useAppStore.getState();
    const {
      fullScreenId,
      timelineOpen,
      editingId,
      activeId,
      setEditingId,
      addChild,
      addSibling,
      setActiveId,
      nodes,
    } = state;

    if (fullScreenId || timelineOpen) return;

    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === "TEXTAREA" || target.tagName === "INPUT";

    if (editingId || isTyping) {
      if (editingId) {
        if (
          e.key === "Escape" ||
          (e.key === "Enter" && (e.metaKey || e.ctrlKey))
        ) {
          e.preventDefault();
          setEditingId(null);
          setTimeout(() => {
            const appContainer = document.getElementById(
              "puunote-app-container",
            );
            if (appContainer) appContainer.focus();
          }, 0);
        } else if (e.key === "Tab") {
          e.preventDefault();
          setEditingId(null);
          addChild(editingId);
          setTimeout(() => {
            const appContainer = document.getElementById(
              "puunote-app-container",
            );
            if (appContainer) appContainer.focus();
          }, 50);
        } else if (e.key === "Enter" && e.shiftKey) {
          e.preventDefault();
          setEditingId(null);
          addSibling(editingId);
          setTimeout(() => {
            const appContainer = document.getElementById(
              "puunote-app-container",
            );
            if (appContainer) appContainer.focus();
          }, 50);
        }
      }
      return;
    }

    if (!activeId) return;

    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) {
        addSibling(activeId);
      } else {
        setEditingId(activeId);
      }
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      addChild(activeId);
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      const children = nodes.filter((n) => n.parentId === activeId);
      if (children.length > 0) setActiveId(children[0].id);
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const node = nodes.find((n) => n.id === activeId);
      if (node?.parentId) setActiveId(node.parentId);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const node = nodes.find((n) => n.id === activeId);
      if (node) {
        const siblings = nodes.filter((n) => n.parentId === node.parentId);
        const idx = siblings.findIndex((n) => n.id === activeId);
        if (idx >= 0 && idx < siblings.length - 1)
          setActiveId(siblings[idx + 1].id);
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const node = nodes.find((n) => n.id === activeId);
      if (node) {
        const siblings = nodes.filter((n) => n.parentId === node.parentId);
        const idx = siblings.findIndex((n) => n.id === activeId);
        if (idx > 0) setActiveId(siblings[idx - 1].id);
      }
      return;
    }
  }, []);

  return { handleKeyDown };
}
