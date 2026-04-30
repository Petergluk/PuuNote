# PuuNote — Полный аудит проекта

> **Дата:** 2026-04-30  
> **Модель:** Antigravity (Google DeepMind)  
> **Версия проекта:** React 19 + Vite 6 + TypeScript + Tailwind CSS 4

---

## 1. Описание проекта

**PuuNote** — локальный (local-first) древовидный Markdown-редактор, работающий полностью в браузере. Данные хранятся в IndexedDB (Dexie.js), состояние управляется через Zustand. Интерфейс представляет документ в виде горизонтальных колонок — каждая колонка = уровень вложенности дерева. Карточки (узлы) поддерживают Markdown-рендеринг, drag & drop, множественный выбор, объединение/разделение и экспорт/импорт.

### Стек технологий

| Слой | Технология |
|---|---|
| UI Framework | React 19 |
| Bundler | Vite 6 |
| State | Zustand (slice-pattern) |
| DB | Dexie.js (IndexedDB) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion (`motion/react`) |
| Markdown | react-markdown + remark-gfm + rehype-sanitize |
| Search | Fuse.js |
| Virtualization | react-virtuoso |
| i18n | react-i18next |
| Validation | Zod |
| Icons | lucide-react |

### Архитектура (упрощённо)

```
App.tsx
├── useFileSystemInit()     — загрузка документов из IndexedDB
├── usePreferencesInit()    — загрузка настроек из localStorage
├── useAppHotkeys()         — клавиатурная навигация
├── Header / Footer         — панели управления
├── FileMenu                — боковая панель документов
├── Board View (columns)    — основной горизонтальный вид
│   └── Card.tsx            — карточка узла
│       └── SafeMarkdown    — рендеринг Markdown
├── TimelineView            — вертикальный (линейный) вид
├── FullScreenModal         — режим фокуса
├── CommandPalette          — палитра команд (⌘K)
├── SettingsPanel           — панель настроек
├── SnapshotPanel           — система снапшотов
├── JobPanel                — отображение фоновых задач
└── ConfirmDialog           — модальное подтверждение
```

### Основные модули домена

| Модуль | Назначение |
|---|---|
| `documentTree.ts` | CRUD-операции над деревом (add, delete, split, merge, move) |
| `documentService.ts` | Персистенция (IndexedDB, миграции, dirty-save) |
| `documentExport.ts` | Экспорт/импорт (Markdown, JSON) |
| `aiProvider.ts` | Реестр AI-провайдеров, mock-провайдер |
| `aiOperations.ts` | Запуск AI-операций через JobRunner |
| `contextExtraction.ts` | Построение текстового контекста для LLM |
| `jobRunner.ts` | Фоновые задачи с прогрессом и отменой |

---

## 2. Удачные решения ✅

1. **Slice-pattern для Zustand** — Чистое разделение на `uiSlice`, `selectionSlice`, `historySlice`, `documentSlice`. Масштабируемо.

2. **Иммутабельный `documentApi`** — Все tree-мутации — чистые функции `(nodes, ...) → nodes`. Легко тестировать, нет побочных эффектов.

3. **Zod-валидация при загрузке** (`schema.ts`) — Защита от битых данных: проверка циклов, глубины, дупликатов, орфанных узлов.

4. **Dirty-save механизм** — При `beforeunload` незаписанные данные сохраняются в `localStorage`, при следующем запуске восстанавливаются.

5. **`rehype-sanitize`** для Markdown — Корректная XSS-защита с фильтрацией `<script>`, `<iframe>`, `<style>`, `<svg>`.

6. **Plugin Registry** — Extensibility-точка с lifecycle-хуками (`onNodeCreated/Updated/Deleted`), card-actions.

7. **AI Pipeline** — Полноценная архитектура: `AiProviderRegistry` → `JobRunner` (с `AbortController`) → `applyGeneratedNodeDrafts`. Готово к подключению реальных LLM.

8. **Active Corridor** — Для больших документов (>250 узлов) рендерятся только колонки вдоль активного пути — отличная оптимизация.

9. **Snapshot система** — Ручные снапшоты с pruning (макс. 25), восстановление, валидация при restore.

