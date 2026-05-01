# Аудит проекта PuuNote

**Дата:** 2026-05-01
**Модель:** z-ai/glm-5.1
**Версия:** 0.4 (Local-first нелинейный редактор)

---

## 1. Описание проекта

PuuNote — это local-first текстовый редактор с горизонтальной ветвящейся (древовидной) структурой карточек. Вместо традиционной вертикальной прокрутки пользователь работает с системой колонок, где каждая колонка представляет уровень вложенности, а карточки — узлы дерева. Карточки поддерживают Markdown-разметку, чекбоксы, перетаскивание (drag-and-drop), undo/redo через снэпшоты и несколько режимов отображения (board, timeline).

### Архитектура и технологический стек

- **Frontend:** React 19 + TypeScript 5.8 + Vite 6
- **Стилизация:** TailwindCSS 4 + Motion (Framer Motion)
- **База данных:** Dexie.js 4 (IndexedDB) с миграциями v1→v2
- **Маркдаун:** react-markdown + remark-gfm + rehype-sanitize
- **Поиск:** Fuse.js (fuzzy search)
- **Управление состоянием:** Zustand 5 (subscribeWithSelector middleware)
- **Интернационализация:** i18next + react-i18next (RU/EN)
- **Валидация:** Zod 4
- **Виртуализация:** react-virtuoso (TimelineView)

### Структура кодовой базы

```
src/
├── components/     — UI-компоненты (Card, Header, Footer, CommandPalette, etc.)
├── db/             — Dexie schema, snapshots CRUD
├── domain/         — Бизнес-логика (documentTree, documentService, aiProvider, etc.)
├── hooks/          — React hooks (useFileSystem, useBoardLayout, useAppHotkeys, etc.)
├── plugins/        — Plugin registry (infrastructure only)
├── store/          — Zustand store (slices: document, ui, selection, history)
├── utils/          — Утилиты (tree, markdownParser, schema)
├── i18n/           — Локализация
└── types.ts        — Общие типы
```

### Ключевые подсистемы

1. **Document Tree API** (`documentTree.ts`) — изолированные immutable-методы манипуляции деревом: add/delete/move/merge/split узлов
2. **Document Service** (`documentService.ts`) — CRUD поверх Dexie + полнотекстовый поиск через Fuse.js
3. **Snapshot System** (`snapshots.ts`) — макрос undo через полные снэпшоты дерева в IndexedDB с квотой
4. **Job Runner** (`jobRunner.ts`) — асинхронные задачи с поддержкой отмены и прогресса
5. **Plugin Registry** (`registry.ts`) — система хуков (`onNodeCreated/Updated/Deleted`) и карточных действий (infrastructure only)
6. **AI Foundation** (`aiProvider.ts`, `contextExtraction.ts`, `aiOperations.ts`) — mock-провайдер + контекстная экстракция для LLM
7. **File System** (`useFileSystem.ts`) — инициализация, загрузка и debounced-сохранение файлов
8. **Hotkeys** (`useAppHotkeys.ts`) — клавиатурная навигация, clipboard, undo/redo
9. **Board Layout** (`useBoardLayout.ts`) — вычисление колонок, активного коридора, скроллинг

---

## 2. Удачные решения

### 2.1 Архитектурные

- **Изолированный Document API:** Все операции с деревом проходят через чистые функции в `documentTree.ts`, возвращающие `{ nextNodes, newId }`. Ни одна компонента не мутирует дерево напрямую. Это предотвращает поломку связей parent/children и нарушение React-состояния.

- **Zustand + subscribeWithSelector + useShallow:** Позволяет подписываться на конкретные части стора без лишних перерисовок. Слайсы (document, ui, selection, history) объединяются в единый store, но логически разделены.

- **Dexie.js для IndexedDB:** Чистый типизированный API поверх IndexedDB с транзакциями и миграциями версий. Схема v2 с тремя таблицами (documents, files, snapshots) — простая и расширяемая.

- **Snapshot-before-AI:** При AI-операциях автоматически создаётся снимок через `pushSnapshot`, что защищает от деструктивных мутаций и позволяет откатить неудачный результат.

- **Debounced autosave + dirty save:** 1-секундный дебаунс записи в IndexedDB + "dirty save" в localStorage при `visibilitychange` — двухуровневая защита от потери данных при закрытии вкладки.

- **Zod-валидация при импорте:** Все импортируемые узлы проходят через `PuuNodeSchema`, что предотвращает инъекцию некорректных данных.

- **rehype-sanitize с кастомной схемой:** Блокирует svg, math, style, script, iframe; ограничивает href/src протоколами http/https/mailto. Эффективная XSS-защита для Markdown-рендера.

### 2.2 UX-решения

