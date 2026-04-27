import { PuuNode } from "../types";
const generateId = () =>
  crypto.randomUUID?.() || Math.random().toString(36).substring(2, 9);
export const exportNodesToMarkdown = (nodes: PuuNode[]): string => {
  let md = "";
  const traverse = (parentId: string | null, depth: number) => {
    const children = nodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    for (const child of children) {
      const indent = " ".repeat(depth);
      const lines = child.content.split("\n");
      const formattedText = lines
        .map((line) => {
          if (line.length === 0) return indent;
          return `${indent}${line}`;
        })
        .join("\n");
      md += formattedText + "\n\n";
      md += `${indent}---\n\n`;
      traverse(child.id, depth + 1);
    }
  };
  traverse(null, 0);
  md = md.trimEnd();
  if (md.endsWith("---")) md = md.substring(0, md.length - 3).trimEnd();
  return md + "\n";
};
export const parseMarkdownToNodes = (mdText: string): PuuNode[] => {
  /* If the file consists of structural `---` dividers, use the exact lossless parser */
  const isPuuNoteFormat = /(?:^|\n)[^\S\n]*---[^\S\n]*(?:\n|$)/.test(mdText);
  if (isPuuNoteFormat) {
    return parsePuuNoteFormat(mdText);
  } else {
    return parseMindMapFormat(mdText);
  }
};
const parsePuuNoteFormat = (mdText: string): PuuNode[] => {
  const blocks = mdText.split(/^[^\S\n]*---[^\S\n]*$/gm);
  const imported: PuuNode[] = [];
  const stack: { id: string; spaces: number }[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.trim().length === 0) continue;
    const lines = block.split(/\r?\n/);
    let minSpaces = Infinity;
    for (const line of lines) {
      if (line.trim().length > 0) {
        const leadingWhitespace = line.match(/^[^\S\n]*/)?.[0] || "";
        const spaces = leadingWhitespace.replace(/\t/g, " ").length;
        if (spaces < minSpaces) minSpaces = spaces;
      }
    }
    if (minSpaces === Infinity) minSpaces = 0;
    const contentLines = [];
    for (const line of lines) {
      if (line.trim().length === 0) {
        contentLines.push("");
      } else {
        let charsToStrip = 0;
        let spaceCount = 0;
        for (let c = 0; c < line.length; c++) {
          if (spaceCount >= minSpaces) break;
          if (line[c] === " ") {
            spaceCount += 1;
            charsToStrip += 1;
          } else if (line[c] === "\t") {
            spaceCount += 4;
            charsToStrip += 1;
          } else break;
        }
        contentLines.push(line.substring(charsToStrip));
      }
    }
    while (contentLines.length > 0 && contentLines[0].trim() === "")
      contentLines.shift();
    while (
      contentLines.length > 0 &&
      contentLines[contentLines.length - 1].trim() === ""
    )
      contentLines.pop();
    const contentToSave = contentLines.join("\n");
    while (stack.length > 0 && stack[stack.length - 1].spaces >= minSpaces) {
      stack.pop();
    }
    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
    const currentOrder = imported.filter((n) => n.parentId === parentId).length;
    const node: PuuNode = {
      id: generateId(),
      content: contentToSave,
      parentId,
      order: currentOrder,
    };
    imported.push(node);
    stack.push({ id: node.id, spaces: minSpaces });
  }
  return imported;
};
const parseMindMapFormat = (mdText: string): PuuNode[] => {
  const lines = mdText.split(/\r?\n/);
  const imported: PuuNode[] = [];
  let latestNode: PuuNode | null = null;
  const stack: { id: string; spaces: number }[] = [];
  const getIndentLength = (str: string) => str.replace(/\t/g, " ").length;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) {
      if (latestNode) latestNode.content += "\n";
      continue;
    }
    const indentMatch = line.match(/^([\s\t]*)(.*)/);
    const leadingSpaces = getIndentLength(indentMatch ? indentMatch[1] : "");
    const trimmed = indentMatch ? indentMatch[2] : "";
    const listMatch = trimmed.match(/^([-*+])\s+(.*)/);
    let isNewNode = false;
    let contentToSave = line;
    let structuralSpaces = leadingSpaces;
    if (listMatch) {
      isNewNode = true;
      contentToSave = listMatch[2];
    } else if (!latestNode) {
      isNewNode = true; /* Heading at the top becomes root */
      structuralSpaces = trimmed.startsWith("#") ? -1 : leadingSpaces;
    } else {
      const expectedIndent =
        stack.length > 0 ? stack[stack.length - 1].spaces + 2 : 0;
      let finalLine = line;
      if (leadingSpaces >= expectedIndent) {
        let charsToStrip = 0;
        let spaceCount = 0;
        for (let c = 0; c < line.length; c++) {
          if (spaceCount >= expectedIndent) break;
          if (line[c] === " ") {
            spaceCount += 1;
            charsToStrip += 1;
          } else if (line[c] === "\t") {
            spaceCount += 4;
            charsToStrip += 1;
          } else break;
        }
        finalLine = line.substring(charsToStrip);
      } else {
        finalLine = finalLine.trimStart();
      }
      latestNode.content += "\n" + finalLine;
      continue;
    }
    if (isNewNode) {
      while (
        stack.length > 0 &&
        stack[stack.length - 1].spaces >= structuralSpaces
      ) {
        stack.pop();
      }
      const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
      const currentOrder = imported.filter(
        (n) => n.parentId === parentId,
      ).length;
      const node: PuuNode = {
        id: generateId(),
        content: contentToSave.trimStart(),
        parentId,
        order: currentOrder,
      };
      imported.push(node);
      latestNode = node;
      stack.push({ id: node.id, spaces: structuralSpaces });
    }
  }
  imported.forEach((n) => {
    n.content = n.content.trim();
    n.content = n.content.replace(/\n{3,}/g, "\n\n");
  });
  return imported;
};
