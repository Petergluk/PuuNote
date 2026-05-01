import { PuuNode } from "../types";
import { generateId } from "./id";
import { buildTreeIndex } from "./tree";
import { validateNodes } from "./schema";

export const PUUNOTE_FORMAT_MARKER = "<!-- puunote-format: 1 -->";
export const PUUNOTE_CLIPBOARD_MIME = "web application/x-puunote+json";
const PUUNOTE_CLIPBOARD_HTML_META = "puunote-clipboard";
const PUUNOTE_CLIPBOARD_FORMAT = "puunote.clipboard";
const PUUNOTE_CLIPBOARD_VERSION = 1;

interface PuuNoteClipboardPayload {
  format: typeof PUUNOTE_CLIPBOARD_FORMAT;
  version: typeof PUUNOTE_CLIPBOARD_VERSION;
  nodes: PuuNode[];
}

const normalizeLineEndings = (value: string) => value.replace(/\r\n?/g, "\n");

const trimBlankEdges = (lines: string[]) => {
  const next = [...lines];
  while (next.length > 0 && next[0].trim() === "") next.shift();
  while (next.length > 0 && next[next.length - 1].trim() === "") next.pop();
  return next;
};

const headingLevelForDepth = (depth: number) =>
  "#".repeat(Math.min(depth + 1, 6));

const toMarkdownCard = (content: string, depth: number): string => {
  const lines = trimBlankEdges(normalizeLineEndings(content).split("\n"));
  const heading = headingLevelForDepth(depth);

  if (lines.length === 0) return `${heading} Untitled`;

  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  const firstLine = lines[firstContentLine] || "";
  const headingMatch = firstLine.match(/^\s*#{1,6}\s+(.+?)\s*$/);

  if (headingMatch) {
    lines[firstContentLine] = `${heading} ${headingMatch[1]}`;
    return lines.join("\n").trim();
  }

  if (lines.length === 1) {
    return `${heading} ${lines[0].trim() || "Untitled"}`;
  }

  const title = lines[0].trim() || "Untitled";
  const body = lines.slice(1).join("\n").trim();
  return body ? `${heading} ${title}\n\n${body}` : `${heading} ${title}`;
};

export const exportNodesToMarkdown = (nodes: PuuNode[]): string => {
  let md = "";
  const visited = new Set<string>();
  const { childrenMap } = buildTreeIndex(nodes);
  const traverse = (parentId: string | null, depth: number) => {
    const children = childrenMap.get(parentId) || [];
    children.sort((a, b) => (a.order || 0) - (b.order || 0));
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      md += `${toMarkdownCard(child.content, depth)}\n\n`;
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

export const exportNodesToClipboardJson = (nodes: PuuNode[]): string => {
  const payload: PuuNoteClipboardPayload = {
    format: PUUNOTE_CLIPBOARD_FORMAT,
    version: PUUNOTE_CLIPBOARD_VERSION,
    nodes,
  };

  return JSON.stringify(payload);
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const exportNodesToClipboardHtml = (nodes: PuuNode[]): string => {
  const markdown = exportNodesToMarkdown(nodes);
  const encodedPayload = encodeURIComponent(exportNodesToClipboardJson(nodes));

  return `<meta name="${PUUNOTE_CLIPBOARD_HTML_META}" content="${encodedPayload}"><pre>${escapeHtml(markdown)}</pre>`;
};

export const parseClipboardNodes = (raw: string): PuuNode[] => {
  try {
    const payload = JSON.parse(raw) as Partial<PuuNoteClipboardPayload>;
    if (
      payload.format !== PUUNOTE_CLIPBOARD_FORMAT ||
      payload.version !== PUUNOTE_CLIPBOARD_VERSION ||
      !Array.isArray(payload.nodes)
    ) {
      return [];
    }

    return validateNodes(payload.nodes);
  } catch {
    return [];
  }
};

export const parseClipboardHtmlNodes = (html: string): PuuNode[] => {
  const match = html.match(
    /<meta\s+name=["']puunote-clipboard["']\s+content=["']([^"']+)["']\s*\/?>/i,
  );
  if (!match) return [];

  try {
    return parseClipboardNodes(decodeURIComponent(match[1]));
  } catch {
    return [];
  }
};

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

const parseLegacyPuuNoteFormat = (mdText: string): PuuNode[] => {
  const lines = mdText.split("\n");
  const imported: PuuNode[] = [];
  let index = 0;

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
    const siblingOrder = imported.filter(
      (node) => node.parentId === parentId,
    ).length;
    const node: PuuNode = {
      id,
      content: "",
      parentId,
      order: siblingOrder,
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
  const lines = normalizeLineEndings(mdText).split("\n");
  const imported: PuuNode[] = [];
  let latestNode: PuuNode | null = null;
  const stack: { id: string; spaces: number; headingLevel?: number }[] = [];

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
