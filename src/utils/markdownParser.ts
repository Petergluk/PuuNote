import { PuuNode } from "../types";
import { generateId } from "./id";
import { buildTreeIndex } from "./tree";

export const PUUNOTE_FORMAT_MARKER = "<!-- puunote-format: 1 -->";

export const exportNodesToMarkdown = (nodes: PuuNode[]): string => {
  let md = `${PUUNOTE_FORMAT_MARKER}\n\n`;
  const visited = new Set<string>();
  const { childrenMap } = buildTreeIndex(nodes);
  const traverse = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const indent = " ".repeat(depth * 4);
      const lines = child.content.split("\n");
      const formattedText = lines
        .map((line) => {
          if (line.length === 0) return indent;
          return `${indent}${line}`;
        })
        .join("\n");
      md += formattedText + "\n\n";
      traverse(child.id, depth + 1);
      md += `${indent}<!-- puunote-node -->\n\n`;
    }
  };
  traverse(null, 0);

  // Clean up trailing separators at the end of the file safely using regex
  md = md.replace(/(?:\s*<!-- puunote-node -->)+\s*$/, "");
  return md.trim() + "\n";
};

export const parseMarkdownToNodes = (mdText: string): PuuNode[] => {
  const isPuuNoteFormat = mdText.includes(PUUNOTE_FORMAT_MARKER);
  if (isPuuNoteFormat) {
    return parsePuuNoteFormat(mdText);
  } else {
    return parseMindMapFormat(mdText);
  }
};

export const toggleCheckboxContent = (
  content: string,
  index: number,
  newValue: boolean,
): string => {
  let count = 0;
  return (content || "").replace(
    /^(\s*(?:[-*+]|\d+\.)\s+\[)([\sXx])(\](?:\s+|$))/gm,
    (match, p1, _p2, p3) => {
      if (count === index) {
        count++;
        return p1 + (newValue ? "x" : " ") + p3;
      }
      count++;
      return match;
    },
  );
};

const parsePuuNoteFormat = (mdText: string): PuuNode[] => {
  // Try dynamic replacement string to not escape everything
  const markerRegex = new RegExp(`${PUUNOTE_FORMAT_MARKER}\\s*`, "g");
  const cleanText = mdText.replace(markerRegex, "");
  const separatorRegex = cleanText.includes("<!-- puunote-node -->")
    ? /^[^\S\n]*<!-- puunote-node -->[^\S\n]*$/gm
    : /^[^\S\n]*---[^\S\n]*$/gm;
  const blocks = cleanText.split(separatorRegex);
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
  const stack: { id: string; spaces: number; headingLevel?: number }[] = [];
  const getIndentLength = (str: string) => str.replace(/\t/g, "    ").length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) {
      if (latestNode) latestNode.content += "\n";
      continue;
    }
    const indentMatch = line.match(/^([ \t]*)/);
    const leadingSpaces = getIndentLength(indentMatch ? indentMatch[1] : "");
    const trimmed = line.trimStart();
    const listMatch = trimmed.match(/^([-*+])\s+(.*)/);
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)/);

    let contentToSave = line;
    let structuralSpaces = leadingSpaces;
    let headingLevel = -1;

    if (headingMatch && leadingSpaces === 0) {
      contentToSave = trimmed;
      headingLevel = headingMatch[1].length;
      structuralSpaces = -1;
    } else if (listMatch) {
      contentToSave = listMatch[2];
    } else if (!latestNode) {
      // heading at the top becomes root
    } else {
      latestNode.content += "\n" + line;
      continue;
    }
    if (headingLevel !== -1) {
      while (
        stack.length > 0 &&
        (stack[stack.length - 1].spaces >= 0 ||
          stack[stack.length - 1].headingLevel! >= headingLevel)
      ) {
        stack.pop();
      }
    } else {
      while (
        stack.length > 0 &&
        stack[stack.length - 1].spaces >= structuralSpaces
      ) {
        stack.pop();
      }
    }

    const parentId = stack.length > 0 ? stack[stack.length - 1].id : null;
    const currentOrder = imported.filter((n) => n.parentId === parentId).length;
    const node: PuuNode = {
      id: generateId(),
      content: contentToSave.trimStart(),
      parentId,
      order: currentOrder,
    };
    imported.push(node);
    latestNode = node;
    stack.push({
      id: node.id,
      spaces: structuralSpaces,
      headingLevel: headingLevel !== -1 ? headingLevel : undefined,
    });
  }

  imported.forEach((n) => {
    const lines = n.content.split(/\n/);
    if (lines.length > 1) {
      let minIndent = Infinity;
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim().length > 0) {
          const match = lines[i].match(/^[ \t]*/);
          if (match) {
            const indentMatch = match[0];
            const len = indentMatch.replace(/\t/g, "    ").length;
            minIndent = Math.min(minIndent, len);
          }
        }
      }
      if (minIndent > 0 && minIndent !== Infinity) {
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim().length > 0) {
            let charsToStrip = 0;
            let spaceCount = 0;
            for (let c = 0; c < lines[i].length; c++) {
              if (spaceCount >= minIndent) break;
              if (lines[i][c] === " ") {
                spaceCount += 1;
                charsToStrip += 1;
              } else if (lines[i][c] === "\t") {
                spaceCount += 4;
                charsToStrip += 1;
              } else {
                break;
              }
            }
            lines[i] = lines[i].substring(charsToStrip);
          }
        }
      }
    }
    n.content = lines.join("\n").trim();
    // Some mindmap exporters use blockquotes (`> `) to represent node comments/notes. 
    // We strip them so they appear as normal text inside the card.
    n.content = n.content.replace(/^\s*>[ \t]?/gm, "");
    n.content = n.content.replace(/\n{3,}/g, "\n\n");
  });
  return imported;
};
