import { PuuNode } from "./types";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import helpMd from "./assets/help.md?raw";

export const INITIAL_NODES: PuuNode[] = parseMarkdownToNodes(helpMd);

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const AUTOSIZE_DEBOUNCE_MS = 150;
export const HOTKEY_DOM_WAIT_MS = 50;
export const COPY_SUCCESS_TIMEOUT_MS = 2000;
export const TUTORIAL_DOCUMENT_TITLE = "PuuNote: Complete Guide";
export const BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD = 250;
