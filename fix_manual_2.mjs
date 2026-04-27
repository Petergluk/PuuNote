import fs from 'fs';

const fix = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content);
};

fix("src/App.tsx", [
  ['/* Create new */\ndocument specifically for this structured output', '/* Create new document specifically for this structured output */\n']
]);

fix("src/components/AIActionModal.tsx", [
  ['placeholder="Paste a long read or text block here..."className="', 'placeholder="Paste a long read or text block here..." className="']
]);

fix("src/components/FullScreenModal.tsx", [
  ['placeholder="Type here..."className="', 'placeholder="Type here..." className="']
]);

fix("src/hooks/useAppHotkeys.ts", [
  ['/* Do not intercept */\nif the user is typing in a generic input that isn\'t the active card being edited', '/* Do not intercept if the user is typing in a generic input that isn\'t the active card being edited */\n']
]);

fix("src/hooks/useFileSystem.ts", [
  ['/* Throttle / Save to LocalStorage */ localStorage.setItem(`puu_file_${activeFileId}``', '/* Throttle / Save to LocalStorage */ localStorage.setItem(`puu_file_${activeFileId}`'],
  ['/* 3. Save */\ndocuments meta when changed', '/* 3. Save documents meta when changed */\n']
]);

fix("src/store/useAppStore.ts", [
  ['} })) );  */', '} })) );'],
  ['{ /* Documents */\ndocuments:', '{\n/* Documents */\ndocuments:'],
  ['activeFileId: string | null; /*  Nodes & History */\nnodes:', 'activeFileId: string | null;\n/*  Nodes & History */\nnodes:'],
  ['future: PuuNode[][]; /* Selection */\nactiveId:', 'future: PuuNode[][];\n/* Selection */\nactiveId:'],
  ['aiModalOpen: boolean; /* UI State */\ntheme:', 'aiModalOpen: boolean;\n/* UI State */\ntheme:'],
  ['colWidth: number; } interface AppActions { /* Setup & Utils */\nsetTheme:', 'colWidth: number; }\ninterface AppActions {\n/* Setup & Utils */\nsetTheme:'],
  ['setAiModalOpen: (open: boolean) => void; /* Node Mutations */\nsetNodesRaw:', 'setAiModalOpen: (open: boolean) => void;\n/* Node Mutations */\nsetNodesRaw:'],
  ['setNodesRaw: (nodes: PuuNode[]) => void; /* for loading, doesn\'t push to history */\nsetNodes:', 'setNodesRaw: (nodes: PuuNode[]) => void;\n/* for loading, doesn\'t push to history */\nsetNodes:'],
  ['setNodes: (updater: PuuNode[] | ((prev: PuuNode[]) => PuuNode[])) => void; /* pushes to history */\nundo:', 'setNodes: (updater: PuuNode[] | ((prev: PuuNode[]) => PuuNode[])) => void;\n/* pushes to history */\nundo:'],
  ['canRedo: () => boolean; exportToMarkdown: () => void; /* Complex Operations */\nupdateContent:', 'canRedo: () => boolean;\nexportToMarkdown: () => void;\n/* Complex Operations */\nupdateContent:'],
  ['colWidth: 320, /* Actions */\nsetTheme:', 'colWidth: 320,\n/* Actions */\nsetTheme:'],
  ['URL.revokeObjectURL(url); }, /* Node Operations */\nupdateContent:', 'URL.revokeObjectURL(url); },\n/* Node Operations */\nupdateContent:'],
  ['export const computeActivePath', 'export const computeActivePath'],
  // And fix the comment that might not have closed!
  ['/*  Nodes & History nodes: PuuNode[]; past: PuuNode[][]; future: PuuNode[][]; // Selection activeId: string | null;', '/*  Nodes & History */ nodes: PuuNode[]; past: PuuNode[][]; future: PuuNode[][]; /* Selection */ activeId: string | null;']
]);

// Wait, the previous useAppStore.ts file had issues. I'll just rewrite it from scratch using my knowledge if it fails again.
console.log("Done");