10. **Тема и `prefers-color-scheme`** — Автодетект темы ОС + 4 темы (light/dark/blue/brown) с корректным переключением.

---

## 3. Найденные проблемы

### 3.1 🔴 Критические

#### P-00: Утечки памяти в `FloatingCardActions` (портал + event listeners)
**Файл:** `FloatingCardActions.tsx:129-186`  
**Проблема:** `createPortal` создаёт DOM-узел, который не удаляется при размонтировании. `pointermove` / `scroll` listeners добавляются при каждом изменении `activeId` без гарантированного cleanup при быстром переключении карточек → накапливающаяся утечка.  
**Решение:** Вынести portal-контейнер в единый `useRef`, гарантировать `removeEventListener` в return-функции каждого `useEffect`.

#### P-00b: `createNewFile` обновляет UI-state даже при ошибке DB
**Файл:** `useFileSystem.ts:279-287`  
**Проблема:** После `catch` (QuotaExceededError и т.п.) вызывается `useAppStore.setState(...)` — документ появляется в меню без реальных данных в IndexedDB. Перезагрузка удаляет его, но данные потеряны.  
**Решение:** `setState` вызывать только после подтверждённой записи в DB.

#### P-01: Undo/Redo хранит полные копии всего дерева
**Файл:** `historySlice.ts:38`  
**Проблема:** `past: [...state.past, currentNodes].slice(-50)` — каждый шаг истории = полная копия массива всех узлов. При 1000 узлов × 50 шагов = 50 000 объектов в памяти.  
**Решение:** Перейти на structural sharing (Immer patches) или хранить дельты вместо полных снапшотов.

#### P-02: `clearCompleted` в JobStore не удаляет cancelled-задачи
**Файл:** `useJobStore.ts:57-62`  
**Проблема:** Фильтр `job.status !== "completed" && job.status !== "failed"` пропускает `cancelled`. Отменённые задачи навечно остаются в списке.  
**Решение:** Добавить `&& job.status !== "cancelled"`.

#### P-03: `toggleSelection` с Shift пересчитывает полный DFS на каждый клик
**Файл:** `selectionSlice.ts:18-19`  
**Проблема:** `getDepthFirstNodesFromIndex(buildTreeIndex(state.nodes))` — O(n) на каждый Shift+Click. При больших документах это ощутимо.  
**Решение:** Кешировать DFS-порядок в store или memoize.

#### P-04: Данные `updatedAt` хранятся как string в Dexie, но как number в коде
**Файл:** `documentService.ts:36` vs `types.ts:28`  
**Проблема:** `toDocumentMeta` конвертирует `updatedAt` в `String(document.updatedAt)`, а `toDocument` парсит обратно. Это хрупко и может сломать сортировку по индексу Dexie.  
**Решение:** Хранить как `number` в обеих формах (потребует миграцию DB v3).

---

### 3.2 🟠 Серьёзные

#### H1: Race condition в `SnapshotPanel` — snapshot может сохраниться в чужой документ
**Файл:** `SnapshotPanel.tsx:23-34`  
**Проблема:** `fileId` захватывается в closure во время async-операции. При быстром переключении документов snapshot записывается не в тот `documentId`.  
**Решение:** Передавать `fileId` как параметр прямо в момент вызова, а не читать из closure.

#### H2: `useShallow` не используется в Zustand-селекторах `Card`
**Файл:** `Card.tsx:18-39`  
**Проблема:** Компонент подписывается на объекты/массивы без shallow-сравнения — каждое любое изменение стора вызывает ре-рендер всех карточек.  
**Решение:** Обернуть селекторы в `useShallow` из `zustand/shallow`.

#### H3: `normalizeSiblingOrder` мутирует входные объекты
**Файл:** `documentTree.ts:15-22`  
**Проблема:** `sibling.order = index` патчит объекты in-place, нарушая иммутабельность domain-layer. Это противоречит принципу `documentApi` как слоя чистых функций.  
**Решение:** `return siblings.map((s, i) => ({ ...s, order: i }))` и обновить все узлы в массиве.

