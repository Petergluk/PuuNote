import { PuuNode } from "../types";
import { buildTreeIndex } from "./tree";
import { trimBlankEdges, normalizeLineEndings } from "./markdownCommon";

const toMarkdownCard = (content: string, depth: number): string => {
  const lines = trimBlankEdges(normalizeLineEndings(content).split("\n"));
  return lines.join("\n").trim();
};

export const exportNodesToMarkdown = (nodes: PuuNode[]): string => {
  let md = "";
  const visited = new Set<string>();
  const { childrenMap } = buildTreeIndex(nodes);
  const traverse = (parentId: string | null, depth: number) => {
    const children = [...(childrenMap.get(parentId) || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const cardContent = toMarkdownCard(child.content, depth);
      if (cardContent) {
        md += `${cardContent}\n\n`;
      }
      traverse(child.id, depth + 1);
    }
  };
  traverse(null, 0);

  return md.trim() + "\n";
};

const splitCardForMindMap = (content: string) => {
  const lines = trimBlankEdges(normalizeLineEndings(content).split("\n"));
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);

  if (firstContentLine === -1) {
    return { title: "Untitled", note: "" };
  }

  const firstLine = lines[firstContentLine].trim();
  const title = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .trim();
  const note = trimBlankEdges([
    ...lines.slice(0, firstContentLine),
    ...lines.slice(firstContentLine + 1),
  ])
    .join("\n")
    .trim();

  return { title: title || "Untitled", note };
};

const formatMindMapNote = (note: string, depth: number) => {
  if (!note.trim()) return "";

  const indent = depth === 0 ? "" : "\t".repeat(Math.max(0, depth - 1));
  const lines = normalizeLineEndings(note).split("\n");
  return lines
    .map((line) => {
      if (line.trim().length === 0) return `${indent}  >`;
      return `${indent}  > ${line}`;
    })
    .join("\n");
};

export const exportNodesToStructuredMarkdown = (nodes: PuuNode[]): string => {
  let md = "";
  const visited = new Set<string>();
  const { childrenMap } = buildTreeIndex(nodes);

  const traverse = (parentId: string | null, depth: number) => {
    const children = [...(childrenMap.get(parentId) || [])].sort(
      (a, b) => (a.order || 0) - (b.order || 0),
    );

    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);

      const { title, note } = splitCardForMindMap(child.content);
      if (depth === 0) {
        md += `# ${title}\n`;
      } else {
        md += `${"\t".repeat(depth - 1)}- ${title}\n`;
      }

      const formattedNote = formatMindMapNote(note, depth);
      if (formattedNote) md += `\n${formattedNote}\n`;
      md += "\n";

      traverse(child.id, depth + 1);
    }
  };

  traverse(null, 0);

  return md.trim() + "\n";
};
