import type { PuuNode } from "../types";
import { useAppStore } from "../store/useAppStore";

const cleanTitle = (value: string) => {
  const stripped = value
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^>\s*/, "")
    .replace(/^[*_`~]+|[*_`~]+$/g, "")
    .trim();
  const bracketMatch = stripped.match(/^\[(.+)\]$/);
  return (bracketMatch?.[1] || stripped).trim();
};

export const deriveDocumentTitle = (
  nodes: PuuNode[],
  fallback = "Untitled",
) => {
  const roots = nodes
    .filter((node) => node.parentId === null)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
  const firstNode = roots[0] || nodes[0];
  if (!firstNode) return fallback;

  const firstMeaningfulLine =
    firstNode.content
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) || "";
  const title = cleanTitle(firstMeaningfulLine);
  if (!title) return fallback;

  return title.length > 80 ? `${title.slice(0, 77)}...` : title;
};

export const updateDocumentMetadataInStore = (
  fileId: string,
  nodes: PuuNode[],
  options: { fallback?: string; touchUpdatedAt?: boolean } = {},
) => {
  const now = Date.now();
  useAppStore.setState((state) => {
    let didChange = false;
    const documents = state.documents.map((document) => {
      if (document.id !== fileId) return document;

      const newTitle = deriveDocumentTitle(
        nodes,
        options.fallback || document.title || "Untitled",
      );
      const shouldUpdateTitle = document.title !== newTitle;
      if (!shouldUpdateTitle && !options.touchUpdatedAt) return document;

      didChange = true;
      return {
        ...document,
        title: shouldUpdateTitle ? newTitle : document.title,
        updatedAt: options.touchUpdatedAt ? now : document.updatedAt,
      };
    });

    return didChange ? { documents } : state;
  });
};
