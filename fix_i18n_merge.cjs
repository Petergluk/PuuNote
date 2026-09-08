const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf-8');

const enKeys = {
  "Merge selected cards": "Merge {count} selected cards"
};

const ruKeys = {
  "Merge selected cards": "Объединить {count} выбранных карточек"
};

const parts = code.split('translation: {');

if (parts.length === 3) {
  let enStr = parts[1];
  let ruStr = parts[2];
  
  for (const [k, v] of Object.entries(enKeys)) {
    if (!enStr.includes(`"${k}":`)) enStr = `\n      "${k}": "${v}",` + enStr;
  }
  
  for (const [k, v] of Object.entries(ruKeys)) {
    if (!ruStr.includes(`"${k}":`)) ruStr = `\n      "${k}": "${v}",` + ruStr;
  }
  
  fs.writeFileSync('src/i18n.ts', parts[0] + 'translation: {' + enStr + 'translation: {' + ruStr);
}
