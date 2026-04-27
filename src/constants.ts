import { PuuNode } from "./types";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import helpMd from "./assets/help.md?raw";

export const INITIAL_NODES: PuuNode[] = parseMarkdownToNodes(helpMd);

export const AUTOSIZE_DEBOUNCE_MS = 400;
export const HOTKEY_DOM_WAIT_MS = 50;
export const COPY_SUCCESS_TIMEOUT_MS = 2000;
