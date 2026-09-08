const fs = require('fs');

let ru = `<!-- puunote-format: 1 -->
# PuuNote: Полное руководство
PuuNote — горизонтальный древовидный редактор для текстов, сценариев, конспектов, идей и сложных структур.
Главная мысль остаётся слева, уточнения и детали уходят вправо. Так можно держать перед глазами общий контекст и не превращать документ в одну длинную простыню.
---
    ## Философия
    Обычный документ заставляет читать и писать сверху вниз. Но мысль часто развивается иначе: появляется уточнение, пример, вопрос, контраргумент, альтернативная версия.
    В PuuNote такие ответвления становятся отдельными карточками.
---
        ### Горизонтальное мышление
        Каждая колонка справа — следующий уровень детализации.
---
            #### Левая колонка
            Содержит крупные темы, разделы или главные тезисы.
---
            #### Правая колонка
            Содержит дочерние мысли: пояснения, шаги, примеры, вопросы, материалы.
---
        ### Фокус без потери контекста
        Когда выбрана карточка, активная ветка подсвечивается, а остальное дерево становится тише (в зависимости от настроек прозрачности).
---
# Оформление и темы
PuuNote позволяет гибко настраивать внешний вид, чтобы создать идеальное пространство для работы.
---
    ## Цветовые темы
    В верхней панели можно переключать базовые темы оформления: от контрастной светлой до уютной темной. Вы можете адаптировать интерфейс под свое освещение и настроение.
---
    ## Настройка веток (Сделай красиво)
    Иконка кисточки в шапке позволяет красить ветки! Вы можете раскрасить каждую ветвь в свой цвет, изменить прозрачность, интенсивность, толщину и яркость рамочек.
    Кнопка «Сделай красиво» автоматически раскрасит все корневые ветки в гармоничные цвета.
    Для доступа к детальным ползункам (градиент, заливка, скругление уголков) нажмите на кисточку. Ползунок скругления уголков управляет формой карточек для всего документа.
---
# Как это работает
---
    ## Режим редактора
    В настройках можно выбрать Markdown-редактор или визуальный редактор (WYSIWYG) с плавающей панелью форматирования.
---
    ## Focus mode (Zen-режим)
    При двойном клике на карточку или нажатии иконки разворота включается режим фокусировки. Он скрывает всё лишнее. В настройках можно выбрать охват: фокусироваться на одной карточке, на всей активной ветке, или на соседях текущего уровня.
    Якорный скроллинг гарантирует, что при выходе из Zen-режима вы останетесь ровно на том же месте.
---
    ## Undo и Redo
    Кнопки в шапке и горячие клавиши Ctrl+Z / Ctrl+Shift+Z отменяют и возвращают изменения.
    Быстрый набор текста группируется, а структурные действия — создание, удаление, перенос, split и merge — остаются отдельными шагами истории.
---
    ## Снимки
    Панель снимков внизу позволяет сохранять промежуточные версии документа и возвращаться к ним.
    Снимки полезны перед крупными правками, импортом, массовой перестановкой карточек или AI-операциями.
---
    ## Запись аудио (Voice)
    В командной панели и меню действий есть кнопки для диктовки. Вы можете записать аудио, и AI автоматически расшифрует его в текст карточки. 
---
    ## Плагины (PuuExtend)
    Меню плагинов (иконка со звёздочками) позволяет применять кастомные действия на базе AI к выбранным карточкам (например, корректировка текста, перевод, улучшение).
    В настройках плагинов можно создавать свои промпты, используя переменные:
    - \`{{card}}\` — текст текущей карточки.
    - \`{{document}}\` — текст всего документа.
    - \`{{level_branch}}\` — карточки-сестры (тот же родитель).
    - \`{{level_all}}\` — все карточки на том же уровне.
    - \`{{branch_parent}}\` — путь от корня до выбранной карточки.
    - \`{{branch_children}}\` — все потомки текущей карточки.
---
    ## Командная палитра
    Поиск в шапке (или комбинация \`Ctrl+K\` / \`Cmd+K\`) открывает быстрые команды и полнотекстовый поиск по содержимому.
---
# Что важно знать
---
    ## Данные хранятся локально
    PuuNote сохраняет документы в IndexedDB вашего браузера. Заметки не отправляются на сервер, если только вы явно не используете AI-плагины, которые обращаются к нейросетям (Gemini API).
---
    ## Известные ограничения
---
        ### Очень большие документы
        На тысячах карточек возможны лаги, особенно при drag and drop и активном фокусе ветки.
---
        ### Visual mode и сложный Markdown
        Visual mode удобен для текста, списков и ссылок, но сложные таблицы и нестандартный Markdown лучше редактировать в Markdown-режиме.
---
# Клавиатурные сокращения
В приложении поддерживается множество горячих клавиш для ускорения работы без мыши.
---
    ## Навигация
    - \`Стрелки вверх/вниз\` — перемещение по соседним карточкам.
    - \`Стрелка вправо\` — переход к первой дочерней карточке.
    - \`Стрелка влево\` — возврат к родительской карточке.
---
    ## Редактирование
    - \`Enter\` — редактировать выбранную карточку.
    - \`Esc\` или \`Ctrl + Enter\` / \`Cmd + Enter\` — завершить редактирование.
    - \`Shift + Enter\` — создать новую соседнюю карточку (снизу).
    - \`Tab\` — создать новую дочернюю карточку (от текущей).
---
    ## Операции с ветками
    - \`Ctrl + C\` / \`Cmd + C\` — копировать активную ветку.
    - \`Ctrl + X\` / \`Cmd + X\` — вырезать активную ветку.
    - \`Ctrl + V\` / \`Cmd + V\` — вставить скопированные карточки.
    - \`Delete\` или \`Backspace\` — удалить активную карточку (и всю её ветку).
---
    ## Отмена и возврат
    - \`Ctrl + Z\` / \`Cmd + Z\` — отменить последнее действие.
    - \`Ctrl + Shift + Z\` / \`Cmd + Shift + Z\` — вернуть отменённое действие.
---
    ## Глобальные функции
    - \`Ctrl + K\` / \`Cmd + K\` — открыть Командную палитру и поиск.
`;

