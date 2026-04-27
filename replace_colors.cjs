const fs = require('fs');
const path = require('path');

const replacements = [
  // Typography hardcoded colors
  [/dark:text-\[#eee\]/g, ''],
  [/dark:text-\[#d1d1d1\]/g, ''],
  [/dark:text-white/g, ''],
  [/dark:text-\[#888\]/g, ''],
  [/dark:text-\[#666\]/g, ''],
  [/dark:text-\[#ccc\]/g, ''],
  [/dark:text-\[#777\]/g, ''],
  [/dark:text-\[#555\]/g, ''],
  [/dark:text-\[#444\]/g, ''],
  [/dark:text-\[#8f9ba8\]/g, ''],
  
  [/text-zinc-900\s/g, 'text-app-text-primary '],
  [/text-zinc-800\s/g, 'text-app-text-primary '],
  [/text-zinc-700\s/g, 'text-app-text-secondary '],
  [/text-zinc-600\s/g, 'text-app-text-secondary '],
  [/text-zinc-500\s/g, 'text-app-text-muted '],
  [/text-zinc-400\s/g, 'text-app-text-muted '],
  [/text-black\s/g, 'text-app-text-primary '],

  // Prose
  [/prose-headings:text-zinc-\d+/g, 'prose-headings:text-app-text-primary'],
  [/prose-p:text-zinc-\d+/g, 'prose-p:text-app-text-secondary'],
  [/prose-li:text-zinc-\d+/g, 'prose-li:text-app-text-secondary'],
  [/prose-strong:text-zinc-\d+/g, 'prose-strong:text-app-text-primary'],
  [/prose-ul:text-zinc-\d+/g, 'prose-ul:text-app-text-secondary'],
  [/prose-ol:text-zinc-\d+/g, 'prose-ol:text-app-text-secondary'],
  [/prose-strong:text-black/g, 'prose-strong:text-app-text-primary'],
  
  // Backgrounds
  [/dark:bg-\[.*?\]/g, ''],
  [/bg-zinc-50\s/g, 'bg-app-bg '],
  [/bg-white\s/g, 'bg-app-panel '],
  [/bg-zinc-100\s/g, 'bg-app-card '],
  [/bg-zinc-200\s/g, 'bg-app-card-hover '],
  [/bg-zinc-300\s/g, 'bg-app-border '],

  // Backgrounds Hover
  [/dark:hover:bg-\[.*?\]/g, ''],
  [/hover:bg-zinc-50\s/g, 'hover:bg-app-card-hover '],
  [/hover:bg-zinc-100\s/g, 'hover:bg-app-card-hover '],
  [/hover:bg-zinc-200\s/g, 'hover:bg-app-card-hover '],
  [/hover:bg-zinc-300\s/g, 'hover:bg-app-border-hover '],

  // Borders
  [/dark:border-\[.*?\]/g, ''],
  [/border-zinc-200\s/g, 'border-app-border '],
  [/border-zinc-300\s/g, 'border-app-border-hover '],
  [/border-zinc-400\s/g, 'border-app-text-muted '],
  [/border-zinc-800/g, 'border-app-border'],

  // Borders Hover
  [/dark:hover:border-\[.*?\]/g, ''],
  [/hover:border-zinc-200\s/g, 'hover:border-app-border-hover '],
  [/hover:border-zinc-300\s/g, 'hover:border-app-text-muted '],

  // Opacity
  [/dark:opacity-\[.*?\]/g, ''],
  [/dark:opacity-\d+/g, ''],
  [/dark:hover:opacity-\d+/g, ''],

  // Hover Text
  [/dark:hover:text-\[.*?\]/g, ''],
  [/dark:hover:text-white/g, ''],
  [/hover:text-zinc-900/g, 'hover:text-app-text-primary'],
  [/hover:text-zinc-800/g, 'hover:text-app-text-primary'],

  // Prose code
  [/prose-code:text-zinc-800/g, 'prose-code:text-app-text-primary'],
  [/prose-code:bg-zinc-100/g, 'prose-code:bg-app-card'],

  // Shadow
  [/dark:shadow-\w+/g, ''],
  
  // Cleanup extra spaces
  [/\s+/g, ' '],
  [/\s+"/g, '"'],
  [/"\s+/g, '"'],
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      replacements.forEach(([regex, repl]) => {
        content = content.replace(regex, repl);
      });
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(path.join(__dirname, 'src'));
console.log('Done replacing colors.');
