import type { PuuDocument, PuuDocumentMetadata, PuuNode } from "./types";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import helpMd from "./assets/help.md?raw";

export const INITIAL_NODES: PuuNode[] = parseMarkdownToNodes(helpMd);

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const AUTOSIZE_DEBOUNCE_MS = 150;
export const HOTKEY_DOM_WAIT_MS = 50;
export const COPY_SUCCESS_TIMEOUT_MS = 2000;
export const TUTORIAL_DOCUMENT_TITLE = "PuuNote: Complete Guide";
export const TUTORIAL_DOCUMENT_KIND = "tutorial";

const currentTutorialTitle =
  INITIAL_NODES.find((node) => node.parentId === null)
    ?.content.split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0)
    ?.replace(/^#{1,6}\s+/, "")
    .trim() || TUTORIAL_DOCUMENT_TITLE;

export const withTutorialMetadata = (
  metadata?: PuuDocumentMetadata,
): PuuDocumentMetadata => ({
  ...metadata,
  kind: TUTORIAL_DOCUMENT_KIND,
});

export const isTutorialDocument = (
  document?: Pick<PuuDocument, "title" | "metadata"> | null,
) =>
  Boolean(
    document &&
    (document.metadata?.kind === TUTORIAL_DOCUMENT_KIND ||
      document.title === TUTORIAL_DOCUMENT_TITLE ||
      document.title === currentTutorialTitle),
  );