#### H6: Merge-валидация пересчитывается при каждом рендере `FloatingCardActions`
**Файл:** `FloatingCardActions.tsx:52-57`  
**Проблема:** `canMergeNodes` вызывается без мемоизации, при каждом рендере панели действий — включая hover.  
**Решение:** `useMemo(() => canMergeNodes(...), [nodes, selectedIds])`.

#### H9: Fuse search index пересобирается при каждом открытии `CommandPalette`
**Файл:** `CommandPalette.tsx:71-81`  
**Проблема:** При каждом ⌘K загружаются все файлы из DB и строится новый Fuse-индекс. O(n) rebuild блокирует UI.  
**Решение:** Мемоизировать индекс, инвалидировать только при изменении `nodes` или `documents`.

#### H10: AI-операции не попадают в стек Undo (⌘Z)
**Файл:** `aiOperations.ts`  
**Проблема:** Перед AI берётся `takeDocumentSnapshot`, но в `historySlice` (undo/redo) изменение не пишется. Пользователь не может отменить AI-генерацию через ⌘Z.  
**Решение:** После `setNodes` вызывать стандартный flow через `setNodes` (который уже пишет в `past`), либо явно синхронизировать snapshot с undo-стеком.

#### P-05: `parseJsonExport` не валидирует содержимое через Zod
**Файл:** `documentExport.ts:81-101`  
**Проблема:** `JSON.parse(raw) as Partial<PuuNoteJsonExport>` — кастинг без валидации. Вредоносный JSON может содержать неожиданные типы в `nodes`.  
**Решение:** Прогнать `parsed.nodes` через `PuuNodesArraySchema.parse()`.

#### P-06: `migrateLegacyLocalStorage` уязвим к JSON.parse ошибкам
**Файл:** `documentService.ts:72-73`  
**Проблема:** `JSON.parse(localStorage.getItem("puu_documents") || "[]")` — если данные повреждены, вся инициализация падает. `try/catch` отсутствует на этом уровне.  
**Решение:** Обернуть каждый `JSON.parse` в try/catch с fallback.

#### P-07: Отсутствует лимит на `future` в Undo/Redo
**Файл:** `historySlice.ts:59`  
**Проблема:** `future` массив не ограничен. При множественном undo → redo → undo цикле `future` может неограниченно расти.  
**Решение:** `.slice(0, 50)` аналогично `past`.

#### P-08: Memory leak в `FloatingCardActions`
**Файл:** `FloatingCardActions.tsx:119-127`  
**Проблема:** `pointermove` listener добавляется без проверки состояния монтирования и использует `pointerRef` — при unmount ref невалиден.  
**Решение:** В целом безопасно (passive listener), но стоит добавить cleanup-проверку.

#### P-09: Дублирование prose-классов в 3 компонентах
**Файлы:** `Card.tsx:189`, `FullScreenModal.tsx:125`, `TimelineView.tsx:241`  
**Проблема:** Одни и те же монструозные Tailwind-строки для prose повторяются 3 раза с незначительными различиями. Любое изменение требует правки в 3 местах.  
**Решение:** Вынести в общий CSS-класс через `@apply` или компонент-обёртку.

#### P-10: `handleGlobalPaste` не использует `pasteSplitMode`
**Файл:** `useAppHotkeys.ts:29-36`  
**Проблема:** Настройка `pasteSplitMode` (`separator` | `paragraph`) из SettingsPanel полностью игнорируется при paste. Хардкоженный separator `---` / `<!-- puunote-node -->`.  
**Решение:** Читать `state.pasteSplitMode` и разделять по абзацам когда `paragraph`.

---

### 3.3 🟡 Средние

#### M3: Нет loading-состояния при восстановлении снапшота
**Файл:** `SnapshotPanel.tsx`  
**Проблема:** Async-операция restore не блокирует UI — пользователь может кликать дальше.  
**Решение:** Добавить `isRestoring` state, блокировать кнопки на время операции.

#### M5: Export dropdown недоступен с клавиатуры
**Файл:** `Header.tsx:204-240`  
**Проблема:** Dropdown экспорта не имеет `role="menu"` и не реагирует на стрелки/Enter.  
**Решение:** Добавить keyboard navigation через `onKeyDown`.

