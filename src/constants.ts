import type { PuuDocument, PuuDocumentMetadata, PuuNode } from "./types";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import helpMdRu from "../docs/HELP.ru.md?raw";
import helpMdEn from "../docs/HELP.en.md?raw";

export const INITIAL_NODES_RU: PuuNode[] = parseMarkdownToNodes(helpMdRu);
export const INITIAL_NODES_EN: PuuNode[] = parseMarkdownToNodes(helpMdEn);

export const INITIAL_NODES: PuuNode[] = INITIAL_NODES_RU;

export const getLocalizedInitialNodes = (lang: string) => {
    return lang.startsWith('ru') ? INITIAL_NODES_RU : INITIAL_NODES_EN;
};

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_HISTORY_STATES = 500;
export const THEMES = ["mono", "light", "light-cool", "dark", "blue", "brown"] as const;

export const AUTOSIZE_DEBOUNCE_MS = 2000;
export const HOTKEY_DOM_WAIT_MS = 50;
export const COPY_SUCCESS_TIMEOUT_MS = 2000;
export const FULLSCREEN_IDLE_TIMEOUT_MS = 3000;
export const TUTORIAL_DOCUMENT_TITLE = "PuuNote: Complete Guide";
export const TUTORIAL_DOCUMENT_KIND = "tutorial";

const extractTutorialTitle = (nodes: PuuNode[]) => {
  return nodes.find((node) => node.parentId === null)
    ?.content.split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0)
    ?.replace(/^#{1,6}\s+/, "")
    .trim() || TUTORIAL_DOCUMENT_TITLE;
};

const currentTutorialTitleRu = extractTutorialTitle(INITIAL_NODES_RU);
const currentTutorialTitleEn = extractTutorialTitle(INITIAL_NODES_EN);

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
      document.title === currentTutorialTitleRu ||
      document.title === currentTutorialTitleEn),
  );