- **Focus Path / Active Corridor:** Активный путь подсвечивается, остальные ветки затемняются — минимизация визуального шума при работе с разветвлёнными деревьями.

- **Keyboard-first навигация:** Полноценная навигация стрелками, Tab для создания child, Shift+Enter для sibling, Enter для редактирования. Навигация не требует мыши.

- **Smart Clipboard:** Копирование карточки с потомками (depth-first обход); multi-select работает с выбранными узлами, а не со всеми детьми. Shift+click для range-выделения.

- **Fuzzy Search в Command Palette:** Fuse.js для глобального поиска по содержимому карточек с возможностью перехода к результату.

- **Drag-and-drop с визуальной обратной связью:** Drop zones (before/after/inside) с цветовой индикацией при перетаскивании.

- **Auto-size textarea:** Автоматическое изменение высоты при вводе с плавающей тулбар-кнопкой (checkbox toggle).

- **Два режима просмотра:** Board (горизонтальные колонки) + Timeline (линейный depth-first обход с виртуализацией через react-virtuoso).

### 2.3 Инженерные

- **Чистые функции в documentTree:** Все операции — чистые функции, принимающие и возвращающие immutable массивы. Легко тестировать и рассуждать о поведении.

- **Job Runner с cancellation:** Универсальный механизм для асинхронных задач (AI-операции, импорт/экспорт) с progress callbacks и AbortSignal-подобной отменой.

- **Context Extraction с бюджетом:** `contextExtraction.ts` строит контекст для LLM с configurable budget и truncate — не отправляет всё дерево, а выбирает релевантное.

- **i18n с самого начала:** Русская и английская локализация заложена в архитектуру, а не прикручена потом.

---

## 3. Проблемы и рекомендации

### 3.1 Критические (High Priority)

#### Проблема 3.1.1: Race condition при переключении файлов

**Файл:** `useFileSystem.ts:285-334` (`switchFile`)

```typescript
await flushPendingSave();
// ... load new nodes ...
isHydratingFile = true;
useAppStore.getState().setNodesRaw(newNodes);
```

**Проблема:** `isHydratingFile` — модульная mutable переменная уровня модуля. Если пользователь быстро переключает файлы, могут возникнуть race conditions между load и save. Нет механизма отмены предыдущей операции. Параллельный `flushPendingSave` может записать данные уже неактивного файла.

**Рекомендация:** Заменить на `AbortController` или Promise-based queue:
```typescript
let switchController: AbortController | null = null;

async function switchFile(fileId: string) {
  switchController?.abort();
  switchController = new AbortController();
  const signal = switchController.signal;
  
  await flushPendingSave();
  if (signal.aborted) return;
  
  const newNodes = await db.documents.where('fileId').equals(fileId).toArray();
  if (signal.aborted) return;
  
  isHydratingFile = true;
  useAppStore.getState().setNodesRaw(newNodes);
}
```

---

#### Проблема 3.1.2: Module-level mutable `pendingSave` — side-effect pattern

**Файл:** `useFileSystem.ts:9-13`

```typescript
const pendingSave: { fileId: string | null; nodes: PuuNode[] | null; timer: ReturnType<typeof setTimeout> | null } = {
  fileId: null,
  nodes: null,
  timer: null,
};
```

**Проблема:** Мутируемый объект на уровне модуля хранит состояние сохранения. При hot-reload в development это состояние может рассинхронизироваться. При множественных экземплярах hook'а (невероятно, но возможно) — data race.

**Рекомендация:** Вынести в Zustand slice или в useRef внутри hook'а. Для singleton-паттерна — использовать класс `FileManager` с методами `save/load/switch`.

---

#### Проблема 3.1.3: Undo/Redo — полные снэпшоты массива узлов

**Файл:** `historySlice.ts`

```typescript
past: PuuNode[][];
future: PuuNode[][];
```

**Проблема:** Каждый шаг undo сохраняет **полный клон** массива всех узлов. При документе из 1000+ узлов и 50 шагах истории это 50×1000×sizeof(PuuNode) в памяти. Нет сжатия, нет diff-based подхода. `maxHistorySize = 50` указан в `appStoreTypes.ts`, но реальная проверка лимита в `historySlice.ts` — через `past.length > MAX_UNDO_STACK_SIZE` с `past.shift()`. Проблема в том, что каждый элемент `past` — полный массив узлов, а не дельта.

**Рекомендация:** Два варианта:
1. **Structural sharing:** Хранить только изменённые узлы (diff/patch), а не полные клоны.
2. **Command pattern:** Вместо снэпшотов хранить обратные операции (undo = выполнить обратное действие).

