const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf-8');

const enKeys = {
  "Cancel job": "Cancel job",
  "Restore snapshot": "Restore snapshot"
};

const ruKeys = {
  "Cancel job": "Отменить задачу",
  "Restore snapshot": "Восстановить снимок"
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
  
  // Remove duplicates
  let lines = enStr.split('\n');
  let seenEn = new Set();
  let cleanEn = [];
  for (let i = 0; i < lines.length; i++) {
    let match = lines[i].match(/^\s*"([^"]+)":/);
    if (match) {
      if (seenEn.has(match[1])) continue;
      seenEn.add(match[1]);
    } else {
      let m2 = lines[i].match(/^\s*([^:\s]+):/);
      if (m2) {
        if (seenEn.has(m2[1])) continue;
        seenEn.add(m2[1]);
      }
    }
    cleanEn.push(lines[i]);
  }
  enStr = cleanEn.join('\n');
  
  lines = ruStr.split('\n');
  let seenRu = new Set();
  let cleanRu = [];
  for (let i = 0; i < lines.length; i++) {
    let match = lines[i].match(/^\s*"([^"]+)":/);
    if (match) {
      if (seenRu.has(match[1])) continue;
      seenRu.add(match[1]);
    } else {
      let m2 = lines[i].match(/^\s*([^:\s]+):/);
      if (m2) {
        if (seenRu.has(m2[1])) continue;
        seenRu.add(m2[1]);
      }
    }
    cleanRu.push(lines[i]);
  }
  ruStr = cleanRu.join('\n');
  
  fs.writeFileSync('src/i18n.ts', parts[0] + 'translation: {' + enStr + 'translation: {' + ruStr);
}
