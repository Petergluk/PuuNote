import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { useColumns, useActivePathScroll } from "../hooks/useBoardLayout";
import {
  buildTreeIndex,
  computeAncestorPathFromIndex,
  computeDescendantIdsFromIndex,
} from "../utils/tree";
import { buildBranchColorIdMap, getBranchColor } from "../utils/branchColors";
import { ErrorBoundary } from "./ErrorBoundary";
import { Card } from "./Card";

export function BoardView() {
  const activeFileId = useAppStore((s) => s.activeFileId);
  const activeId = useAppStore((s) => s.activeId);
  const editingId = useAppStore((s) => s.editingId);
  const timelineOpen = useAppStore((s) => s.timelineOpen);
  const nodes = useAppStore((s) => s.nodes);
  const addChild = useAppStore((s) => s.addChild);
  const inactiveBranchesMode = useAppStore((s) => s.inactiveBranchesMode);
  const theme = useAppStore((s) => s.theme);
  const branchColorTone = useAppStore((s) => s.branchColorTone);

  const treeIndex = useMemo(() => buildTreeIndex(nodes), [nodes]);

  const activeAncestorPath = useMemo(
    () => computeAncestorPathFromIndex(treeIndex, activeId),
    [treeIndex, activeId],
  );

  const activeAncestorSet = useMemo(
    () => new Set(activeAncestorPath),
    [activeAncestorPath],
  );

  const activeDescendantIds = useMemo(
    () => computeDescendantIdsFromIndex(treeIndex, activeId),
    [treeIndex, activeId],
  );

  const branchColorIdByNode = useMemo(
    () => buildBranchColorIdMap(nodes, treeIndex),
    [nodes, treeIndex],
  );

  const useActiveCorridor = inactiveBranchesMode === "hide";
  const layoutAlignTrigger = useAppStore((s) => s.layoutAlignTrigger);

  const columns = useColumns(
    nodes,
    treeIndex,
    activeAncestorPath,
    activeId,
    useActiveCorridor,
  );

  const { setColRef } = useActivePathScroll(
    activeFileId,
    activeId,
    editingId,
    activeAncestorPath,
    activeDescendantIds,
    timelineOpen,
    columns.length,
    layoutAlignTrigger,
  );

  if (timelineOpen) return null;

  return (
    <div className="flex flex-row items-start gap-0 px-0 py-0 min-h-full h-full w-max relative col-spacer">
      {columns.map((colNodes, colIndex) => {
        return (
          <div
            key={colIndex}
            style={{ zIndex: Math.max(1, 30 - colIndex) }}
            ref={(el) => setColRef(colIndex, el)}
            className="column-container h-full shrink-0 overflow-y-auto overflow-x-hidden hide-scrollbar px-2 sm:px-4 transition-all duration-200 col-spacer relative"
          >
            <div className="column-inner relative flex flex-col gap-3 pt-16 pb-[95vh] mx-auto transition-all duration-200 col-spacer">
              {colNodes.map((node) => (
                <ErrorBoundary key={node.id}>
                  <Card
                    node={node}
                    isInPath={activeAncestorSet.has(node.id)}
                    isDescendantFromActive={activeDescendantIds.has(node.id)}
                    branchColor={getBranchColor(
                      theme,
                      branchColorIdByNode.get(node.id),
                      branchColorTone,
                    )}
                  />
                </ErrorBoundary>
              ))}
              {colNodes.length === 0 && colIndex === 0 && (
                <div
                  onClick={() => addChild(null)}
                  className="bg-app-card border border-dashed border-app-border p-6 rounded flex justify-center items-center h-min group cursor-pointer hover:border-app-accent transition-colors shadow-sm"
                >
                  <span className="text-[10px] uppercase tracking-[0.2em] text-app-text-muted group-hover:text-app-accent transition-colors">
                    + Add Fragment
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