#### M9: `FloatingCardActions` недоступны с клавиатуры
**Файл:** `FloatingCardActions.tsx`  
**Проблема:** Панель действий появляется только при hover — нет keyboard trigger.  
**Решение:** Добавить хоткей (напр. `Space` на активной карточке) для открытия панели.

#### M10: Merge не запрашивает подтверждение
**Файл:** `FloatingCardActions.tsx:287-293`  
**Проблема:** Деструктивная операция объединения карточек выполняется без confirm-диалога.  
**Решение:** Вызывать `openConfirm` перед `mergeNodes`.

#### M11: Нет визуального счётчика при multi-select
**Файл:** `Footer.tsx`  
**Проблема:** Footer показывает общее кол-во слов/карточек, но не «выбрано N карточек» при множественном выборе.  
**Решение:** Показывать `selectedIds.length` карточек в Footer при `selectedIds.length > 1`.

#### C5: Пустой `catch` в `utils/id.ts` вызывает lint-ошибку
**Файл:** `utils/id.ts`  
**Проблема:** Пустой блок `catch {}` нарушает правило `no-empty` и маскирует ошибки.  
**Решение:** Добавить комментарий `// crypto.randomUUID not available` или логировать в dev-режиме.

#### P2: Timeline Virtuoso подключён к window scroll вместо контейнера
**Файл:** `TimelineView.tsx`  
**Проблема:** Виртуализация работает некорректно — Virtuoso слушает глобальный window scroll, а не скролл внутри контейнера.  
**Решение:** Передать `scrollerRef` к родительскому контейнеру.

#### P-11: `deleteNode` в `documentTree.ts` использует BFS через `.filter()` в цикле
**Файл:** `documentTree.ts:140-141`  
**Проблема:** `nodes.filter(n => n.parentId === curr)` внутри while-loop — O(n×d) вместо O(n). Для дерева из 10K+ узлов заметно.  
**Решение:** Использовать предварительно построенный `childrenMap` из `buildTreeIndex`.

#### P-12: `computeDescendantIds` использует `queue.shift()` — O(n²)
**Файл:** `tree.ts:66`  
**Проблема:** `Array.shift()` в JS = O(n). При большом дереве BFS через shift деградирует.  
**Решение:** Использовать указатель (`let head = 0; queue[head++]`) или стек (DFS).

#### P-13: `isDescendant` в `moveNodes` — O(d) на каждый вызов без кеша
**Файл:** `documentTree.ts:201-207`  
**Проблема:** Линейный проход вверх по дереву через `nodes.find()` — O(n×d) общая сложность.  
**Решение:** Использовать `buildTreeIndex().nodeMap` для O(1) lookup.

#### P-14: Жёстко зашитый русский текст в `SettingsPanel`
**Файл:** `SettingsPanel.tsx:14-41`  
**Проблема:** `"Затенять"`, `"Скрывать"`, `"Настройки"`, `"Визуально"` — не через i18n. Остальные компоненты используют `useTranslation()`.  
**Решение:** Обернуть все label через `t()`.

#### P-15: `TimelineView` — жёстко зашитый `"Уровень"` (русский)
**Файл:** `TimelineView.tsx:207`  
**Проблема:** `Уровень {n.depth + 1}` — не через i18n. Нарушает паттерн.  
**Решение:** `t("Level") + " " + (n.depth + 1)`.

#### P-16: `getSearchNodes` загружает ВСЕ файлы из DB при открытии палитры
**Файл:** `documentService.ts:208`  
**Проблема:** `db.files.toArray()` достаёт все документы из IndexedDB в память. При 100+ документах это медленно.  
**Решение:** Загружать только текущий документ + недавние; или добавить полнотекстовый индекс.

#### P-17: `wrapSelection` использует жёстко зашитый fallback `"текст"` (русский)
**Файл:** `AutoSizeTextarea.tsx:148`  
**Проблема:** `fallback = "текст"` — не через i18n.  
**Решение:** Передавать через `t("text")` или использовать нейтральный `"text"`.

#### P-18: `addLink` использует жёстко зашитый `"ссылка"` (русский)
**Файл:** `AutoSizeTextarea.tsx:166`  
**Проблема:** Аналогично P-17.  
**Решение:** `t("link")` или `"link"`.

---

### 3.4 🔵 Незначительные / Стиль

