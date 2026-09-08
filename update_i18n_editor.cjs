const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf-8');

const enKeys = {
  "Heading 1": "Heading 1",
  "Heading 2": "Heading 2",
  "Heading 3": "Heading 3",
  "Heading 4": "Heading 4",
  "Bold": "Bold",
  "Italic": "Italic",
  "Strikethrough": "Strikethrough",
  "Bullet list": "Bullet list",
  "Ordered list": "Ordered list",
  "Edit link": "Edit link",
  "Remove link": "Remove link",
  "Apply link": "Apply link",
  "Cancel": "Cancel"
};

const ruKeys = {
  "Heading 1": "Заголовок 1",
  "Heading 2": "Заголовок 2",
  "Heading 3": "Заголовок 3",
  "Heading 4": "Заголовок 4",
  "Bold": "Жирный",
  "Italic": "Курсив",
  "Strikethrough": "Зачеркнутый",
  "Bullet list": "Маркированный список",
  "Ordered list": "Нумерованный список",
  "Edit link": "Редактировать ссылку",
  "Remove link": "Удалить ссылку",
  "Apply link": "Применить ссылку",
  "Cancel": "Отмена"
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
