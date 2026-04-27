import { PuuNode } from "./types";
import { parseMarkdownToNodes } from "./utils/markdownParser";
import helpMd from "./assets/help.md?raw";
export const INITIAL_NODES: PuuNode[] = parseMarkdownToNodes(helpMd);
