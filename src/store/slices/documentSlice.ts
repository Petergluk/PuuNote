import {
  buildJsonExport,
  buildMarkdownExport,
  createDocumentFilename,
} from "../../domain/documentExport";
import { canMergeNodes, documentApi } from "../../domain/documentTree";
import { PluginRegistry } from "../../plugins/registry";
import { downloadTextFile } from "../../services/browserDownload";
import type { PuuNode } from "../../types";
import type { AppSlice, DocumentSlice } from "../appStoreTypes";

export const createDocumentSlice: AppSlice<DocumentSlice> = (set, get) => ({
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
    }
  },

  updateContent: (id, content) => {
    let updatedNode: PuuNode | undefined;
    get().setNodes((prev) => {
      const next = documentApi.updateContent(prev, id, content);
      if (next !== prev) updatedNode = next.find((node) => node.id === id);
      return next;
    });
    if (updatedNode) PluginRegistry.emitNodeUpdated(updatedNode);
  },

  addChild: (parentId) => {
    let newIdValue: string | null = null;
    get().setNodes((prev) => {
      const { nextNodes, newId } = documentApi.addChild(prev, parentId);
      newIdValue = newId;
      return nextNodes;
    });
    if (newIdValue) {
      set({
        activeId: newIdValue,
        selectedIds: [newIdValue],
        editingId: newIdValue,
      });
      const createdNode = get().nodes.find((node) => node.id === newIdValue);
      if (createdNode) PluginRegistry.emitNodeCreated(createdNode);
    }
  },

  addSibling: (targetId) => {
    let newIdValue: string | null = null;
    get().setNodes((prev) => {
      const { nextNodes, newId } = documentApi.addSibling(prev, targetId);
      newIdValue = newId;
      return nextNodes;
    });
    if (newIdValue) {
      set({
        activeId: newIdValue,
        selectedIds: [newIdValue],
        editingId: newIdValue,
      });
      const createdNode = get().nodes.find((node) => node.id === newIdValue);
      if (createdNode) PluginRegistry.emitNodeCreated(createdNode);
    }
  },

  deleteNode: (id) => {
    let parentFallbackValue: string | null = null;
    let removedIds: string[] = [];
    get().setNodes((prev) => {
      const { nextNodes, parentFallback } = documentApi.deleteNode(prev, id);
      parentFallbackValue = parentFallback;
      const nextIds = new Set(nextNodes.map((node) => node.id));
      removedIds = prev
        .filter((node) => !nextIds.has(node.id))
        .map((node) => node.id);
      return nextNodes;
    });
    const activeId = get().activeId;
    if (activeId === id) set({ activeId: parentFallbackValue });
    removedIds.forEach((removedId) =>
      PluginRegistry.emitNodeDeleted(removedId),
    );
  },

  splitNode: (id, textBefore, textAfter) => {
    let newIdValue: string | null = null;
    let updatedNode: PuuNode | undefined;
    get().setNodes((prev) => {
      const { nextNodes, newId } = documentApi.splitNode(
        prev,
        id,
        textBefore,
        textAfter,
      );
      newIdValue = newId;
      updatedNode = nextNodes.find((node) => node.id === id);
      return nextNodes;
    });
    if (updatedNode) PluginRegistry.emitNodeUpdated(updatedNode);
    if (newIdValue) {
      set({
        activeId: newIdValue,
        selectedIds: [newIdValue],
        editingId: newIdValue,
      });
      const createdNode = get().nodes.find((node) => node.id === newIdValue);
      if (createdNode) PluginRegistry.emitNodeCreated(createdNode);
    }
  },

  mergeNodes: (masterId, nodeIdsToMerge) => {
    let removedIds: string[] = [];
    let updatedNode: PuuNode | undefined;
    get().setNodes((prev) => {
      const validation = canMergeNodes(prev, masterId, nodeIdsToMerge);
      if (!validation.ok) {
        console.warn(validation.reason || "Selected cards cannot be merged.");
        return prev;
      }
      const next = documentApi.mergeNodes(prev, masterId, nodeIdsToMerge);
      const nextIds = new Set(next.map((node) => node.id));
      removedIds = prev
        .filter((node) => !nextIds.has(node.id))
        .map((node) => node.id);
      updatedNode = next.find((node) => node.id === masterId);
      return next;
    });
    set({ activeId: masterId, selectedIds: [masterId], editingId: null });
    if (updatedNode) PluginRegistry.emitNodeUpdated(updatedNode);
    removedIds.forEach((removedId) =>
      PluginRegistry.emitNodeDeleted(removedId),
    );
  },

  moveNode: (sourceId, targetId, position) => {
    let updatedNode: PuuNode | undefined;
    get().setNodes((prev) => {
      const next = documentApi.moveNode(prev, sourceId, targetId, position);
      if (next !== prev)
        updatedNode = next.find((node) => node.id === sourceId);
      return next;
    });
    set({ activeId: sourceId, draggedId: null });
    if (updatedNode) PluginRegistry.emitNodeUpdated(updatedNode);
  },

  moveNodes: (sourceIds, targetId, position) => {
    let updatedNodes: PuuNode[] = [];
    const uniqueSourceIds = Array.from(new Set(sourceIds));
    get().setNodes((prev) => {
      const next = documentApi.moveNodes(
        prev,
        uniqueSourceIds,
        targetId,
        position,
      );
      if (next !== prev) {
        const movedIds = new Set(uniqueSourceIds);
        updatedNodes = next.filter((node) => movedIds.has(node.id));
      }
      return next;
    });
    const activeId = uniqueSourceIds[0] || null;
    set({
      activeId,
      selectedIds: uniqueSourceIds,
      draggedId: null,
    });
    updatedNodes.forEach((node) => PluginRegistry.emitNodeUpdated(node));
  },
});
