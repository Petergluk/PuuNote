import React, { useMemo } from "react";
import { Keyboard } from "lucide-react";
import { INITIAL_NODES } from "../constants";
import { useAppStore, computeActivePath } from "../store/useAppStore";
export function Footer() {
  const { nodes, activeId, colWidth, setNodesRaw, setActiveId } = useAppStore();
  const activePathLength = useMemo(
    () => computeActivePath(nodes, activeId).length,
    [nodes, activeId],
  );
  const wordCount = useMemo(() => {
    return nodes.reduce((acc, n) => {
      const words = n.content
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      return acc + words.length;
    }, 0);
  }, [nodes]);
  return (
    <footer className="h-10 shrink-0 border-t border-app-border bg-app-panel px-2 sm:px-6 flex items-center justify-between z-50 transition-colors duration-300">
      {" "}
      <div className="flex gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase hidden lg:flex">
        {" "}
        <span>CARDS: {nodes.length}</span> <span>WORDS: {wordCount}</span>{" "}
        {activeId && <span>DEPTH: {activePathLength}</span>}{" "}
      </div>{" "}
      <div className="flex items-center gap-4 sm:gap-6 text-[10px] text-app-text-muted font-mono tracking-widest uppercase">
        {" "}
        <div className="flex items-center gap-2 border-r border-app-border pr-4 mr-2 hidden sm:flex">
          {" "}
          <span>Col Width</span>{" "}
          <input
            type="range"
            min="220"
            max="680"
            value={colWidth}
            onChange={(e) =>
              useAppStore.setState({ colWidth: Number(e.target.value) })
            }
            className="w-20 lg:w-24 accent-[#a3966a] cursor-pointer"
            title="Adjust column width"
          />{" "}
        </div>{" "}
        <div className="flex items-center gap-2" title="Navigation">
          <Keyboard size={12} />
          <span className="hidden sm:inline">Arrows: Navigate</span>
        </div>{" "}
        <div>
          <strong className="text-app-text-secondary">Enter/DblClick:</strong>{" "}
          <span className="hidden sm:inline">Edit</span>
        </div>{" "}
        <div>
          <strong className="text-app-text-secondary">Shift+Enter:</strong>{" "}
          <span className="hidden sm:inline">Add Sibling</span>
        </div>{" "}
        <div>
          <strong className="text-app-text-secondary">Tab:</strong>{" "}
          <span className="hidden sm:inline">Add Child</span>
        </div>{" "}
        <button
          onClick={() => {
            setNodesRaw(
              INITIAL_NODES.map((n, i) => ({ ...n, order: n.order ?? i })),
            );
            setActiveId(INITIAL_NODES[0]?.id || null);
          }}
          className="ml-2 w-5 h-5 flex items-center justify-center rounded-full bg-app-card-hover hover:bg-app-border text-app-text-secondary font-bold text-xs transition-colors shadow-inner"
          title="Help / Reset to initial tutorial (Use Ctrl+Z to undo)"
        >
          {" "}
          ?{" "}
        </button>{" "}
      </div>{" "}
    </footer>
  );
}