#### P-19: `ErrorBoundary` не имеет кнопки восстановления
**Файл:** `ErrorBoundary.tsx:23-28`  
**Проблема:** Fallback UI говорит "try undoing" — но нет кнопки для этого.  
**Решение:** Добавить кнопку "Reload" или "Undo last action".

#### P-20: `downloadTextFile` не вызывает `a.remove()`
**Файл:** `browserDownload.ts:11`  
**Проблема:** Создаётся `<a>` элемент, вызывается `.click()`, URL ревокируется, но элемент остаётся в DOM.  
**Решение:** Добавить `document.body.appendChild(a); ... a.remove();` для кроссбраузерности.

#### P-21: `FloatingCardActions` — `childrenCount` считает только прямых детей
**Файл:** `FloatingCardActions.tsx:261-263`  
**Проблема:** Сообщение `"its ${childrenCount} descendant branches"` — но считаются только прямые дети, не все потомки. Текст вводит в заблуждение.  
**Решение:** Использовать `computeDescendantIds` для точного подсчёта.

#### P-22: `Escape` в `ShortcutsModal` не работает
**Файл:** `ShortcutsModal.tsx`  
**Проблема:** Модалка не имеет обработчика `Escape` (в отличие от `FullScreenModal` и `CommandPalette`).  
**Решение:** Добавить `useEffect` с `keydown` listener.

#### P-23: Тест-покрытие минимально
**Файлы:** только `useBoardLayout.test.ts` (57 строк)  
**Проблема:** Критические модули (`documentTree`, `schema`, `markdownParser`, `contextExtraction`) не имеют тестов.  
**Решение:** Добавить unit-тесты для domain-логики.

#### P-24: `AUTOSIZE_DEBOUNCE_MS = 400` — слишком высокий debounce
**Файл:** `constants.ts:9`  
**Проблема:** 400ms задержка при наборе текста. Пользователь может заметить лаг при быстром вводе.  
**Решение:** Снизить до 150-200ms или использовать `requestIdleCallback`.

#### P-25: `useAppHotkeys` не поддерживает `Delete`/`Backspace` для удаления узла
**Файл:** `useAppHotkeys.ts`  
**Проблема:** Нет горячей клавиши для удаления активного узла без мыши.  
**Решение:** Добавить `Delete` / `Backspace` (с confirm-диалогом).

#### P-26: Отсутствует `aria-label` / `role` на интерактивных элементах
**Файлы:** Все компоненты  
**Проблема:** Кнопки используют только `title`, нет `aria-label`. Screen readers не смогут корректно прочитать интерфейс.  
**Решение:** Добавить `aria-label` к ключевым кнопкам.

#### P-27: `confirmDialog.onConfirm` не обнуляется при закрытии
**Файл:** `uiSlice.ts:22-25`  
**Проблема:** `closeConfirm` ставит `isOpen: false`, но сохраняет ссылку на `onConfirm` callback. Потенциальная утечка closure.  
**Решение:** `set({ confirmDialog: { isOpen: false, message: "", onConfirm: undefined } })`.

---

## 4. Структурные наблюдения

### 4.1 Дублирования
- **Prose-классы**: 3 копии (Card, FullScreenModal, TimelineView) — ~500 символов каждая
- **Сортировка по order**: `(a.order || 0) - (b.order || 0)` повторяется ~15 раз → вынести в `sortByOrder` util
- **Подсчёт детей / siblings**: Паттерн `nodes.filter(n => n.parentId === X)` повторяется ~20 раз → использовать `childrenMap`

### 4.2 Мёртвый код
- `useToggleCheckbox.ts` — файл из 15 строк, можно инлайнить
- `normalizeSiblingOrder` экспортируется из `documentTree.ts`, но нигде не импортируется извне (internal only)
- `BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD` используется в `App.tsx`, но не документирован

### 4.3 Отсутствующие модули
- **Нет E2E тестов** — Cypress/Playwright
- **Нет CI/CD конфигурации** — GitHub Actions, linting
- **Нет `robots.txt` / `sitemap.xml`** для SEO (если будет веб-версия)
- **Нет PWA-манифеста** — для оффлайн-доступа через Service Worker

---

## 5. Безопасность

