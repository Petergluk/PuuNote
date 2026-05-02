import { useEffect, useCallback, RefObject, useRef } from "react";
import { useAppStore } from "../store/useAppStore";
import { generateId } from "../utils/id";
import { PuuNode } from "../types";
import { HOTKEY_DOM_WAIT_MS } from "../constants";
import {
  exportNodesToClipboardJson,
  exportNodesToClipboardHtml,
  exportNodesToMarkdown,
  parseClipboardHtmlNodes,
  parseClipboardNodes,
  parseMarkdownToNodes,
  PUUNOTE_CLIPBOARD_MIME,
  PUUNOTE_FORMAT_MARKER,
} from "../utils/markdownParser";
import {
  buildTreeIndex,
  computeDescendantIds,
  computeDescendantIdsFromIndex,
  getDepthFirstNodesFromIndex,
  orderedChildrenFromIndex,
} from "../utils/tree";

const CLIPBOARD_CACHE_MAX_AGE_MS = 2 * 60 * 1000;

const cloneNodesForPaste = (
  nodes: PuuNode[],
  parentId: string | null,
  baseOrder: number,
): PuuNode[] => {
  const { childrenMap } = buildTreeIndex(nodes);
  const idMap = new Map<string, string>();
  const cloned: PuuNode[] = [];

  const cloneSubtree = (
    node: PuuNode,
    nextParentId: string | null,
    order: number,
  ) => {
    const nextId = generateId();
    idMap.set(node.id, nextId);
    cloned.push({
      ...node,
      id: nextId,
      parentId: nextParentId,
      order,
    });

    const children = [...(childrenMap.get(node.id) || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
    children.forEach((child, childIndex) => {
      cloneSubtree(child, nextId, childIndex);
    });
  };

  const roots = [...(childrenMap.get(null) || [])].sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );
  roots.forEach((root, index) => {
    cloneSubtree(root, parentId, baseOrder + index + 1);
  });

  return cloned;
};

const getClipboardNodes = (nodes: PuuNode[], activeId: string | null) => {
  const selectedIds = useAppStore.getState().selectedIds;
  const treeIndex = buildTreeIndex(nodes);

  if (selectedIds.length > 1) {
    const selected = new Set(selectedIds);
    return getDepthFirstNodesFromIndex(treeIndex)
      .filter((node) => selected.has(node.id))
      .map((node) => ({
        ...node,
        parentId: selected.has(node.parentId || "") ? node.parentId : null,
      }));
  }

  const rootId = activeId || selectedIds[0] || null;
  if (!rootId) return [];

  const idsToCopy = new Set<string>([rootId]);
  computeDescendantIdsFromIndex(treeIndex, rootId).forEach((childId) =>
    idsToCopy.add(childId),
  );

  return getDepthFirstNodesFromIndex(treeIndex)
    .filter((node) => idsToCopy.has(node.id))
    .map((node) => ({
      ...node,
      parentId: idsToCopy.has(node.parentId || "") ? node.parentId : null,
    }));
};

const normalizeClipboardText = (value: string) =>
  value.replace(/\r\n?/g, "\n").trim();

const hasPuuNoteFormatMarker = (text: string) =>
  text.trimStart().startsWith(PUUNOTE_FORMAT_MARKER);

type ClipboardCache = {
  markdown: string;
  json: string;
  html: string;
  createdAt: number;
};

const buildClipboardPayload = (
  nodes: PuuNode[],
  lastCopiedCardsRef: React.MutableRefObject<ClipboardCache | null>,
) => {
  const markdown = exportNodesToMarkdown(nodes);
  const json = exportNodesToClipboardJson(nodes);
  const html = exportNodesToClipboardHtml(nodes);

  // PERF-7: Prevent memory leak for massive copies
  if (json.length < 1_000_000) {
    lastCopiedCardsRef.current = {
      markdown,
      json,
      html,
      createdAt: Date.now(),
    };
  } else {
    lastCopiedCardsRef.current = null;
  }

  return { markdown, json, html };
};

const getCachedClipboardJson = (
  text: string,
  lastCopiedCardsRef: React.MutableRefObject<ClipboardCache | null>,
) => {
  const lastCopied = lastCopiedCardsRef.current;
  if (!lastCopied) return "";
  const isFresh =
    Date.now() - lastCopied.createdAt < CLIPBOARD_CACHE_MAX_AGE_MS;
  if (!isFresh) {
    lastCopiedCardsRef.current = null;
    return "";
  }
  return normalizeClipboardText(lastCopied.markdown) ===
    normalizeClipboardText(text)
    ? lastCopied.json
    : "";
};

export function useAppHotkeys(containerRef?: RefObject<HTMLElement | null>) {
  const lastCopiedCardsRef = useRef<ClipboardCache | null>(null);

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return (
        element?.tagName === "TEXTAREA" ||
        element?.tagName === "INPUT" ||
        element?.isContentEditable
      );
    };

    const handleGlobalCopyOrCut = (e: ClipboardEvent) => {
      const state = useAppStore.getState();
      if (
        state.timelineOpen ||
        state.fullScreenId ||
        state.editingId ||
        isEditableTarget(e.target)
      ) {
        return;
      }

      const copiedNodes = getClipboardNodes(state.nodes, state.activeId);
      if (copiedNodes.length === 0) return;

      const { markdown, json, html } = buildClipboardPayload(
        copiedNodes,
        lastCopiedCardsRef,
      );
      e.preventDefault();
      e.clipboardData?.setData("text/plain", markdown);
      e.clipboardData?.setData("text/html", html);
      try {
        e.clipboardData?.setData(PUUNOTE_CLIPBOARD_MIME, json);
      } catch {
        // Browser DataTransfer may reject custom formats; HTML keeps structure.
      }

      if (e.type === "cut") {
        const latest = useAppStore.getState();
        if (latest.selectedIds.length > 1) {
          latest.deleteNodesPromoteChildren(latest.selectedIds);
        } else if (latest.activeId) {
          latest.deleteNode(latest.activeId);
        }
        useAppStore.getState().clearSelection();
      }
    };

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const state = useAppStore.getState();
      const {
        activeId,
        editingId,
        setNodes,
        fullScreenId,
        timelineOpen,
        pasteSplitMode,
      } = state;

      // Guard against pasting logic when not in tree view
      if (timelineOpen || fullScreenId) return;
      if (isEditableTarget(e.target)) return;
      if (editingId) return;

      const text =
        e.clipboardData?.getData("text/plain") ||
        e.clipboardData?.getData("text") ||
        "";
      const html = e.clipboardData?.getData("text/html") || "";
      const clipboardJson =
        e.clipboardData?.getData(PUUNOTE_CLIPBOARD_MIME) ||
        getCachedClipboardJson(text, lastCopiedCardsRef);
      if (!text) return;

      const clipboardJsonNodes = parseClipboardNodes(clipboardJson);
      const clipboardNodes =
        clipboardJsonNodes.length > 0
          ? clipboardJsonNodes
          : parseClipboardHtmlNodes(html);
      const markdownOutlineNodes =
        clipboardNodes.length === 0 &&
        !hasPuuNoteFormatMarker(text) &&
        /^#{1,6}\s+/m.test(text)
          ? parseMarkdownToNodes(text)
          : [];
      const importedNodes =
        clipboardNodes.length > 0
          ? clipboardNodes
          : hasPuuNoteFormatMarker(text)
            ? parseMarkdownToNodes(text)
            : markdownOutlineNodes;
      const parts =
        importedNodes.length > 0
          ? []
          : pasteSplitMode === "paragraph"
            ? text
                .split(/\n\s*\n+/)
                .map((p) => p.trim())
                .filter((p) => p.length > 0)
            : text
                .split(/^\s*---\s*$/m)
                .map((p) => p.trim())
                .filter((p) => p.length > 0);

      if (importedNodes.length === 0 && parts.length === 0) return;

      e.preventDefault();
      lastCopiedCardsRef.current = null;

      let firstPastedId: string | null = null;

      setNodes((prev) => {
        const targetParentId = activeId ?? null;
        const siblings = prev.filter((n) => n.parentId === targetParentId);
        const baseOrder =
          siblings.length > 0
            ? Math.max(...siblings.map((n) => n.order || 0))
            : -1;

        const newNodes: PuuNode[] =
          importedNodes.length > 0
            ? cloneNodesForPaste(importedNodes, targetParentId, baseOrder)
            : parts.map((part, i) => ({
                id: generateId(),
                content: part,
                parentId: targetParentId,
                order: baseOrder + i + 1,
              }));
        firstPastedId = newNodes[0]?.id ?? null;
        return [...prev, ...newNodes];
      });

      if (firstPastedId) {
        useAppStore.getState().setActiveId(firstPastedId);
      }
    };

    document.addEventListener("copy", handleGlobalCopyOrCut);
    document.addEventListener("cut", handleGlobalCopyOrCut);
    document.addEventListener("paste", handleGlobalPaste);
    return () => {
      document.removeEventListener("copy", handleGlobalCopyOrCut);
      document.removeEventListener("cut", handleGlobalCopyOrCut);
      document.removeEventListener("paste", handleGlobalPaste);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const state = useAppStore.getState();

      // UX-5: Ctrl+, opens settings
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "TEXTAREA" && target.tagName !== "INPUT") {
          e.preventDefault();
          state.setSettingsOpen(!state.settingsOpen);
          return;
        }
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "k" || e.key === "p" || e.key === "K" || e.key === "P")
      ) {
        e.preventDefault();
        state.setCommandPaletteOpen(!state.commandPaletteOpen);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
          return;
        }

        const isZ = e.key.toLowerCase() === "z";
        const isY = e.key.toLowerCase() === "y";
        if (isZ || isY) {
          const isRedoAction = (isZ && e.shiftKey) || isY;
          const isUndoAction = isZ && !e.shiftKey;

          if (isUndoAction && state.past.length > 0) {
            e.preventDefault();
            const prevActive = state.activeId;
            state.undo();
            const newNodes = useAppStore.getState().nodes;
            state.clearSelection();
            state.setActiveId(
              newNodes.find((n) => n.id === prevActive)
                ? prevActive
                : newNodes[0]?.id || null,
            );
          } else if (isRedoAction && state.future.length > 0) {
            e.preventDefault();
            const prevActive = state.activeId;
            state.redo();
            const newNodes = useAppStore.getState().nodes;
            state.clearSelection();
            state.setActiveId(
              newNodes.find((n) => n.id === prevActive)
                ? prevActive
                : newNodes[0]?.id || null,
            );
          }
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
        clearSelection,
        editorEnterMode,
        nodes,
      } = state;

      if (
        fullScreenId ||
        timelineOpen ||
        state.commandPaletteOpen ||
        state.confirmDialog.isOpen ||
        state.fileMenuOpen ||
        state.settingsOpen
      ) {
        return;
      }

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.isContentEditable;

      if (editingId || isTyping) {
        if (editingId) {
          if (
            e.key === "Escape" ||
            (e.key === "Enter" && (e.metaKey || e.ctrlKey))
          ) {
            e.preventDefault();
            setEditingId(null);
            setTimeout(() => {
              if (containerRef?.current) containerRef.current.focus();
            }, 0);
          } else if (e.key === "Tab") {
            e.preventDefault();
            setEditingId(null);
            addChild(editingId);
            setTimeout(() => {
              if (containerRef?.current) containerRef.current.focus();
            }, HOTKEY_DOM_WAIT_MS);
          } else if (e.key === "Enter") {
            const shouldCreateSibling =
              editorEnterMode === "enterNewline" ? e.shiftKey : !e.shiftKey;
            if (shouldCreateSibling) {
              e.preventDefault();
              setEditingId(null);
              addSibling(editingId);
              setTimeout(() => {
                if (containerRef?.current) containerRef.current.focus();
              }, HOTKEY_DOM_WAIT_MS);
            }
          }
        } else if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        setActiveId(null);
        state.setFloatingActionsVisible(false);
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

      // M9: . toggles FloatingCardActions (keyboard-accessible action panel)
      if (e.key === ".") {
        e.preventDefault();
        const cur = useAppStore.getState().floatingActionsVisible;
        useAppStore.getState().setFloatingActionsVisible(!cur);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        addChild(activeId);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        const treeIndex = buildTreeIndex(nodes);
        const children = orderedChildrenFromIndex(treeIndex, activeId);
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
          const treeIndex = buildTreeIndex(nodes);
          const siblings = orderedChildrenFromIndex(treeIndex, node.parentId);
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
          const treeIndex = buildTreeIndex(nodes);
          const siblings = orderedChildrenFromIndex(treeIndex, node.parentId);
          const idx = siblings.findIndex((n) => n.id === activeId);
          if (idx > 0) setActiveId(siblings[idx - 1].id);
        }
        return;
      }

      // UX-8: Delete / Backspace deletes the active node (only when not editing)
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();

        if (state.selectedIds.length > 1) {
          state.openConfirm(
            `Delete ${state.selectedIds.length} selected cards and their descendants?`,
            () => {
              state.deleteNodes(state.selectedIds);
              state.clearSelection();
            },
          );
        } else {
          const descendantCount = computeDescendantIds(nodes, activeId).size;
          if (descendantCount > 0) {
            state.openConfirm(
              `Delete this card and its ${descendantCount} descendants?`,
              () => state.deleteNode(activeId),
            );
          } else {
            state.deleteNode(activeId);
          }
        }
        return;
      }
    },
    [containerRef],
  );

  return { handleKeyDown };
}
