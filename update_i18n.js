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
  "Toggle Outline": "Toggle Outline"
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
  "Toggle Outline": "Скрыть/показать оглавление"
};

// We will insert these manually since AST manipulation is safer, but regex is easier.
function appendKeys(langBlock, keys) {
  let entries = Object.entries(keys).map(([k,v]) => `      "${k}": "${v}",`).join('\\n');
  return langBlock.replace(/\\s*};/, `,\n${entries}\n    };`);
}

// Actually it's easier to just do it via regex
code = code.replace(/translation: {([\\s\\S]*?)}/, (match, group) => {
  let res = group;
  for (const [k, v] of Object.entries(enKeys)) {
    if (!res.includes(`"${k}":`)) {
      res += `\n      "${k}": "${v}",`;
    }
  }
  return `translation: {${res}}`;
});

// Since there are two translation: {} blocks (en and ru), the replace only does the first one. Let's do it better.