| # | Проблема | Уровень | Статус |
|---|---|---|---|
| S-01 | XSS через Markdown | 🟢 Закрыто | `rehype-sanitize` настроен корректно |
| S-02 | `JSON.parse` без try/catch в миграции | 🟠 Открыто | P-06 |
| S-03 | API-ключи AI хранятся на клиенте | 🟠 Будущий риск | При подключении реального LLM нужен backend proxy |
| S-04 | Remote images в Markdown (`![](https://...)`) | 🟡 Открыто | Загружают внешние ресурсы — нарушение приватности; добавить `no-referrer` или whitelist |
| S-05 | Нет CSP-заголовков | 🟡 Неприменимо | Локальное приложение, но стоит добавить при деплое |
| S-06 | `crypto.randomUUID` fallback предсказуем | 🟡 Низкий риск | `Math.random()` не криптографически безопасен, но для ID узлов приемлемо |
| S-07 | Нет rate-limit на AI-операции | 🟡 Будущий риск | При подключении реального LLM нужен throttle |
| S-08 | Import файлов без size-limit на UI | 🟢 Закрыто | `MAX_FILE_SIZE_BYTES = 5MB` проверяется в App.tsx |

---

## 6. Производительность

| # | Область | Текущее состояние | Рекомендация |
|---|---|---|---|
| PF-01 | Undo/Redo memory | 50 полных копий дерева | Structural sharing / patches |
| PF-02 | Board view | Не виртуализирован | Добавить `react-virtuoso` для колонок при >500 узлов |
| PF-03 | TreeIndex rebuild | Мемоизирован в App.tsx | ✅ |
| PF-04 | Active Corridor | Включается при >250 узлах | ✅ Отличное решение |
| PF-05 | Timeline Virtuoso | Подключён к window scroll | Передать `scrollerRef` контейнера |
| PF-06 | Fuse search index | Rebuild на каждый ⌘K | Мемоизировать, инвалидировать по `nodes` |
| PF-07 | Debounced save | 1000ms | ✅ Оптимально |
| PF-08 | Search — загрузка DB | Все файлы при каждом поиске | Ленивая загрузка + fulltext index |
| PF-09 | `Array.shift()` в BFS | O(n²) | Pointer-based queue |
| PF-10 | `buildContextForLLM` | String concat в цикле | Использовать `array.join("")` единожды |

---

## 7. UX-проблемы

| # | Проблема | Файл |
|---|---|---|
| UX-1 | `FloatingCardActions` работает только по hover — нет touch-поддержки | `FloatingCardActions.tsx` |
| UX-2 | Режим "Hide" полностью скрывает колонки — пользователи теряют ориентацию | `App.tsx:102-108` |
| UX-3 | Нечёткое различие active vs selected (похожий визуал) | `Card.tsx:59-65` |
| UX-4 | Имена снапшотов нередактируемы — всегда «Manual snapshot» | `SnapshotPanel.tsx` |
| UX-5 | Нет хоткея для Settings (Ctrl+,) | `Header.tsx` |
| UX-6 | Переключение темы только через Command Palette — неочевидно | `Header.tsx:49` |
| UX-7 | ShortcutsModal не закрывается по Escape | `ShortcutsModal.tsx` |
| UX-8 | Нет Delete/Backspace хоткея для удаления узла | `useAppHotkeys.ts` |

---

## 8. Чеклист исправлений (по приоритету)

### 🔴 Фаза 0 — Стабилизация (эта неделя)
- [ ] **P-00** Исправить утечки в `FloatingCardActions` (portal + listeners)
- [ ] **P-00b** `createNewFile`: setState только после успешной записи в DB
- [ ] **P-02** `clearCompleted` — добавить `cancelled` в фильтр
- [ ] **P-07** Добавить `.slice(0, 50)` для `future` в historySlice
- [ ] **P-27** Обнулять `onConfirm` при `closeConfirm`
- [ ] **C5** Убрать пустой `catch {}` в `utils/id.ts`