Вариант 2 сложнее, но экономичнее. Вариант 1 проще:
```typescript
interface HistoryEntry {
  changedNodes: Map<string, { before: PuuNode | null; after: PuuNode | null }>;
  // null = node was created/deleted
}
```

---

### 3.2 Средней важности (Medium Priority)

#### Проблема 3.2.1: `buildTreeIndex` на каждый shift-click

**Файл:** `selectionSlice.ts` — `selectRange`

```typescript
selectRange: (endNodeId) => {
  const { nodes, selectedIds } = get();
  const index = buildTreeIndex(nodes); // O(n) на каждый клик
  // ...
}
```

**Проблема:** `buildTreeIndex` создаёт `nodeMap` и `childrenMap` заново на каждый shift-click. Для документа из 1000+ узлов это заметная задержка.

**Рекомендация:** Кешировать `TreeIndex` в store (пересчитывать при `setNodes`) или использовать `useMemo` на уровне компонента.

---

#### Проблема 3.2.2: `experimentalDecorators` в tsconfig без использования

**Файл:** `tsconfig.json`

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "useDefineForClassFields": false
  }
}
```

**Проблема:** Ни один декоратор в кодовой базе не используется. `useDefineForClassFields: false` тоже не нужен — это настройки для legacy class-based кода, а проект на функциональном React.

**Рекомендация:** Удалить оба флага. Если в будущем понадобятся декораторы — добавить обратно.

---

#### Проблема 3.2.3: Дублирование кода в documentSlice — паттерн applyAndTrack

**Файл:** `documentSlice.ts` — повторяется 8+ раз:

```typescript
let newIdValue: string | null = null;
get().setNodes((prev) => {
  const { nextNodes, newId } = documentApi.XXX(prev, ...);
  newIdValue = newId ?? null;
  return nextNodes;
});
```

**Рекомендация:** Вынести в utility:
```typescript
function applyTreeOp(
  op: (nodes: PuuNode[]) => { nextNodes: PuuNode[]; newId?: string }
): string | null {
  let newId: string | null = null;
  useAppStore.getState().setNodes((prev) => {
    const result = op(prev);
    newId = result.newId ?? null;
    return result.nextNodes;
  });
  return newId;
}
```

---

#### Проблема 3.2.4: Хрупкая эвристика парсинга Markdown

**Файл:** `markdownParser.ts:198-205`

```typescript
const isPuuNoteFormat = mdText.trimStart().startsWith(PUUNOTE_FORMAT_MARKER);
if (isPuuNoteFormat) {
  return parsePuuNoteFormat(mdText);
} else {
  return parseMindMapFormat(mdText);
}
```

**Проблема:** Если обычный Markdown начинается с `---` (horizontal rule), он парсится как PuuNote-формат. Эвристика по первому символу хрупка.

**Рекомендация:** Проверять более строгий паттерн: PuuNote-формат должен содержать `type: puunote-export` в header-блоке YAML или второй `---` в первых 5 строках.

---

#### Проблема 3.2.5: Space как hotkey для FloatingCardActions

**Файл:** `useAppHotkeys.ts:392-397`

```typescript
if (e.key === " ") {
  // Space toggles FloatingCardActions
```

**Проблема:** Space в редактируемой карточке — это пробел. Есть guard `if (editingId)`, но при навигации без редактирования Space неинтуитивен для toggle действий — это не стандартный паттерн.

**Рекомендация:** Переназначить на `.` или `f` (vim-like). Или добавить в настройки хоткеев.

---

#### Проблема 3.2.6: Mixed UI state в одном слайсе

**Файл:** `uiSlice.ts`

**Проблема:** `theme`, `colWidth`, `inactiveBranchesMode`, `focusModeScope`, `editorMode`, `editorEnterMode`, `pasteSplitMode` — всё в одном слайсе. При изменении `theme` перерисовываются все подписчики `uiSlice`, включая те, кто слушает только `colWidth`.

**Рекомендация:** Разделить на `settingsSlice` (theme, editorMode, editorEnterMode, pasteSplitMode) и `uiStateSlice` (colWidth, focusModeScope, inactiveBranchesMode). Или использовать более гранулярные селекторы с `useShallow`.

---

#### Проблема 3.2.7: CommandPalette пересоздаёт search index при каждом открытии

**Файл:** `CommandPalette.tsx`

```typescript
useEffect(() => {
  const index = DocumentService.buildSearchIndex(nodes);
  setSearchIndex(index);
}, [nodes]);
```

**Проблема:** `buildSearchIndex` вызывается при каждом изменении `nodes`, а не только при открытии палитры. Если документ часто редактируется, Fuse.js index перестраивается непрерывно.

**Рекомендация:** Строить index лениво — только при открытии CommandPalette. Или кешировать с debounce.

---

### 3.3 Низкой важности (Low Priority)

#### Проблема 3.3.1: Мутируемые Ref в useActivePathScroll

**Файл:** `useBoardLayout.ts:123-159`

```typescript
const initializedCols = useRef<Set<number>>(new Set());
// ...
colRefs.current = colRefs.current.slice(0, columnsLength);
```

**Проблема:** Мутация `.current` в useEffect — антипаттерн React, может привести к рассинхронизации при конкурентных рендерах.

**Рекомендация:** Использовать `useState` или `useReducer` вместо мутации refs.

---

#### Проблема 3.3.2: Clipboard cache без очистки

**Файл:** `useAppHotkeys.ts:102-130`

```typescript
let lastCopiedCards: {...} | null = null;
const CLIPBOARD_CACHE_MAX_AGE_MS = 2 * 60 * 1000;
```

**Проблема:** Module-level cache с TTL 2 минуты, но нет LRU-лимита на размер. При копировании больших поддеревьев — может занять значительную память.

**Рекомендация:** Добавить лимит на количество скопированных узлов или размер данных.

---

#### Проблема 3.3.3: Missing ErrorBoundary для не-Card компонентов

**Файл:** `App.tsx:195-205`

```typescript
{colNodes.map((node) => (
  <ErrorBoundary key={node.id}>
    <Card ... />
  </ErrorBoundary>
))}
```

**Проблема:** ErrorBoundary только для Card, но не для CommandPalette, SettingsPanel, FloatingCardActions, JobPanel, FullScreenModal. Ошибка в любом из них крашит всё приложение.

**Рекомендация:** Обернуть каждый крупный UI-блок в ErrorBoundary.

---

#### Проблема 3.3.4: 4 fullscreen event listeners — дублирование

**Файл:** `App.tsx:68-86`

```typescript
useEffect(() => {
  const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
  document.addEventListener('fullscreenchange', handleChange);
  document.addEventListener('webkitfullscreenchange', handleChange);
  document.addEventListener('mozfullscreenchange', handleChange);
  document.addEventListener('MSFullscreenchange', handleChange);
  // ...
}, []);
```

**Проблема:** 4 listener'а для cross-browser fullscreen. В 2026 году `fullscreenchange` поддерживается всеми основными браузерами.

**Рекомендация:** Оставить только стандартный `fullscreenchange`. Prefix-варианты — legacy.

---

#### Проблема 3.3.5: `db.ts` миграция v1→v2 без upgrade handler

**Файл:** `db.ts:31-39`

```typescript
this.version(2).stores({
  documents: '++id, fileId, parentId',
  files: '++id',
  snapshots: '++id, fileId, createdAt',
});
```

**Проблема:** Если у пользователя была v1 с другой структурой таблиц, миграция может не отработать корректно — нет `upgrade()` callback.

**Рекомендация:** Добавить явный `upgrade()` handler для v2, даже если он просто очищает данные.

---

#### Проблема 3.3.6: `orderKeyFor` — сложная логика без документации

**Файл:** `documentTree.ts:177-192`

**Проблема:** Логика вычисления `orderKey` (лексикографический порядок для sibling positioning) сложна и не документирована. Использует midpoint arithmetic на строках, что при глубокой вложенности может упереться в точность.

**Рекомендация:** Добавить ADR (Architecture Decision Record) с объяснением выбора fractional indexing и его ограничений.

---

### 3.4 Структурные и архитектурные

#### Проблема 3.4.1: AI-слой mock-only

**Файл:** `aiProvider.ts:67-96`

**Проблема:** Только `mockAiProvider` реализован. Нет:
- Хранения API keys (encrypted)
- Rate limiting
- Retry logic с exponential backoff
- Streaming ответов (SSE)
- Cost tracking / token counting
- Множественных провайдеров (OpenAI, Anthropic, Ollama, etc.)

**Рекомендация:** См. раздел 6 — предлагаемая архитектура AI Plugin API.

---

#### Проблема 3.4.2: Plugin Registry — infrastructure without implementation

**Файл:** `plugins/registry.ts`

**Проблема:** Есть `PluginRegistryClass` с `emitHook`, `registerCardAction`, но:
- Нет механизма загрузки внешних плагинов
- Нет sandbox для изоляции
- Нет manifest validation
- Нет lifecycle management (enable/disable/uninstall)
- Нет permission model
- `emitHook` вызывается, но ни один плагин не зарегистрирован

**Рекомендация:** Либо реализовать минимальный плагин (например, "word count" или "summarize selection"), чтобы валидировать архитектуру, либо задокументировать как ADR с roadmap.

---

#### Проблема 3.4.3: Business logic в компонентах

**Файл:** `Card.tsx` — содержит drag-drop логику, drop zone вычисления, paste handling

**Проблема:** Карточка — один из самых больших компонентов (~300+ строк). DnD-логика, paste-обработка и UI-рендер смешаны.

**Рекомендация:** Вынести DnD в `useDragAndDrop` hook, paste — в `useCardPaste`. Карточка должна быть "глупой" — только рендер.

---

#### Проблема 3.4.4: Нет graceful degradation для IndexedDB

**Проблема:** Если IndexedDB недоступен (Private Browsing в Safari, заполненная квота, corruption), приложение не работает. Нет fallback на in-memory или localStorage-only режим.

**Рекомендация:** Добавить try-catch вокруг Dexie operations с fallback на in-memory store + предупреждение пользователю.

---

### 3.5 Потенциальные уязвимости

#### Проблема 3.5.1: XSS через Markdown links

**Файл:** `SafeMarkdown.tsx` — `rehype-sanitize` разрешает `http`, `https`, `mailto`

**Проблема:** Фишинговые ссылки возможны. Пользователь может вставить `[кликни](https://evil.com)` — санктизация пропустит.

**Рекомендация:** Добавить `rel="noopener noreferrer ugc"` на все внешние ссылки + опциональное предупреждение при клике на домен, не входящий в whitelist.

---

#### Проблема 3.5.2: `documentExport.ts` — импорт без ограничения размера

**Проблема:** Нет лимита на размер импортируемого JSON/Markdown файла. Злонамеренный или повреждённый файл может создать десятки тысяч узлов и забить IndexedDB.

**Рекомендация:** Добавить `MAX_IMPORT_SIZE` (например, 5 MB) и `MAX_IMPORT_NODES` (например, 10000).

---

### 3.6 Code smell и технический долг

| Файл | Проблема | Тип |
|------|----------|-----|
| `useFileSystem.ts:9-13` | Global mutable `pendingSave` | Tech debt |
| `useFileSystem.ts:285-334` | `isHydratingFile` module-level flag | Tech debt |
| `useAppHotkeys.ts:25-64` | Complex inline clone function (~40 строк) | Complexity |
| `documentTree.ts:177-192` | `orderKeyFor` — сложная логика без ADR | Complexity |
| `markdownParser.ts:450-465` | Stack-based parsing с побочными эффектами | Complexity |
| `db.ts:31-39` | Миграция v1→v2 без upgrade handler | Risk |
| `jobRunner.ts:49-51` | `setTimeout` для auto-remove — magic timing | Code smell |
| `App.tsx:68-86` | 4 fullscreen event listeners — дублирование | Code smell |
| `tsconfig.json` | `experimentalDecorators` + `useDefineForClassFields: false` без нужды | Config drift |
| `Card.tsx` | 300+ строк с DnD + paste + render | God component |

---

## 4. UI/UX ошибки и недочёты

### 4.1 Визуальные проблемы

1. **Нет loading states для async операций:**
   - Импорт файла (`App.tsx:121-153`) — нет skeleton/spinner
   - Command Palette search — нет loading indicator
   - Timeline load — только fallback text

2. **Нет empty states:**
   - Пустой документ — только "+ Add Fragment"
   - Command Palette без результатов — нет "Ничего не найдено"
   - Job Panel без задач — нет "Нет активных задач"

3. **Accessibility issues:**
   - FloatingCardActions — нет keyboard navigation (только mouse hover)
   - Нет ARIA для drag-and-drop (только визуальные индикаторы)
   - Focus trap в CommandPalette работает, но нет skip-link
   - Нет `aria-live` для уведомлений об операциях (undo, delete, etc.)

4. **Inconsistent UX:**
   - Escape в editing mode сохраняет (хорошо), но нет визуального подтверждения при незавершённых действиях
   - Undo/Redo не имеют визуальной индикации (количество доступных шагов)
   - Split node при пустой карточке создаёт две пустые — неинтуитивно

### 4.2 Глюки и edge cases

1. **Drag-drop на того же родителя:** `Card.tsx:168` проверяет `sourceId !== node.id`, но не обрабатывает drop на того же parent в ту же позицию — создаётся unnecessary reorder.

2. **Split node пустой карточки:** `documentTree.ts:236-267` — при split пустой карточки создаётся две пустые. Должно быть: либо запретить split, либо не создавать пустой sibling.

3. **Merge edge case:** При merge удаляются все descendants source-узла, даже если они содержат ценную информацию. Нет предупреждения.

4. **Scroll sync:** При быстрой навигации scroll "догоняет" с задержкой (`useBoardLayout.ts:162-234` — double RAF). Заметно на больших документах.

5. **Undo после AI-операции:** Undo возвращает к снэпшоту перед AI, но пользователь может не понимать, что все промежуточные изменения тоже откатятся.

---

## 5. Итоговый чеклист проблем

### Критические (исправить до production)
- [ ] Race condition при переключении файлов — `AbortController` (3.1.1)
- [ ] Module-level mutable `pendingSave` — refactor в класс/slice (3.1.2)
- [ ] Undo/Redo — полные клоны массива узлов — diff или command pattern (3.1.3)

### Средней важности
- [ ] `buildTreeIndex` на каждый shift-click — кеширование (3.2.1)
- [ ] `experimentalDecorators` без использования — удалить (3.2.2)
- [ ] Дублирование `applyAndTrack` в documentSlice — utility (3.2.3)
- [ ] Хрупкая Markdown-эвристика — строгий паттерн (3.2.4)
- [ ] Space как hotkey — переназначить (3.2.5)
- [ ] Mixed UI state — разделить слайсы (3.2.6)
- [ ] Search index пересоздаётся постоянно — lazy build (3.2.7)

### Низкой важности
- [ ] Мутируемые Ref — useState/useReducer (3.3.1)
- [ ] Clipboard cache без лимита размера (3.3.2)
- [ ] Missing ErrorBoundary для CommandPalette/Settings/JobPanel (3.3.3)
- [ ] 4 fullscreen listeners → 1 стандартный (3.3.4)
- [ ] Dexie migration без upgrade handler (3.3.5)
- [ ] `orderKeyFor` без ADR (3.3.6)

### Структурные
- [ ] AI-слой mock-only — реализация провайдеров (3.4.1)
- [ ] Plugin API не реализован — валидировать архитектуру минимальным плагином (3.4.2)
- [ ] Business logic в Card.tsx — вынести hooks (3.4.3)
- [ ] Нет graceful degradation для IndexedDB (3.4.4)

### Безопасность
- [ ] `rel="noopener noreferrer ugc"` на внешние ссылки (3.5.1)
- [ ] Лимит размера при импорте (3.5.2)

### UI/UX
- [ ] Loading states для async операций
- [ ] Empty states (Command Palette, Job Panel)
- [ ] Accessibility: keyboard navigation для FloatingCardActions
- [ ] ARIA для drag-and-drop
- [ ] `aria-live` для уведомлений
- [ ] Edge cases: drag-drop no-op, split empty, merge confirmation

---

## 6. Видение развития: API для AI-плагинов

### 6.1 Предпосылки

Текущее состояние AI-слоя — **foundation** (как заявлено в README). Для production нужно:
1. Реальные провайдеры (OpenAI, Anthropic, Ollama для local)
2. Управление API keys (encrypted storage)
3. Streaming ответов (SSE/WebSocket)
4. Rate limiting + retry
5. Plugin API для интеграции сторонних AI-инструментов

### 6.2 Предлагаемая архитектура

#### 6.2.1 Слои абстракции

```
┌─────────────────────────────────────────────┐
│  Plugin Manager UI                          │  — Пользовательский интерфейс
├─────────────────────────────────────────────┤
│  Plugin SDK (public API)                    │  — API для разработчиков плагинов
├─────────────────────────────────────────────┤
│  Plugin Runtime (sandbox + lifecycle)       │  — Изоляция и управление жизненным циклом
├─────────────────────────────────────────────┤
│  Provider Interface (AI backends)           │  — Абстракция над AI-сервисами
├─────────────────────────────────────────────┤
│  Credential Store (encrypted)               │  — Безопасное хранение ключей
└─────────────────────────────────────────────┘
```

#### 6.2.2 Provider Interface

```typescript
interface AiProvider {
  id: string;
  name: string;
  type: 'cloud' | 'local';
  
  // Core
  complete(req: CompletionRequest): Promise<CompletionResponse>;
  stream(req: CompletionRequest): AsyncIterable<CompletionChunk>;
  embed(text: string): Promise<number[]>;
  
  // Admin
  validateKey(): Promise<boolean>;
  estimateTokens(text: string): number;
  getModels(): ModelInfo[];
  
  // Config
  getConfigSchema(): ZodSchema;
}

interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface CompletionResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
  model: string;
}

interface CompletionChunk {
  delta: string;
  done: boolean;
}
```

#### 6.2.3 Credential Store

```typescript
interface CredentialStore {
  // Storage — encrypted in IndexedDB, never localStorage
  save(providerId: string, encryptedKey: string): Promise<void>;
  load(providerId: string): Promise<string | null>;
  delete(providerId: string): Promise<void>;
  
  // Derive encryption key from user password or device fingerprint
  getEncryptionKey(): Promise<CryptoKey>;
}
```

**Критическое:** API keys **никогда** не должны храниться в localStorage в plaintext. Использовать Web Crypto API для encryption at rest.

#### 6.2.4 Plugin Manifest Schema

```typescript
interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  
  // Permissions
  permissions: Permission[];
  
  // Entry points
  entry?: string;           // URL или inline JS
  cardActions?: CardActionDef[];
  hooks?: HookDef[];
  
  // AI integration
  aiProvider?: AiProviderDef;
}

type Permission =
  | { type: 'read_document' }
  | { type: 'write_document' }
  | { type: 'network'; allowedDomains?: string[] }
  | { type: 'storage'; maxSize: number }
  | { type: 'ai_provider'; providers: string[] }
  | { type: 'clipboard' };

interface CardActionDef {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  condition?: 'always' | 'editing' | 'viewing';
}

interface HookDef {
  event: 'onNodeCreated' | 'onNodeUpdated' | 'onNodeDeleted';
  handler: string;  // function name in entry
}
```

#### 6.2.5 Plugin SDK (Public API)

```typescript
interface PluginAPI {
  // Document access (read-only unless permission granted)
  document: {
    getNodes(): PuuNode[];
    getNode(id: string): PuuNode | undefined;
    getActiveNode(): PuuNode | null;
    getSelectedNodes(): PuuNode[];
    getAncestors(nodeId: string): PuuNode[];
    getChildren(nodeId: string): PuuNode[];
    
    // Write (requires 'write_document' permission)
    updateNode(id: string, content: string): void;
    addChild(parentId: string, content: string): PuuNode;
    deleteNode(id: string): void;
  };
  
  // AI (requires 'ai_provider' permission)
  ai: {
    complete(prompt: string, options?: CompletionOptions): Promise<string>;
    stream(prompt: string, options?: CompletionOptions): AsyncIterable<string>;
    getContextForNode(nodeId: string, budget?: number): string;
  };
  
  // UI
  ui: {
    showNotification(message: string, type: 'info' | 'warning' | 'error'): void;
    registerAction(action: CardAction): void;
    unregisterAction(actionId: string): void;
  };
  
  // Storage (scoped per plugin, requires 'storage' permission)
  storage: {
    get<T>(key: string): T | null;
    set(key: string, value: unknown): void;
    delete(key: string): void;
  };
  
  // Events
  events: {
    on(event: string, handler: Function): void;
    off(event: string, handler: Function): void;
    emit(event: string, data: unknown): void;
  };
}
```

#### 6.2.6 Plugin Runtime (Sandbox)

```typescript
class PluginRuntime {
  private sandboxes: Map<string, SandboxInstance> = new Map();
  
  async loadPlugin(manifest: PluginManifest, bundle: string): Promise<PluginInstance> {
    // 1. Validate manifest against PluginManifestSchema
    // 2. Check permissions
    // 3. Create sandbox (Web Worker или iframe sandbox)
    // 4. Inject PluginAPI (proxied, permission-checked)
    // 5. Execute entry point
    // 6. Register hooks and cardActions
  }
  
  async enable(pluginId: string): Promise<void>;
  async disable(pluginId: string): Promise<void>;
  async unload(pluginId: string): Promise<void>;
  
  // Resource limits
  private timeouts: Map<string, number> = new Map();  // max execution time
  private memoryLimits: Map<string, number> = new Map();  // max memory
  private networkLimits: Map<string, string[]> = new Map();  // allowed domains
}
```

**Реализация sandbox:** Web Workers — предпочтительный вариант:
- Изоляция основного потока
- Нет доступа к DOM (плагин общается через PluginAPI)
- Можно ограничить через `worker.options`
- Передача данных через `postMessage` (structured clone)

Альтернатива: iframe sandbox с `sandbox="allow-scripts"` — проще, но менее производительно.

#### 6.2.7 Безопасность

1. **Credential Store:** Web Crypto API (AES-GCM) для шифрования API keys. Encryption key = PBKDF2 от device fingerprint или пользовательского пароля.

2. **Sandbox isolation:** Web Workers не имеют доступа к DOM, IndexedDB (напрямую), localStorage. Вся коммуникация через Proxy-based PluginAPI.

3. **Permission enforcement:** Каждый вызов PluginAPI проверяет permissions из manifest'а. Network requests — через прокси с domain whitelist.

4. **Rate limiting:** Встроенный rate limiter для AI-запросов (per-plugin, per-provider).

5. **Audit logging:** Все plugin actions логируются (в памяти, ротация 1000 записей).

### 6.3 Roadmap реализации

| Этап | Задачи | Срок | Приоритет |
|------|--------|------|-----------|
| **Phase 1: Provider abstraction** | Вынести mockAiProvider → интерфейс; реализовать OpenAI provider; CredentialStore | 2 недели | High |
| **Phase 2: Streaming** | SSE streaming для AI-ответов; progressive render в карточке; cancel support | 1 неделя | High |
| **Phase 3: Plugin manifest** | Zod-схема manifest'а; валидация; хранение в IndexedDB | 1 неделя | High |
| **Phase 4: Plugin SDK** | PluginAPI interface; document/ai/ui/storage modules; proxy layer | 2 недели | High |
| **Phase 5: Plugin Runtime** | Web Worker sandbox; lifecycle management; permission enforcement | 2 недели | Medium |
| **Phase 6: Plugin Manager UI** | Settings panel: install/uninstall/enable/disable; permission review; key management | 1 неделя | Medium |
| **Phase 7: Built-in plugins** | "Summarize selection", "Expand card", "Translate", "Word count" | 1 неделя | Medium |
| **Phase 8: Local AI** | Ollama provider; model management; GPU detection | 2 недели | Low |
| **Phase 9: Community** | Plugin marketplace (if applicable); sharing format; documentation | — | Low |

### 6.4 Пример: Phase 1 — OpenAI Provider

```typescript
// src/ai/providers/openai.ts
export class OpenAIProvider implements AiProvider {
  id = 'openai';
  name = 'OpenAI';
  type = 'cloud' as const;
  
  private apiKey: string;
  private baseUrl = 'https://api.openai.com/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model ?? 'gpt-4o-mini',
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
      }),
      signal: req.signal,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new AiProviderError(
        error.error?.message ?? `OpenAI API error: ${response.status}`,
        response.status,
        error.error?.type
      );
    }
    
    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
      model: data.model,
    };
  }
  
  async *stream(req: CompletionRequest): AsyncIterable<CompletionChunk> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model ?? 'gpt-4o-mini',
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 2048,
        stream: true,
      }),
      signal: req.signal,
    });
    
    if (!response.ok) throw new AiProviderError(/* ... */);
    if (!response.body) throw new Error('No response body');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      
      for (const line of lines) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        const chunk = JSON.parse(line.slice(6));
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) yield { delta, done: false };
      }
    }
    
    yield { delta: '', done: true };
  }
  
  async validateKey(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return true;
    } catch { return false; }
  }
  
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
  
  getModels(): ModelInfo[] {
    return [
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000 },
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000 },
      { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200000 },
    ];
  }
  
  getConfigSchema() {
    return z.object({
      apiKey: z.string().min(1),
      model: z.string().default('gpt-4o-mini'),
      baseUrl: z.string().url().optional(),
    });
  }
}
```

### 6.5 Пример: Минимальный плагин — "Word Count"

```typescript
// plugins/built-in/word-count/manifest.json
{
  "id": "word-count",
  "name": "Word Count",
  "version": "1.0.0",
  "description": "Shows word count for selected card",
  "permissions": [{ "type": "read_document" }],
  "cardActions": [
    {
      "id": "word-count",
      "label": "Word Count",
      "icon": "hash",
      "condition": "always"
    }
  ]
}
```

```typescript
// plugins/built-in/word-count/index.ts
export function activate(api: PluginAPI): void {
  api.ui.registerAction({
    id: 'word-count',
    label: 'Word Count',
    execute: () => {
      const node = api.document.getActiveNode();
      if (!node) return;
      
      const words = node.content.trim().split(/\s+/).filter(Boolean).length;
      const chars = node.content.length;
      
      api.ui.showNotification(
        `${words} words, ${chars} characters`,
        'info'
      );
    },
  });
}

export function deactivate(): void {
  // Cleanup
}
```

---

## 7. Заключение

PuuNote 0.4 — это **продуманный прототип** с качественной архитектурной основой. Ключевые сильные стороны:

- Чистый Document API с immutable операциями
- Snapshot-based undo (простой, но надёжный для текущего масштаба)
- Plugin infrastructure (хоть и не используется — закладка на будущее)
- Zustand slices с гранулярными селекторами
- Local-first + offline-first с debounced autosave + dirty save
- XSS-защита через rehype-sanitize
- Zod-валидация при импорте

**Топ-3 направления для развития:**

1. **Stability:** Race conditions (файлы), undo memory, edge cases (split/merge)
2. **AI Layer:** Реальные провайдеры + credential store + streaming
3. **Plugin System:** Валидация архитектуры через минимальные плагины + SDK

Проект пригоден для персонального использования. Для публичного релиза критичны: исправление race conditions, реализация AI-провайдеров и graceful degradation при отсутствии IndexedDB.

---

*Аудит составлен на основе статического анализа кодовой базы. Рекомендуется runtime review с тестированием edge cases и профилированием памяти при больших документах.*
