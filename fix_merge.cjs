const fs = require('fs');
let code = fs.readFileSync('src/components/FloatingCardActions.tsx', 'utf-8');

code = code.replace(/title=\{\`Merge \$\{mergeSelection\.orderedIds\.length\} selected cards\`\}/, 'title={t("Merge selected cards").replace("{count}", String(mergeSelection.orderedIds.length))}');
code = code.replace(/aria-label="Merge selected cards"/, 'aria-label={t("Merge selected cards").replace("{count}", "")}');
code = code.replace(/\`Merge \$\{orderedIds\.length\} selected cards\?\`/, 't("Merge selected cards").replace("{count}", String(orderedIds.length)) + "?"');

fs.writeFileSync('src/components/FloatingCardActions.tsx', code);