### 🟠 Фаза 1 — Критические баги (1-2 недели)
- [ ] **H1** Race condition в `SnapshotPanel` — передавать `fileId` параметром
- [ ] **H3** Сделать `normalizeSiblingOrder` чистой функцией
- [ ] **P-04** Унифицировать тип `updatedAt` (string → number, миграция DB v3)
- [ ] **P-00b** Валидировать JSON-импорт через Zod (P-05)
- [ ] **P-06** Защитить `migrateLegacyLocalStorage` от JSON.parse ошибок
- [ ] **P-10** Интегрировать `pasteSplitMode` в `handleGlobalPaste`

### 🟡 Фаза 2 — Производительность (2-4 недели)
- [ ] **H2** Добавить `useShallow` в Zustand-селекторы Card
- [ ] **H6** Мемоизировать `canMergeNodes` в FloatingCardActions
- [ ] **H9** Мемоизировать Fuse search index
- [ ] **P2** Исправить TimelineView Virtuoso scroll wiring
- [ ] **P-01** Оптимизировать Undo/Redo (patches / structural sharing)
- [ ] **P-11,12,13** Оптимизировать tree-операции через `childrenMap`

### 🟢 Фаза 3 — UX и i18n (1 месяц)
- [ ] **H10** AI-операции → Undo через ⌘Z
- [ ] **M3** Loading state при restore снапшота
- [ ] **M5** Keyboard navigation в export dropdown
- [ ] **M9** Keyboard trigger для FloatingCardActions
- [ ] **M10** Confirm перед merge
- [ ] **M11** Счётчик выбранных карточек в Footer
- [ ] **P-09** Вынести prose-классы в общий CSS
- [ ] **P-14,15,17,18** Перевести все хардкод-строки через i18n
- [ ] **UX-3** Улучшить визуал active vs selected
- [ ] **UX-4** Редактируемые имена снапшотов
- [ ] **UX-5** Хоткей Ctrl+, для Settings
- [ ] **UX-6** Кнопка темы в Header
- [ ] **UX-7** Escape для ShortcutsModal
- [ ] **UX-8** Delete/Backspace hotkey
- [ ] **P-19** Кнопка Reload в ErrorBoundary
- [ ] **P-22** Escape для ShortcutsModal
- [ ] **P-24** Снизить AUTOSIZE_DEBOUNCE_MS до 150ms
- [ ] **P-25** Delete/Backspace hotkey
- [ ] **P-26** aria-labels

### ⚙️ Фаза 4 — Инфраструктура
- [ ] Unit-тесты для `documentTree`, `schema`, `markdownParser`, `contextExtraction`
- [ ] CI/CD: GitHub Actions + Vitest + ESLint + TypeScript strict
- [ ] PWA-манифест + Service Worker
- [ ] S-03: Backend proxy для AI API-ключей
- [ ] S-04: `referrerpolicy="no-referrer"` на img в Markdown

---

## 9. Дорожная карта AI Plugin API

### Фаза 1: Hardening (1-2 недели)
- Обернуть `documentApi` в валидацию входных/выходных данных
- Добавить rate-limiting для AI-операций
- Расширить тестовое покрытие domain-модулей

### Фаза 2: Real AI Integration (2-3 недели)
- Реализовать `OpenAiProvider` / `AnthropicProvider` с API-ключом в настройках
- Добавить streaming (SSE) для прогрессивного отображения генерации
- Стандартизировать `metadata.ai` поле для трекинга AI-контента
- Добавить UI для выбора провайдера в SettingsPanel

### Фаза 3: Advanced Features (3-4 недели)
- Multi-operation pipeline (summarize → expand → refine)
- Контекстное окно с приоритизацией (ancestors > siblings > cousins)
- Локальные LLM через WebLLM / Ollama
- Plugin marketplace с sandboxed-выполнением

---

## 10. Итог

**PuuNote — хорошо спроектированный проект** с чистой архитектурой, грамотным разделением ответственности и продуманной системой персистенции. Основные проблемы:

1. **Memory** — Undo/Redo без structural sharing
2. **i18n** — Непоследовательная локализация (часть русский, часть English, часть через i18n)
3. **Дублирование** — Prose-классы и tree-операции
4. **Тесты** — Покрытие ~2% (1 файл из ~40)

Ни одна из найденных проблем не является блокером для текущего использования. Проект готов к подключению реального AI-провайдера при условии выполнения Фазы 1 hardening.