let en = `<!-- puunote-format: 1 -->
# PuuNote: Complete Guide
PuuNote is a horizontal tree-based editor for texts, scripts, notes, ideas, and complex structures.
The main thought stays on the left, while clarifications and details expand to the right. This keeps the overall context visible without turning the document into an endless scrolling page.
---
    ## Philosophy
    A typical document forces you to read and write top-to-bottom. But thoughts often develop differently: clarifications, examples, questions, or alternative versions appear.
    In PuuNote, such branches become separate cards.
---
        ### Horizontal Thinking
        Each column to the right represents the next level of detail.
---
            #### Left Column
            Contains major themes, sections, or main thesis points.
---
            #### Right Column
            Contains child thoughts: explanations, steps, examples, questions, materials.
---
        ### Focus Without Losing Context
        When a card is selected, the active branch is highlighted, and the rest of the tree becomes quieter (fades or dims based on your settings).
---
# Appearance & Themes
PuuNote allows flexible visual customization to create the perfect workspace.
---
    ## Color Themes
    Use the top bar to switch basic color themes: from high-contrast light to cozy dark. Adapt the interface to your lighting and mood.
---
    ## Branch Styling (Make it beautiful)
    The paintbrush icon in the header allows you to colorize branches! You can set custom colors for each branch, tweak transparency, intensity, thickness, and border brightness.
    The "Make it beautiful" button automatically applies harmonious colors to all root branches.
    Click the paintbrush to access advanced sliders (gradient, fill, corner radius). The corner radius slider adjusts the shape of cards across the entire document.
---
# How it works
---
    ## Editor Mode
    In settings, you can choose between a Markdown editor and a Visual editor (WYSIWYG) with a floating toolbar.
---
    ## Focus Mode (Zen)
    Double-click a card or click the expand icon to enter Focus Mode. It hides everything unnecessary. In settings, you can define the scope: focus on a single card, the entire active branch, or siblings of the current level.
    Anchor scrolling ensures you stay exactly where you were when you exit Zen mode.
---
    ## Undo and Redo
    Header buttons and hotkeys (Ctrl+Z / Ctrl+Shift+Z) undo and redo changes.
    Fast typing is batched, while structural actions — create, delete, move, split, and merge — remain separate history steps.
---
    ## Snapshots
    The snapshots panel at the bottom lets you save intermediate document states and restore them.
    They are useful before major edits, imports, massive card moves, or AI operations.
---
    ## Audio Recording (Voice)
    The command palette and card actions menu contain dictation buttons. You can record audio, and AI will automatically transcribe it into the card's text.
---
    ## Plugins (PuuExtend)
    The plugins menu (stars icon) allows you to apply custom AI-based actions to selected cards (e.g., proofreading, translation, improvement).
    In plugin settings, you can create your own prompts using variables:
    - \`{{card}}\` — text of the current card.
    - \`{{document}}\` — entire document text.
    - \`{{level_branch}}\` — sibling cards (same parent).
    - \`{{level_all}}\` — all cards at the same depth level.
    - \`{{branch_parent}}\` — path from the root to the selected card.
    - \`{{branch_children}}\` — all descendants of the current card.
---
    ## Command Palette
    The search in the header (or \`Ctrl+K\` / \`Cmd+K\`) opens quick commands and full-text search.
---
# Important to Know
---
    ## Data is stored locally
    PuuNote saves documents in your browser's IndexedDB. Notes are not sent to any server unless you explicitly use AI plugins that interact with neural networks (Gemini API).
---
    ## Known Limitations
---
        ### Very large documents
        Lags are possible on thousands of cards, especially during drag and drop and active branch focusing.
---
        ### Visual mode and complex Markdown
        Visual mode is convenient for text, lists, and links, but complex tables and non-standard Markdown are better edited in Markdown mode.
---
# Keyboard Shortcuts
The app supports many hotkeys to speed up your workflow without a mouse.
---
    ## Navigation
    - \`Up/Down arrows\` — move between sibling cards.
    - \`Right arrow\` — go to the first child card.
    - \`Left arrow\` — return to the parent card.
---
    ## Editing
    - \`Enter\` — edit the selected card.
    - \`Esc\` or \`Ctrl + Enter\` / \`Cmd + Enter\` — finish editing.
    - \`Shift + Enter\` — create a new sibling card (below).
    - \`Tab\` — create a new child card.
---
    ## Branch Operations
    - \`Ctrl + C\` / \`Cmd + C\` — copy the active branch.
    - \`Ctrl + X\` / \`Cmd + X\` — cut the active branch.
    - \`Ctrl + V\` / \`Cmd + V\` — paste copied cards.
    - \`Delete\` or \`Backspace\` — delete the active card (and its branch).
---
    ## Undo and Redo
    - \`Ctrl + Z\` / \`Cmd + Z\` — undo the last action.
    - \`Ctrl + Shift + Z\` / \`Cmd + Shift + Z\` — redo the undone action.
---
    ## Global Functions
    - \`Ctrl + K\` / \`Cmd + K\` — open the Command Palette and search.
`;

fs.writeFileSync('docs/HELP.ru.md', ru);
fs.writeFileSync('docs/HELP.en.md', en);
