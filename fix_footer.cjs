const fs = require('fs');
let code = fs.readFileSync('src/components/Footer.tsx', 'utf-8');

code = code.replace(/const mergeTitle = mergeSelection\.ok\s*\n\s*\? \`Merge \$\{mergeSelection\.orderedIds\.length\} selected cards\`\s*\n\s*\: mergeSelection\.reason \|\| "Selected cards cannot be merged\.";/, `const mergeTitle = mergeSelection.ok
    ? t("Merge selected cards").replace("{count}", String(mergeSelection.orderedIds.length))
    : (mergeSelection.reason || t("Cannot merge selected cards"));`);

fs.writeFileSync('src/components/Footer.tsx', code);
