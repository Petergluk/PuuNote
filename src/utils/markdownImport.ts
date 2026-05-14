import { PuuNode } from "../types";
import { generateId } from "./id";
import { normalizeLineEndings, trimBlankEdges } from "./markdownCommon";

export const PUUNOTE_FORMAT_MARKER = "<!-- puunote-format: 1 -->";

export const parseMarkdownToNodes = (mdText: string): PuuNode[] => {
  const isPuuNoteFormat = mdText.trimStart().startsWith(PUUNOTE_FORMAT_MARKER);
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
  const cleanText = normalizeLineEndings(mdText).replaceAll(
    PUUNOTE_FORMAT_MARKER,
    "",
  );
  if (cleanText.includes("<!-- puunote-node -->")) {
    return parseLegacyPuuNoteFormat(cleanText);
  }

  const separatorRegex = cleanText.includes("<!-- puunote-node -->")
    ? /^[^\S\n]*<!-- puunote-node -->[^\S\n]*$/gm
    : /^[^\S\n]*---[^\S\n]*$/gm;
  const blocks = cleanText.split(separatorRegex);
  const imported: PuuNode[] = [];
  const stack: { id: string; spaces: number }[] = [];
  const nextOrderByParent = new Map<string | null, number>();

  const takeNextOrder = (parentId: string | null) => {
    const nextOrder = nextOrderByParent.get(parentId) ?? 0;
    nextOrderByParent.set(parentId, nextOrder + 1);
    return nextOrder;
  };

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
    const node: PuuNode = {
      id: generateId(),
      content: contentToSave,
      parentId,
      order: takeNextOrder(parentId),
    };
    imported.push(node);
    stack.push({ id: node.id, spaces: minSpaces });
  }
  return imported;
};

const getIndentLength = (line: string) => {
  const leadingWhitespace = line.match(/^[^\S\n]*/)?.[0] || "";
  return leadingWhitespace.replace(/\t/g, "    ").length;
};

const stripIndent = (line: string, spacesToStrip: number) => {
  let charsToStrip = 0;
  let spaceCount = 0;
  for (let c = 0; c < line.length; c++) {
    if (spaceCount >= spacesToStrip) break;
    if (line[c] === " ") {
      spaceCount += 1;
      charsToStrip += 1;
    } else if (line[c] === "\t") {
      spaceCount += 4;
      charsToStrip += 1;
    } else {
      break;
    }
  }
  return line.substring(charsToStrip);
};

const isLegacyNodeMarker = (line: string) =>
  line.trim() === "<!-- puunote-node -->";

const parsePlainSeparatorBlocks = (mdText: string): PuuNode[] => {
  const normalized = normalizeLineEndings(mdText);
  const lines = normalized.split("\n");
  const hasStructuralLines = lines.some((line) => {
    const trimmed = line.trimStart();
    return /^#{1,6}\s+/.test(trimmed) || /^[-*+]\s+/.test(trimmed);
  });

  if (hasStructuralLines || !/^[^\S\n]*---[^\S\n]*$/m.test(normalized)) {
    return [];
  }

  return normalized
    .split(/^[^\S\n]*---[^\S\n]*$/m)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((content, order) => ({
      id: generateId(),
      content,
      parentId: null,
      order,
    }));
};

const parseLegacyPuuNoteFormat = (mdText: string): PuuNode[] => {
  const lines = mdText.split("\n");
  const imported: PuuNode[] = [];
  const nextOrderByParent = new Map<string | null, number>();
  let index = 0;

  const takeNextOrder = (parentId: string | null) => {
    const nextOrder = nextOrderByParent.get(parentId) ?? 0;
    nextOrderByParent.set(parentId, nextOrder + 1);
    return nextOrder;
  };

  const skipNoise = () => {
    while (
      index < lines.length &&
      (lines[index].trim() === "" ||
        lines[index].trim() === PUUNOTE_FORMAT_MARKER)
    ) {
      index++;
    }
  };

  const parseNode = (parentId: string | null, startIndent: number): void => {
    skipNoise();
    if (index >= lines.length || isLegacyNodeMarker(lines[index])) return;

    const id = generateId();
    const contentLines: string[] = [];
    const node: PuuNode = {
      id,
      content: "",
      parentId,
      order: takeNextOrder(parentId),
    };
    imported.push(node);

    while (index < lines.length) {
      const line = lines[index];

      if (isLegacyNodeMarker(line)) {
        const markerIndent = getIndentLength(line);
        if (markerIndent === startIndent) {
          index++;
          break;
        }
        if (markerIndent > startIndent) {
          index++;
          continue;
        }
        break;
      }

      if (line.trim() === "") {
        contentLines.push("");
        index++;
        continue;
      }

      const indent = getIndentLength(line);
      if (indent > startIndent) {
        while (
          contentLines.length > 0 &&
          contentLines[contentLines.length - 1].trim() === ""
        ) {
          contentLines.pop();
        }
        parseNode(id, indent);
        continue;
      }

      if (indent < startIndent) break;

      contentLines.push(stripIndent(line, startIndent));
      index++;
    }

    const cleanContent = trimBlankEdges(contentLines).join("\n").trim();
    node.content = cleanContent;
  };

  while (index < lines.length) {
    skipNoise();
    if (index >= lines.length) break;
    if (isLegacyNodeMarker(lines[index])) {
      index++;
      continue;
    }
    parseNode(null, getIndentLength(lines[index]));
  }

  return imported.filter((node) => node.content.trim().length > 0);
};

const parseMindMapFormat = (mdText: string): PuuNode[] => {
  const separatorBlocks = parsePlainSeparatorBlocks(mdText);
  if (separatorBlocks.length > 0) {
    return separatorBlocks;
  }

  const lines = normalizeLineEndings(mdText).split("\n");
  const imported: PuuNode[] = [];
  let latestNode: PuuNode | null = null;
  const stack: { id: string; spaces: number; headingLevel?: number }[] = [];
  const nextOrderByParent = new Map<string | null, number>();

  const takeNextOrder = (parentId: string | null) => {
    const nextOrder = nextOrderByParent.get(parentId) ?? 0;
    nextOrderByParent.set(parentId, nextOrder + 1);
    return nextOrder;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().length === 0) {
      if (latestNode) latestNode.content += "\n";
      continue;
    }
    const indentMatch = line.match(/^([ \t]*)/);
    const leadingSpaces = (indentMatch ? indentMatch[1] : "").replace(
      /\t/g,
      "    ",
    ).length;
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
    const node: PuuNode = {
      id: generateId(),
      content: contentToSave.trimStart(),
      parentId,
      order: takeNextOrder(parentId),
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
