import { PuuNode } from "../types";
import { validateNodes } from "./schema";
import { normalizeLineEndings } from "./markdownCommon";
import { exportNodesToMarkdown } from "./markdownExport";

export const PUUNOTE_CLIPBOARD_MIME = "web application/x-puunote+json";
const PUUNOTE_CLIPBOARD_HTML_META = "puunote-clipboard";
const PUUNOTE_CLIPBOARD_FORMAT = "puunote.clipboard";
const PUUNOTE_CLIPBOARD_VERSION = 1;

interface PuuNoteClipboardPayload {
  format: typeof PUUNOTE_CLIPBOARD_FORMAT;
  version: typeof PUUNOTE_CLIPBOARD_VERSION;
  nodes: PuuNode[];
}

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

const renderInlineMarkdownToHtml = (value: string) => {
  const codeSpans: string[] = [];
  let html = escapeHtml(value).replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@PUUNOTE_CODE_${codeSpans.length}@@`;
    codeSpans.push(`<code>${code}</code>`);
    return token;
  });

  html = html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/_([^_]+)_/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');

  codeSpans.forEach((code, index) => {
    html = html.replace(`@@PUUNOTE_CODE_${index}@@`, code);
  });

  return html;
};

const markdownToClipboardHtml = (markdown: string): string => {
  const lines = normalizeLineEndings(markdown).split("\n");
  const blocks: string[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];
  let listTag: "ol" | "ul" | null = null;
  let codeFenceLines: string[] | null = null;

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    blocks.push(
      `<p>${paragraphLines.map(renderInlineMarkdownToHtml).join("<br>")}</p>`,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listTag || listItems.length === 0) return;
    blocks.push(`<${listTag}>${listItems.join("")}</${listTag}>`);
    listItems = [];
    listTag = null;
  };

  const flushCodeFence = () => {
    if (!codeFenceLines) return;
    blocks.push(
      `<pre><code>${escapeHtml(codeFenceLines.join("\n"))}</code></pre>`,
    );
    codeFenceLines = null;
  };

  for (const line of lines) {
    if (codeFenceLines) {
      if (/^\s*```/.test(line)) {
        flushCodeFence();
      } else {
        codeFenceLines.push(line);
      }
      continue;
    }

    if (/^\s*```/.test(line)) {
      flushParagraph();
      flushList();
      codeFenceLines = [];
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      blocks.push(
        `<h${level}>${renderInlineMarkdownToHtml(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    const unorderedMatch = line.match(/^\s*[-*+]\s+(?:\[[ xX]\]\s+)?(.+)$/);
    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const nextTag = orderedMatch ? "ol" : "ul";
      if (listTag && listTag !== nextTag) flushList();
      listTag = nextTag;
      listItems.push(
        `<li>${renderInlineMarkdownToHtml(
          (orderedMatch || unorderedMatch)![1],
        )}</li>`,
      );
      continue;
    }

    const quoteMatch = line.match(/^\s*>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      blocks.push(
        `<blockquote>${renderInlineMarkdownToHtml(quoteMatch[1])}</blockquote>`,
      );
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push("<hr>");
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  flushCodeFence();

  return `<article data-puunote-clipboard="true">${blocks.join("")}</article>`;
};

export const exportNodesToClipboardHtml = (nodes: PuuNode[]): string => {
  const markdown = exportNodesToMarkdown(nodes);
  const encodedPayload = encodeURIComponent(exportNodesToClipboardJson(nodes));

  return `<meta name="${PUUNOTE_CLIPBOARD_HTML_META}" content="${encodedPayload}">${markdownToClipboardHtml(markdown)}`;
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
