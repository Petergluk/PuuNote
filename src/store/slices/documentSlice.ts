import {
  buildJsonExport,
  buildMarkdownExport,
  buildStructuredMarkdownExport,
  createDocumentFilename,
} from "../../domain/documentExport";
import { canMergeNodes, documentApi } from "../../domain/documentTree";
import { downloadTextFile } from "../../services/browserDownload";
import type { AppSlice, DocumentSlice } from "../appStoreTypes";
import { toast } from "sonner";
import { PuuNode } from "../../types";

export const createDocumentSlice: AppSlice<DocumentSlice> = (set, get) => {
  const applyAndCapture = <T>(
    operation: (prev: PuuNode[]) => { nextNodes: PuuNode[]; capture: T },
  ): T => {
    let captured: T | undefined;
    get().setNodes((prev) => {
      const { nextNodes, capture } = operation(prev);
      captured = capture;
      return nextNodes;
    });
    return captured as T;
  };

  return {
    documents: [],
    activeFileId: null,

    exportToMarkdown: () => {
      const { activeFileId, documents, nodes } = get();
      const document = documents.find((doc) => doc.id === activeFileId);
      try {
        downloadTextFile(
          buildMarkdownExport(nodes),
          `${createDocumentFilename(document, nodes)}.md`,
          "text/markdown",
        );
      } catch (err) {
        console.error("Failed to export markdown", err);
        toast.error("Failed to export Markdown.");
      }
    },

    exportToStructuredMarkdown: () => {
      const { activeFileId, documents, nodes } = get();
      const document = documents.find((doc) => doc.id === activeFileId);
      try {
        downloadTextFile(
          buildStructuredMarkdownExport(nodes),
          `${createDocumentFilename(document, nodes)}-structured.md`,
          "text/markdown",
        );
      } catch (err) {
        console.error("Failed to export structured markdown", err);
        toast.error("Failed to export structured Markdown.");
      }
    },

    exportToJson: () => {
      const { activeFileId, documents, nodes } = get();
      const document = documents.find((doc) => doc.id === activeFileId);
      try {
        downloadTextFile(
          buildJsonExport(document, nodes),
          `${createDocumentFilename(document, nodes)}.puunote.json`,
          "application/json",
        );
      } catch (err) {
        console.error("Failed to export JSON", err);
        toast.error("Failed to export JSON.");
      }
    },

    updateContent: (id, content) => {
      get().setNodes((prev) => documentApi.updateContent(prev, id, content), {
        historyGroupKey: `content:${id}`,
      });
    },

    addChild: (parentId) => {
      const newId = applyAndCapture((prev) => {
        const { nextNodes, newId } = documentApi.addChild(prev, parentId);
        return { nextNodes, capture: newId };
      });
      if (newId) {
        set({
          activeId: newId,
          selectedIds: [newId],
          editingId: newId,
        });
      }
    },

    addSibling: (targetId) => {
      const newId = applyAndCapture((prev) => {
        const { nextNodes, newId } = documentApi.addSibling(prev, targetId);
        return { nextNodes, capture: newId };
      });
      if (newId) {
        set({
          activeId: newId,
          selectedIds: [newId],
          editingId: newId,
        });
      }
    },

    deleteNode: (id) => {
      const parentFallback = applyAndCapture((prev) => {
        const { nextNodes, parentFallback } = documentApi.deleteNode(prev, id);
        return { nextNodes, capture: parentFallback };
      });
      const activeId = get().activeId;
      if (activeId === id) set({ activeId: parentFallback });
    },

    deleteNodes: (ids) => {
      if (ids.length === 0) return;
      const parentFallback = applyAndCapture((prev) => {
        const { nextNodes, parentFallback } = documentApi.deleteNodes(
          prev,
          ids,
        );
        return { nextNodes, capture: parentFallback };
      });
      const activeId = get().activeId;
      if (activeId && ids.includes(activeId)) {
        set({ activeId: parentFallback });
      }
    },

    deleteNodesPromoteChildren: (ids) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length === 0) return;

      const parentFallback = applyAndCapture((prev) => {
        const { nextNodes, parentFallback } =
          documentApi.deleteNodesPromoteChildren(prev, uniqueIds);
        return { nextNodes, capture: parentFallback };
      });

      set({
        activeId: parentFallback,
        selectedIds: parentFallback ? [parentFallback] : [],
        editingId: null,
      });
    },

    splitNode: (id, textBefore, textAfter) => {
      const newId = applyAndCapture((prev) => {
        const { nextNodes, newId } = documentApi.splitNode(
          prev,
          id,
          textBefore,
          textAfter,
        );
        return { nextNodes, capture: newId };
      });
      if (newId) {
        set({
          activeId: newId,
          selectedIds: [newId],
          editingId: newId,
        });
      }
    },

    mergeNodes: (masterId, nodeIdsToMerge) => {
      get().setNodes((prev) => {
        const validation = canMergeNodes(prev, masterId, nodeIdsToMerge);
        if (!validation.ok) {
          console.warn(validation.reason || "Selected cards cannot be merged.");
          return prev;
        }
        return documentApi.mergeNodes(prev, masterId, nodeIdsToMerge);
      });
      set({ activeId: masterId, selectedIds: [masterId], editingId: null });
    },

    moveNode: (sourceId, targetId, position) => {
      get().setNodes((prev) =>
        documentApi.moveNode(prev, sourceId, targetId, position),
      );
      set({ activeId: sourceId, draggedId: null });
    },

    moveNodes: (sourceIds, targetId, position) => {
      const uniqueSourceIds = Array.from(new Set(sourceIds));
      get().setNodes((prev) =>
        documentApi.moveNodes(prev, uniqueSourceIds, targetId, position),
      );
      const activeId = uniqueSourceIds[0] || null;
      set({
        activeId,
        selectedIds: uniqueSourceIds,
        draggedId: null,
      });
    },
  };
};
