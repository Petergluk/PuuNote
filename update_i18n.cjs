const fs = require('fs');
let code = fs.readFileSync('src/i18n.ts', 'utf-8');

const enKeys = {
  "Add Sibling": "Add Sibling",
  "Add Child": "Add Child",
  "More actions": "More actions",
  "Split node at cursor": "Split node at cursor",
  "Expand to full screen": "Expand to full screen",
  "Theme settings": "Theme settings",
  "Reset theme tuning": "Reset theme tuning",
  "Copy theme settings": "Copy theme settings",
  "Double click to enter value": "Double click to enter value",
  "Copy Markdown": "Copy Markdown",
  "Export as Markdown": "Export as Markdown",
  "Close Focus Mode": "Close Focus Mode",
  "Export": "Export",
  "Toggle Outline": "Toggle Outline",
  "Plugins": "Plugins"
};

const ruKeys = {
  "Add Sibling": "Добавить карточку ниже",
  "Add Child": "Добавить дочернюю карточку",
  "More actions": "Больше действий",
  "Split node at cursor": "Разделить карточку",
  "Expand to full screen": "Развернуть на весь экран",
  "Theme settings": "Настройки темы",
  "Reset theme tuning": "Сбросить настройки темы",
  "Copy theme settings": "Скопировать настройки темы",
  "Double click to enter value": "Двойной клик: ввести значение",
  "Copy Markdown": "Скопировать Markdown",
  "Export as Markdown": "Экспорт в Markdown",
  "Close Focus Mode": "Закрыть режим фокуса",
  "Export": "Экспорт",
  "Toggle Outline": "Скрыть/показать оглавление",
  "Plugins": "Плагины"
};

// Assuming en is first and ru is second
const parts = code.split('translation: {');

if (parts.length === 3) {
  // First part is up to first translation
  // Second part is en translation inside { ... }
  // Third part is ru translation inside { ... }
  
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
