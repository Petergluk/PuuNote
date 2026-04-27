import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { Plus, Maximize2, Trash2, Scissors } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { PuuNode } from "../types";
import { AutoSizeTextarea } from "./AutoSizeTextarea";
import {
  useAppStore,
  computeActivePath,
  computeDescendantIds,
} from "../store/useAppStore";
import { generateId } from "../utils/id";
export const Card = React.memo(({ node }: { node: PuuNode }) => {
  const {
    activeId,
    editingId,
    draggedId,
    setDraggedId,
    cardsCollapsed,
    setActiveId,
    setEditingId,
    setFullScreenId,
    addChild,
    addSibling,
    setNodesRaw,
    nodes,
  } = useAppStore();
  const activePath = useMemo(
    () => computeActivePath(nodes, activeId),
    [nodes, activeId],
  );
  const descendantIds = useMemo(
    () => computeDescendantIds(nodes, activeId),
    [nodes, activeId],
  );
  const isActive = activeId === node.id;
  const isEditing = editingId === node.id;
  const isDescendantFromActive = descendantIds.has(node.id);
  const pathIndex = activePath.indexOf(node.id);
  const activeIndex = activePath.indexOf(activeId as string);
  const isInPath = pathIndex !== -1;
  const isAncestor = isInPath && pathIndex < activeIndex;
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [dropTarget, setDropTarget] = useState<
    "none" | "top" | "bottom" | "right"
  >("none");
  const updateContent = (id: string, content: string) => {
    const nodes = useAppStore.getState().nodes;
    setNodesRaw(nodes.map((n) => (n.id === id ? { ...n, content } : n)));
  };
  const splitNode = (id: string, textBefore: string, textAfter: string) => {
    const newId = generateId();
    const prev = useAppStore.getState().nodes;
    const targetNode = prev.find((n) => n.id === id);
    if (!targetNode) return;
    const next = prev.map((n) => {
      if (n.id === id) return { ...n, content: textBefore };
      if (
        n.parentId === targetNode.parentId &&
        (n.order || 0) > (targetNode.order || 0)
      ) {
        return { ...n, order: (n.order || 0) + 1 };
      }
      return n;
    });
    setNodesRaw([
      ...next,
      {
        id: newId,
        content: textAfter,
        parentId: targetNode.parentId,
        order: (targetNode.order || 0) + 1,
      },
    ]);
    setActiveId(newId);
    setEditingId(newId);
  };
  const deleteNode = (id: string) => {
    const prev = useAppStore.getState().nodes;
    let parentFallback: string | null = null;
    const idsToRemove = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      idsToRemove.add(curr);
      const children = prev.filter((n) => n.parentId === curr);
      for (const c of children) queue.push(c.id);
    }
    parentFallback = prev.find((n) => n.id === id)?.parentId || null;
    setNodesRaw(prev.filter((n) => !idsToRemove.has(n.id)));
    if (useAppStore.getState().activeId === id) {
      setActiveId(parentFallback);
    }
  };
  const moveNode = (
    sourceId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ) => {
    const prev = useAppStore.getState().nodes;
    const isDescendant = (childId: string, parentId: string) => {
      let curr = prev.find((n) => n.id === childId);
      while (curr) {
        if (curr.parentId === parentId) return true;
        curr = prev.find((n) => n.id === curr.parentId);
      }
      return false;
    };
    if (sourceId === targetId || isDescendant(targetId, sourceId)) {
      setDraggedId(null);
      return;
    }
    const copy = prev.map((n) => ({ ...n }));
    const targetNode = copy.find((n) => n.id === targetId);
    if (!targetNode) {
      setDraggedId(null);
      return;
    }
    const sourceIdx = copy.findIndex((n) => n.id === sourceId);
    if (sourceIdx === -1) {
      setDraggedId(null);
      return;
    }
    const source = copy[sourceIdx];
    copy.splice(sourceIdx, 1);
    let newParentId = targetNode.parentId;
    if (position === "child") {
      newParentId = targetId;
      const destSiblings = copy
        .filter((n) => n.parentId === newParentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      source.parentId = newParentId;
      source.order =
        destSiblings.length > 0
          ? (destSiblings[destSiblings.length - 1].order || 0) + 1
          : 0;
      copy.push(source);
    } else {
      newParentId = targetNode.parentId;
      source.parentId = newParentId;
      const destSiblings = copy
        .filter((n) => n.parentId === newParentId)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      const targetIdx = destSiblings.findIndex((n) => n.id === targetId);
      destSiblings.splice(
        position === "before" ? targetIdx : targetIdx + 1,
        0,
        source,
      );
      destSiblings.forEach((n, i) => {
        n.order = i;
        const objInCopy = copy.find((x) => x.id === n.id);
        if (objInCopy) objInCopy.order = i;
        if (n.id === source.id) source.order = i;
      });
      copy.push(source);
    }
    setNodesRaw(copy);
    setActiveId(sourceId);
    setDraggedId(null);
  };
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
  const isBright = !activeId || isActive || isInPath || isDescendantFromActive;
  const shouldCollapse = cardsCollapsed && !isEditing && !isActive;
  let cardClasses =
    "bg-app-panel border border-app-border opacity-50 hover:opacity-100 transition-all duration-200 hover:bg-app-bg text-app-text-primary";
  if (isActive) {
    cardClasses =
      "bg-app-card-active border border-app-border-hover border-l-4 !border-l-orange-500 shadow-md opacity-100 transition-all duration-200 transform scale-[1.01] z-50 text-app-text-primary";
  } else if (!activeId) {
    cardClasses =
      "bg-app-card border border-app-border opacity-100 transition-all duration-200 hover:bg-app-card-hover hover:border-app-border-hover z-20 text-app-text-primary";
  } else if (isBright) {
    cardClasses =
      "bg-app-card border border-app-border opacity-100 shadow-sm transition-all duration-200 hover:bg-app-card-hover hover:border-app-border-hover z-20 text-app-text-primary";
  }
  if (draggedId === node.id) cardClasses += " !opacity-30 scale-95";
  if (dropTarget === "top") cardClasses += " !border-t-[#a3966a] !border-t-4";
  if (dropTarget === "bottom")
    cardClasses += " !border-b-[#a3966a] !border-b-4";
  if (dropTarget === "right") cardClasses += " !border-r-[#a3966a] !border-r-4";
  return (
    <div
      className={`relative group/card-wrapper`}
      id={`card-${node.id}`}
      ref={cardRef}
    >
      {" "}
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
          if (draggedId === node.id) return;
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
          if (!isActive) setActiveId(node.id);
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
              onChange={(e: any) => updateContent(node.id, e.target.value)}
              onBlur={() => setEditingId(null)}
              autoFocus
              className="w-full resize-none outline-none bg-transparent font-sans text-app-text-primary leading-relaxed min-h-[24px] py-0 m-0"
            />{" "}
            <div className="absolute -top-3 -right-2 flex items-center gap-1 opacity-0 group-hover/edit:opacity-100 transition-opacity z-10 shadow-lg bg-app-card-hover border border-app-border rounded p-1">
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
          <div
            className={`prose prose-sm max-w-none break-words prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight ${isBright ? "prose-headings:text-app-text-primary dark:prose-headings:text-[#eee] prose-p:text-app-text-primary dark:prose-p:text-[#d1d1d1] prose-li:text-app-text-primary dark:prose-li:text-[#d1d1d1] prose-strong:text-app-text-primary dark:prose-strong:text-white" : "prose-headings:text-app-text-muted dark:prose-headings:text-[#666] prose-p:text-app-text-muted dark:prose-p:text-[#666] prose-li:text-app-text-muted dark:prose-li:text-[#666] prose-strong:text-app-text-secondary dark:prose-strong:text-[#888]"} prose-p:leading-relaxed prose-p:my-1.5 prose-headings:mt-2 prose-headings:mb-1 prose-ul:my-1.5 prose-li:my-0.5 prose-h1:text-[1.8em] prose-h2:text-[1.5em] prose-h3:text-[1.25em] prose-h4:text-[1.05em] prose-h4:opacity-85 prose-h5:font-sans prose-h5:text-[0.9em] prose-h5:uppercase prose-h5:tracking-wider prose-h5:opacity-75 prose-h6:font-mono prose-h6:text-[0.8em] prose-h6:opacity-60 prose-a:text-app-accent prose-code:text-app-text-primary dark:prose-code:text-app-accent prose-code:bg-app-card dark:prose-code:bg-[#222] prose-code:px-1 prose-code:rounded ${shouldCollapse ? "max-h-[14em] overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_70%,transparent_100%)]" : ""}`}
          >
            {" "}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeSanitize]}
            >
              {node.content || "*Empty node...*"}
            </ReactMarkdown>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Actions Menu */}{" "}
      <AnimatePresence>
        {" "}
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
              className="absolute top-1/2 -right-4 -translate-y-1/2 bg-app-card border border-app-border text-app-accent rounded-full p-1.5 shadow-lg hover:bg-app-card-hover hover:border-app-accent dark:hover:border-app-accent transition-colors z-20 flex items-center justify-center"
              title="Add Child (Tab)"
            >
              {" "}
              <Plus size={14} />{" "}
            </button>{" "}
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(node.id);
              }}
              className="absolute -top-3 -right-3 bg-red-50 border border-red-200 text-red-600 dark:text-[#995555] rounded-full p-1.5 shadow-lg hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-colors z-20 flex items-center justify-center"
              title="Delete"
            >
              {" "}
              <Trash2 size={12} />{" "}
            </button>{" "}
          </motion.div>
        )}{" "}
      </AnimatePresence>{" "}
    </div>
  );
});
