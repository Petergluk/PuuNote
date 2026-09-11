const fs = require('fs');
let content = fs.readFileSync('src/components/Card.tsx', 'utf-8');

// Revert back to original
content = content.replace(
  /"relative w-full shrink-0 pr-4 py-3 cursor-text min-h-\[40px\] flex flex-col",\n            \(isActive \|\| isSelected\) \? "pl-\[13px\]" : "pl-4",/g,
  '"relative w-full shrink-0 px-4 py-3 cursor-text min-h-[40px] flex flex-col",'
);

fs.writeFileSync('src/components/Card.tsx', content);
