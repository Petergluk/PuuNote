import fs from 'fs';

const fix = (file, replacements) => {
  let content = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) {
    content = content.split(from).join(to);
  }
  fs.writeFileSync(file, content);
};

// 1. App.tsx
fix("src/App.tsx", [
  ['/* Vertical Alignment */\nfor all path items for', '/* Vertical Alignment for all path items */\nfor'],
  ['/* Parse the MD */\nconst imported', '/* Parse the MD */\nconst imported'], // might be ok
  ['/* Create new */\ndocument specifically for this structured output if', '/* Create new document specifically for this structured output */\nif'],
  ['/* If clicked directly on the main background areas (not on cards) */\nif (', '/* If clicked directly on the main background areas (not on cards) */\nif (']
]);

// 2. TimelineView.tsx
fix("src/components/TimelineView.tsx", [
  ['/* Use */\nuseMemo to prevent unnecessary calculations and mutations inside render const orderedNodes', '/* Use useMemo to prevent unnecessary calculations and mutations inside render */\nconst orderedNodes'],
  ['/* Extract outline (headings) from nodes */\nconst outline', '/* Extract outline (headings) from nodes */\nconst outline']
]);

// 3. AIActionModal.tsx
fix("src/components/AIActionModal.tsx", [
  ['/* Reset */\nif (!isOpen)', '/* Reset */\nif (!isOpen)']
]);

// 4. FullScreenModal.tsx
fix("src/components/FullScreenModal.tsx", [
  ['/* Refs to auto-scroll to the initially passed node */\nconst activeElRef', '/* Refs to auto-scroll to the initially passed node */\nconst activeElRef'] // wait, earlier the error was at line 2. Oh, I'll just check all syntax
]);

// 5. useAppHotkeys.ts
fix("src/hooks/useAppHotkeys.ts", [
  ['/* Global Paste Handler */\nfor adding nodes via Command+V when focused but not editing useEffect', '/* Global Paste Handler for adding nodes via Command+V when focused but not editing */\nuseEffect'],
  ['/* Check */\nif the user is focusing an input elsewhere (just in case) const target', '/* Check if the user is focusing an input elsewhere (just in case) */\nconst target']
]);

// 6. useFileSystem.ts
fix("src/hooks/useFileSystem.ts", [
  ['/* Load nodes */\nfor active file let newNodes', '/* Load nodes for active file */\nlet newNodes'],
  ['/* Run ONCE on mount /* 2. Continuous Save on change of nodes */ */', '/* Run ONCE on mount */ /* 2. Continuous Save on change of nodes */'],
  ['/* Throttle / Save to LocalStorage localStorage.setItem(`puu_file_${activeFileId */\n}', '/* Throttle / Save to LocalStorage */ localStorage.setItem(`puu_file_${activeFileId}`']
]);

// 7. useHistory.ts
fix("src/hooks/useHistory.ts", [
  ['/* remove oldest history en */\ntry to respect maxHistory limit }', '/* remove oldest history entry to respect maxHistory limit */ }']
]);

// 8. aiService.ts
fix("src/hooks/useHistory.ts", [ // wait!
]);
fix("src/services/aiService.ts", [
  ['/* Low temperature */\nfor more structural adherence }', '/* Low temperature for more structural adherence */ }']
]);

// 9. markdownParser.ts
fix("src/utils/markdownParser.ts", [
  ['/* If the file consists of structural `---` dividers, */\nuse the exact lossless parser const isPuuNoteFormat', '/* If the file consists of structural `---` dividers, use the exact lossless parser */\nconst isPuuNoteFormat'],
  ['/* Heading at the top becomes root structuralSpaces = trimmed.startsWith(\'#\') ? -1 : leadingSpaces; */', '/* Heading at the top becomes root */\nstructuralSpaces = trimmed.startsWith(\'#\') ? -1 : leadingSpaces;\n']
]);

fix("src/store/useAppStore.ts", [
  ['/*  Nodes & History nodes:', '/*  Nodes & History */\nnodes:'],
  ['// Selection activeId:', '/* Selection */\nactiveId:'],
  ['// UI State theme:', '/* UI State */\ntheme:'],
  ['// Setup & Utils setTheme:', '/* Setup & Utils */\nsetTheme:'],
  ['// Node Mutations setNodesRaw:', '/* Node Mutations */\nsetNodesRaw:'],
  ['// for loading, doesn\'t push to history setNodes:', '/* for loading, doesn\'t push to history */\nsetNodes:'],
  ['// pushes to history undo:', '/* pushes to history */\nundo:'],
  ['// Complex Operations updateContent:', '/* Complex Operations */\nupdateContent:'],
  ['// States documents:', '/* States */\ndocuments:'],
  ['// Actions setTheme:', '/* Actions */\nsetTheme:'],
  ['// Node Operations updateContent:', '/* Node Operations */\nupdateContent:']
]);
console.log("Done");
