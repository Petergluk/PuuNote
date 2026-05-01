# PuuNote — Комплексный Аудит

**Дата:** 2026-05-01  
**Модель:** deepseek-v4-pro  
**Версия проекта:** 0.4

---

## 1. Что это за проект

**PuuNote** — это local-first, нелинейный текстовый редактор с горизонтально-древовидной архитектурой. В отличие от традиционных линейных редакторов (Notion, Obsidian), структура документа здесь растёт не сверху вниз, а слева направо: каждая карточка может иметь дочерние карточки в следующей колонке.

### Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  UI Layer (React 19)                                    │
│  App.tsx → Header, Board (columns), Footer              │
│         → Modals (FullScreen, Timeline, CommandPalette) │
├─────────────────────────────────────────────────────────┤
│  State Layer (Zustand)                                  │
│  useAppStore = UiSlice + SelectionSlice + HistorySlice  │
│              + DocumentSlice                            │
│  useJobStore (background jobs)                          │
├─────────────────────────────────────────────────────────┤
│  Domain Layer                                           │
│  documentService.ts — CRUD + миграции + dirty-save      │
│  documentExport.ts — экспорт/импорт (MD, JSON)          │
│  contextExtraction.ts — извлечение контекста для LLM     │
│  aiOperations.ts — AI-генерация черновиков              │
│  aiProvider.ts — абстракция AI-провайдеров              │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  Dexie.js (IndexedDB): documents, files, snapshots       │
│  localStorage: activeFileId, dirty-save, preferences     │
├─────────────────────────────────────────────────────────┤
│  Plugin System (экспериментальный)                      │
│  PluginRegistry — хуки onNodeCreated/Updated/Deleted    │
│  CardActionHook — кастомные действия на карточках        │
└─────────────────────────────────────────────────────────┘
```

### Как это работает

1. **Документ** = плоский массив `PuuNode[]`, где каждый узел имеет `id`, `parentId`, `order`, `content`
2. **TreeIndex** (`nodeMap` + `childrenMap`) строится на лету в `App.tsx` через `useMemo`
3. **Колонки** (`useColumns`) вычисляются BFS-обходом от корня
4. **Undo/Redo** = стек past/future (макс 50) с глубоким сравнением
5. **Сохранение** = IndexedDB (Dexie) с отложенной записью (1 сек debounce) + dirty-save в localStorage при закрытии вкладки
6. **Клавиатурная навигация** = стрелки + Tab + Enter в хуке `useAppHotkeys`

### Технологический стек

- React 19 + TypeScript (strict mode)
- Vite 6 (code-splitting: 8 чанков)
- Zustand (state management с подписками)
- Dexie.js (IndexedDB wrapper)
- Tailwind CSS 4 (4 темы: light, dark, blue, brown)
- Framer Motion → `motion` (анимации)
- react-markdown + remark-gfm + rehype-sanitize
- Fuse.js (fuzzy search)
- react-virtuoso (виртуализация для Timeline View)
- Zod (валидация данных)
- i18next (RU/EN локализация)
- sonner (toast-уведомления)
- lucide-react (иконки)

---

## 2. Удачные решения 👍

1. **Плоский массив вместо вложенного дерева** — гениально простое решение. Все операции над графом сводятся к фильтрации/маппингу плоского массива. TreeIndex строится O(n) и даёт O(1) доступ к детям любого узла.

2. **Dirty-save в localStorage** — двойная защита от потери данных: основное сохранение в IndexedDB + аварийный слепок в localStorage при `beforeunload`/`pagehide`/`visibilitychange`. Восстановление при следующей загрузке.

3. **documentApi как прослойка** — изолирует мутации графа от Zustand-стейта. Все операции возвращают `{ nextNodes, newId, parentFallback }`, что позволяет единообразно обновлять состояние и историю.

4. **Zod-валидация с repair-логикой** — `validateNodesWithReport` не просто отвергает битые данные, а чинит их: перегенерирует дубликаты ID, отвязывает орфанов, разрывает циклы, обрезает слишком глубокие деревья. Это критично для данных из внешних источников (импорт, clipboard).

5. **Job Runner** — абстракция для долгих операций с прогрессом и отменой. Правильный подход к AI-генерации и другим асинхронным задачам.

6. **Focus Trap** — собственная реализация (88 строк) с правильной обработкой Tab/Shift+Tab и возвратом фокуса при закрытии. Легковеснее, чем тащить библиотеку.

7. **Code Splitting** — продуманное разделение на чанки (react-vendor, storage, validation, i18n, toast, markdown, ui-icons, motion). Ленивая загрузка FullScreenModal, TimelineView, CommandPalette.

8. **NormalizeNodesWithReport** — вторая линия валидации (помимо Zod) с дедупликацией ID и заполнением `order`. Хорошая защита от кривых данных.

9. **Сигнатурный кеш поискового индекса** — `DocumentService.getSearchNodes` не перестраивает индекс, если документы не менялись. Умная оптимизация.

10. **deriveDocumentTitle** — автоизвлечение заголовка из контента первого узла с очисткой markdown-разметки. UX-фича, которая работает незаметно.

---

## 3. Проблемы в коде и возможные решения

### 🔴 Критические

#### 3.1. `documentApi` импортируется но не существует в коде
**Файл:** `src/store/slices/documentSlice.ts`  
**Проблема:** `documentSlice.ts` импортирует и активно использует `documentApi` — объект с методами `updateContent`, `addChild`, `addSibling`, `deleteNode`, `deleteNodesPromoteChildren`, `splitNode`, `mergeNodes`, `moveNode`, `moveNodes`, `canMergeNodes`. Однако файла `documentApi.ts` **нет в проекте**. Поиск по всему коду не обнаружил ни определения, ни экспорта этого объекта. При этом README.md описывает его как публичный API.

**Решение:**
- Создать `src/domain/documentApi.ts` с чистыми функциями для мутации дерева, либо
- Перенести эту логику прямо в `documentSlice.ts` (если она там неявно захардкожена)
- Проверить, не используется ли `documentApi` через какой-то магический импорт или monkey-patching

#### 3.2. `documentSlice.ts` не компилируется без `documentApi`
**Файл:** `src/store/slices/documentSlice.ts:12`  
**Проблема:** Строка `import { documentApi } from "../../domain/documentApi";` — файл не существует. Проект не может быть собран в текущем состоянии.

**Решение:** То же, что 3.1.

### 🟠 Серьёзные

#### 3.3. `useFileSystem.ts` хранит `pendingSave` в module scope
**Файл:** `src/hooks/useFileSystem.ts:15-18`  
**Проблема:** 
```ts
const pendingSave = {
  timer: null,
  fileId: "",
  nodes: [],
};
```
Это module-level переменная. Если на странице будет два экземпляра приложения (например, в тестах или микрофронтендах), они будут делить одно состояние. Также это делает код нечистым и труднотестируемым.

**Решение:** Вынести в Zustand store или в `useRef` внутри хука.

#### 3.4. `useAppHotkeys.ts` содержит бизнес-логику, которая должна быть в domain
**Файл:** `src/hooks/useAppHotkeys.ts` (467 строк!)  
**Проблема:** Хук содержит:
- Логику клонирования поддеревьев (`cloneNodesForPaste`)
- Логику извлечения узлов для копирования (`getClipboardNodes`)
- Парсинг clipboard (JSON, HTML, Markdown)
- Управление кешем clipboard

Это 467 строк в одном файле, где смешаны concerns: clipboard-логика, кеширование, парсинг, и собственно хоткеи.

**Решение:** 
- Вынести `cloneNodesForPaste`, `getClipboardNodes`, `buildClipboardPayload`, `getCachedClipboardJson` в отдельный модуль `src/domain/clipboardOperations.ts`
- `useAppHotkeys` должен остаться только обработчиком событий

#### 3.5. Отсутствие `JobRunner`
**Файл:** `src/domain/aiOperations.ts:7`  
**Проблема:** `aiOperations.ts` импортирует `JobRunner` из `../services/JobRunner`, но этого файла нет в проекте. AI-операции не могут работать.

**Решение:** Создать `src/services/JobRunner.ts` с методами `runJob`, либо вынести логику jobs полностью в `useJobStore`.

#### 3.6. Memory leak в global event listeners
**Файл:** `src/hooks/useAppHotkeys.ts:46-56, 61-65`  
**Проблема:** `useEffect` без зависимостей добавляет обработчики `copy`, `cut`, `paste` на `document`. Хотя cleanup возвращается, если хук будет перемонтирован (strict mode в React 18+), это создаёт потенциальный memory leak — при каждом ремаунте добавляются новые обработчики. Также в strict mode эффект вызывается дважды, и хотя cleanup удаляет первый набор, это неочевидное поведение.

**Решение:** Добавить явную очистку в cleanup с проверкой, что обработчики были добавлены. Либо использовать `useRef` для хранения ссылок на обработчики.

#### 3.7. Гонка состояний в `useFileSystemInit`
**Файл:** `src/hooks/useFileSystem.ts:78-141`  
**Проблема:** `isHydratingFile` — module-level флаг. Если `switchFile` вызывается пока инициализация ещё не завершилась, флаг может быть в некорректном состоянии. Также асинхронная инициализация не имеет защиты от unmount.

**Решение:** Использовать `useRef` вместо module-level переменной. Добавить AbortController для отмены асинхронных операций при unmount.

#### 3.8. `localStorage` как точка отказа
**Файлы:** `src/hooks/useFileSystem.ts`, `src/hooks/usePreferences.ts`, `src/domain/documentService.ts`  
**Проблема:** Активный fileId, dirty-save, и настройки хранятся в localStorage. В Safari private mode localStorage может быть недоступен (выбрасывает исключение при записи). Хотя `usePreferences` оборачивает в try/catch, `documentService` — нет.

**Решение:** 
- Создать единый `storageAdapter` с fallback на in-memory хранилище при недоступности localStorage
- Все вызовы localStorage обернуть через этот адаптер

### 🟡 Средние

#### 3.9. `buildBoardColumns` дублирует логику с `useColumns`
**Файлы:** `src/hooks/useBoardLayout.ts`  
**Проблема:** `buildBoardColumns` — чистая функция, `useColumns` — хук-обёртка над ней с `useMemo`. Но в `App.tsx` колонки вычисляются напрямую через `useColumns`, что корректно. Однако логика активного коридора (`useActiveCorridor`) очень сложна и не полностью покрыта тестами (только 5 тестов на 237 строк).

**Решение:** Расширить тестовое покрытие для `buildBoardColumns`, особенно edge cases: пустой activePath, несуществующий activeId, циклические структуры.

#### 3.10. `toggleCheckboxContent` — хрупкая реализация
**Файл:** `src/utils/markdownParser.ts`  
**Проблема:** Функция ищет checkbox по индексу (`index`), переданному из DOM. Если контент изменился между рендером и кликом (что теоретически возможно в React 19 с concurrent rendering), индекс может указывать не на тот checkbox.

**Решение:** Передавать не индекс, а `line` + `column` или offset в контенте. Либо использовать content-based идентификатор (например, хеш строки с чекбоксом).

#### 3.11. `generateId` счётчик не сбрасывается
**Файл:** `src/utils/id.ts:1`  
**Проблема:** `let idCounter = 0` — module-level счётчик. При долгой работе приложения он будет расти бесконечно. При использовании `crypto.randomUUID()` (основной путь в современных браузерах) это не проблема, но fallback-путь генерирует ID на основе `idCounter`.

**Решение:** Использовать только `crypto.randomUUID()`. Если нужен fallback, добавить больше энтропии (например, `performance.now()`).

#### 3.12. Undo/Redo сбрасывается при переключении файлов
**Файл:** `src/store/slices/historySlice.ts:11`  
**Проблема:** `setNodesRaw` сбрасывает past/future. При переключении файлов вызывается `setNodesRaw`, что теряет историю. Это может быть ожидаемым поведением (per-document history), но тогда история не восстанавливается при возвращении к файлу.

**Решение:** Рассмотреть per-document undo-стек (сохранять past/future в IndexedDB или в Map по fileId).

#### 3.13. `lastCopiedCards` — module-level кеш без очистки
**Файл:** `src/hooks/useAppHotkeys.ts:41-49`  
**Проблема:** Кеш clipboard хранится в module-level переменной. Если пользователь копирует из PuuNote, а затем из другого приложения, кеш может быть устаревшим. Хотя есть TTL (2 минуты), это неочевидное поведение.

**Решение:** Использовать `sessionStorage` для кеша clipboard с автоматической очисткой.

#### 3.14. `snapshots.ts` — `pruneDocumentSnapshots` удаляет по одному
**Файл:** `src/db/snapshots.ts:16-28`  
**Проблема:** 
```ts
while (snapshots.length > 25) {
  const oldest = snapshots.pop();
  if (oldest) await db.snapshots.delete(oldest.id);
}
```
Каждое удаление — отдельная async-операция. Для больших списков это медленно.

**Решение:** Использовать `db.snapshots.bulkDelete(idsToDelete)` одним вызовом.

#### 3.15. `Footer.tsx` — сложная логика туториала
**Файл:** `src/components/Footer.tsx:80-150`  
**Проблема:** Логика сброса туториала (существует ли, открыт ли, создавать новый) размазана по 70 строкам JSX с вложенными колбеками и проверками store. Трудно читать и тестировать.

**Решение:** Вынести в отдельный хук `useTutorialReset()`.

### 🟢 Мелкие

#### 3.16. `fullscreen.ts` — 4 вендорных префикса в 2026
**Файл:** `src/utils/fullscreen.ts`  
**Проблема:** Проверяются `webkitFullscreenElement`, `mozFullScreenElement`, `msFullscreenElement`. В 2026 году все браузеры поддерживают стандартный Fullscreen API. Вендорные префиксы — мёртвый код.

**Решение:** Удалить вендорные префиксы, оставить только стандартный API. (Если целевая аудитория включает iOS Safari < 16.4 — оставить webkit.)

#### 3.17. `cn.ts` — избыточный utility
**Файл:** `src/utils/cn.ts`  
**Проблема:** Tailwind CSS 4 имеет встроенную функцию `twMerge` / `twJoin`. Свой `cn` делает то же самое, но без merge-логики.

**Решение:** Заменить на `clsx` + `tailwind-merge` или на встроенный `twMerge` из Tailwind 4. Либо оставить как есть — 12 строк не стоят рефакторинга.

#### 3.18. `AutosizeTextarea.tsx` — 361 строка
**Файл:** `src/components/AutosizeTextarea.tsx`  
**Проблема:** Самый большой компонент. Содержит логику авто-resize, debounce, floating toolbar с форматированием, синхронизацию внешнего value, работу с selection range.

**Решение:** Разбить на:
- `AutosizeTextarea.tsx` — только textarea + auto-resize
- `FormattingToolbar.tsx` — floating toolbar
- `useAutosizeTextarea.ts` — хук с логикой

#### 3.19. `safeMarkdown.tsx` — жёстко захардкожен whitelist тегов
**Файл:** `src/components/SafeMarkdown.tsx:44-60`  
**Проблема:** Список разрешённых тегов захардкожен. При добавлении новых markdown-фич (например, диаграмм Mermaid) нужно править этот файл.

**Решение:** Вынести whitelist в конфиг/константы.

#### 3.20. `i18n.ts` — все переводы в одном файле
**Файл:** `src/i18n.ts` (201 строка)  
**Проблема:** Все EN/RU переводы в одном файле. При росте числа переводов файл станет неуправляемым.

**Решение:** Разбить на `locales/en.json` и `locales/ru.json`, загружать через `i18next-http-backend` или напрямую импортировать.

#### 3.21. `tsconfig.json` — `noUnusedLocals` может мешать разработке
**Файл:** `tsconfig.json`  
**Проблема:** `noUnusedLocals: true` и `noUnusedParameters: true` включены в tsconfig. Это хорошо для production, но может мешать при отладке (закомментированный код, временные переменные).

**Решение:** Оставить как есть — это заставляет писать чистый код. Но добавить `// @ts-nocheck` возможность для dev-веток.

---

## 4. UI & UX проблемы

### 🔴 Критические

#### 4.1. Нет Drag & Drop между колонками
**Проблема:** Drag-and-drop работает только в пределах одной колонки (top/bottom drop zones) и для создания дочерних узлов (right drop zone). Нельзя перетащить карточку в другую колонку, чтобы переместить её между разными родителями.

**Влияние:** Пользователь не может визуально реорганизовать дерево — приходится использовать только клавиатурные команды.

**Решение:** Добавить cross-column drop zones с визуальной индикацией.

#### 4.2. Нет мобильной версии / адаптива
**Проблема:** `Card.tsx` использует `onDragStart` и другие desktop-события. На мобильных устройствах:
- Drag-and-drop не работает
- Колонки не адаптируются (хотя CSS для мобильных есть)
- Floating card actions привязаны к pointer-позиции

**Решение:** 
- Touch-альтернативы для drag-and-drop
- Свайп-жесты для мобильной навигации
- Адаптивная вёрстка (одна колонка на телефоне)

### 🟠 Серьёзные

#### 4.3. Floating Actions — проблемы с позиционированием
**Файл:** `src/components/FloatingCardActions.tsx`  
**Проблема:** Позиционирование через `createPortal` + `getBoundingClientRect`. При скролле или ресайзе позиция обновляется, но есть race condition: если карточка удалилась, а таймер visibility ещё не истёк, кнопки могут «зависнуть» в воздухе.

#### 4.4. Command Palette — смешение двух концепций
**Файл:** `src/components/CommandPalette.tsx`  
**Проблема:** Командная палитра одновременно ищет и документы, и выполняет действия (new file, delete file, AI draft). Это смешение search + command palette — две разные UI-парадигмы.

**Решение:** Разделить: 
- `Cmd/Ctrl+K` — Fuzzy Search по карточкам и документам
- `Cmd/Ctrl+Shift+P` — Command Palette только для действий

#### 4.5. Undo/Redo не показывает, что будет отменено
**Проблема:** Кнопки Undo/Redo в Header — просто стрелки без подсказки, какое действие будет отменено/повторено.

**Решение:** Добавить tooltip с описанием последнего действия (например, "Undo: add card").

### 🟡 Средние

#### 4.6. Нет контекстного меню (right-click)
**Проблема:** Все действия доступны через клавиатуру или Floating Actions, но нет правого клика с меню «Copy, Cut, Paste, Delete, Add Child, Add Sibling».

**Решение:** Добавить `onContextMenu` с кастомным меню.

#### 4.7. Нет индикации загрузки при переключении файлов
**Проблема:** При переключении между большими документами нет спиннера или skeleton. UI momentarily «замерзает».

**Решение:** Добавить transition/animation при смене документа.

#### 4.8. Timeline View — нет поиска внутри документа
**Проблема:** Timeline View показывает весь документ, но нет поиска (Ctrl+F) внутри него. React-virtuoso усложняет нативный поиск браузера.

**Решение:** Добавить inline search bar в Timeline View.

#### 4.9. Theme toggle — циклический без визуальной подсказки
**Проблема:** Кнопка темы переключает light → dark → blue → brown → light. Пользователь не знает, какая тема следующая, пока не нажмёт.

**Решение:** Показывать мини-превью или выпадающий список тем вместо циклического переключения.

#### 4.10. Save status — нет автоматического восстановления после ошибки
**Проблема:** Если сохранение упало с ошибкой (например, QuotaExceeded), статус остаётся «Save failed». Нет кнопки «Retry» или автоматической повторной попытки.

**Решение:** Добавить Retry в Footer при статусе «Save failed».

### 🟢 Мелкие

#### 4.11. Нет «Drag to select» нескольких карточек
**Проблема:** Multi-select возможен только через Cmd/Ctrl+Click. Нельзя выделить группу карточек «резинкой» (drag selection).

#### 4.12. Нет Zoom / увеличения ширины колонок колесом мыши
**Проблема:** Ширина колонок меняется только через слайдер в Footer.

**Решение:** Добавить `Ctrl+Scroll` для изменения ширины колонок.

#### 4.13. Shortcuts Modal — нет поиска по горячим клавишам
**Проблема:** Модальное окно просто показывает список хоткеев без возможности поиска.

#### 4.14. Нет светлой темы для кода
**Проблема:** Блоки кода в Markdown не имеют специфичного для темы оформления. В тёмной теме код может быть нечитаемым.

#### 4.15. Zen Mode — не скрывает скроллбары
**Проблема:** В Zen Mode скроллбары колонок остаются видимыми, что нарушает минималистичную эстетику.

---

## 5. Структурные проблемы

### 5.1. Отсутствует `documentApi.ts` — сломанная архитектура
**Файлы, которые должны зависеть от documentApi:**
- `src/store/slices/documentSlice.ts` (импортирует, активно использует)
- README.md (документирует как публичный API)

documentApi — критический архитектурный слой, описанный в README как «слой манипуляции графом». Но файла нет. Это означает, что либо:
- Слой ещё не реализован (и documentSlice — заглушка)
- Файл был удалён, а импорты остались
- Проект не в рабочем состоянии

### 5.2. Смешение `useFileSystem.ts` и `documentService.ts`
**Файлы:** `src/hooks/useFileSystem.ts` (428 строк), `src/domain/documentService.ts` (311 строк)  
**Проблема:** `useFileSystem.ts` — это React-хук, но он содержит:
- Бизнес-логику автосохранения (`pendingSave`)
- Подписку на изменения store
- Обработчики `beforeunload`, `visibilitychange`
- Функции `deriveDocumentTitle`, `cleanTitle`

Это размазывает ответственность между хуком и сервисом.

**Решение:** `useFileSystem` должен только вызывать методы `DocumentService` и синхронизировать store. Вся логика сохранения — в `DocumentService`.

### 5.3. PluginRegistry — зачаточное состояние без реального использования
**Файл:** `src/plugins/registry.ts` (85 строк)  
**Проблема:** 
- `CardActionHook` определён, но нигде не используется в UI (нет рендеринга cardActions)
- Плагины регистрируются, но не могут добавлять UI-компоненты (только `ReactNode` для иконок)
- Нет системы прав/permissions
- Нет sandbox
- Нет lifecycle (install/uninstall/update)

По сути, PluginRegistry сейчас — это event bus для `onNodeCreated/Updated/Deleted`.

**Решение:** См. раздел 7 (Архитектура API для ИИ-плагинов).

### 5.4. Дублирование валидации
**Проблема:** Данные валидируются в трёх местах:
1. `schema.ts` — Zod (структурная валидация + repair)
2. `documentService.ts` — `normalizeNodesWithReport` (дедупликация ID, order)
3. `documentSlice.ts` — неявная валидация через `documentApi` (если бы он существовал)

**Решение:** Объединить в единый пайплайн: Zod → normalizeNodes → documentApi.

### 5.5. `globals.d.ts` — только один declare
**Файл:** `src/globals.d.ts` (4 строки)  
**Проблема:** Файл называется «globals», но содержит только declare для raw-импортов. Ожидались бы глобальные типы для `PluginRegistry`, `AiProvider`, etc.

### 5.6. `useToggleCheckbox.ts` — слишком маленький хук
**Файл:** `src/hooks/useToggleCheckbox.ts` (17 строк)  
**Проблема:** Хук делает ровно одну вещь — toggle checkbox. Возможно, его нужно объединить с `useAppHotkeys` или перенести в компонент Card.

---

## 6. Итоговый чеклист

### Критические (блокируют сборку / потерю данных)

- [ ] **3.1/3.2/5.1** — Создать `src/domain/documentApi.ts` (или выяснить, куда он делся)
- [ ] **3.5** — Создать `src/services/JobRunner.ts` или заменить на функционал `useJobStore`
- [ ] **3.6** — Починить потенциальный memory leak в global event listeners

### Серьёзные (могут вызвать баги)

- [ ] **3.3** — Перенести `pendingSave` из module scope в store/ref
- [ ] **3.7** — Заменить `isHydratingFile` (module-level) на `useRef`
- [ ] **3.8** — Создать `storageAdapter` с fallback для localStorage
- [ ] **3.4** — Рефакторинг `useAppHotkeys.ts` (467 строк → разделить)
- [ ] **3.10** — Переделать `toggleCheckboxContent` с индексной на content-based идентификацию
- [ ] **3.14** — `pruneDocumentSnapshots` — bulk delete вместо цикла

### Структурные

- [ ] **5.2** — Разделить `useFileSystem.ts` (бизнес-логика vs React-хук)
- [ ] **5.4** — Объединить валидацию в единый пайплайн
- [ ] **3.18** — Разбить `AutosizeTextarea.tsx` (361 строка)
- [ ] **3.20** — Разбить `i18n.ts` на locale-файлы

### UI/UX

- [ ] **4.1** — Drag-and-drop между колонками
- [ ] **4.2** — Мобильная адаптация
- [ ] **4.3** — Починить Floating Actions позиционирование
- [ ] **4.4** — Разделить Command Palette (search vs commands)
- [ ] **4.6** — Контекстное меню (right-click)
- [ ] **4.11** — Drag-to-select нескольких карточек

### Оптимизация

- [ ] **3.9** — Расширить тесты для `buildBoardColumns`
- [ ] **3.16** — Удалить мёртвые вендорные префиксы fullscreen
- [ ] **3.17** — Оценить замену `cn.ts` на `clsx` + `tailwind-merge`

---

## 7. Дальнейшее развитие: API для ИИ-плагинов

### Текущее состояние

Сейчас в проекте есть:
- `PluginRegistry` — event bus (onNodeCreated/Updated/Deleted)
- `CardActionHook` — интерфейс для кастомных кнопок на карточках (не используется в UI)
- `AiProvider` — интерфейс для AI-провайдеров (только mock)
- `buildContextForLLM` — извлечение контекста для LLM
- `JobRunner` — (отсутствует файл) для фоновых задач

### Предлагаемая архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                     Plugin System v1                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │  Plugin SDK  │    │  Sandbox (IFrame │    │  AiProvider   │  │
│  │  (npm pkg)   │◄──►│  / Web Worker)   │◄──►│  Registry     │  │
│  └─────────────┘    └──────────────────┘    └───────────────┘  │
│         │                    │                       │          │
│         ▼                    ▼                       ▼          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  Plugin Host (Main App)                  │   │
│  │  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │ Document │ │  Context  │ │  Tool    │ │    UI    │  │   │
│  │  │   API    │ │  Bridge   │ │ Executor │ │  Slots   │  │   │
│  │  └──────────┘ └───────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1. Plugin Manifest & SDK

```typescript
// pluginManifest.ts
interface PuuPluginManifest {
  id: string;                    // "puu.translator"
  name: string;                  // "AI Translator"
  version: string;               // "1.0.0"
  description: string;
  author: string;
  
  // Permissions
  permissions: {
    readDocument: boolean;       // Чтение текущего документа
    modifyDocument: boolean;     // Изменение дерева (add/delete/update)
    networkAccess: boolean;      // Доступ к fetch
    localStorage: boolean;       // Своё хранилище
    clipboard: boolean;          // Чтение/запись clipboard
    notifications: boolean;      // Toast-уведомления
  };
  
  // UI integration
  ui: {
    cardActions?: CardActionSpec[];       // Кнопки на карточках
    toolbarButton?: ToolbarButtonSpec;    // Кнопка в Header
    settingsPanel?: SettingsPanelSpec;    // Панель настроек
    floatingPanel?: FloatingPanelSpec;    // Плавающая панель
  };
  
  // AI providers
  aiProviders?: AiProviderDefinition[];
  
  // Lifecycle
  onInstall: (api: PuuPluginAPI) => Promise<void>;
  onUninstall: () => Promise<void>;
}

interface PuuPluginAPI {
  // Document API (read-only, unless modifyDocument permission)
  document: {
    getNodes(): PuuNode[];
    getActiveNode(): PuuNode | null;
    getTreeForNode(nodeId: string): { ancestors: PuuNode[]; descendants: PuuNode[] };
    buildLLMContext(nodeId: string, options?: LLMContextOptions): ContextExtractionResult;
  };
  
  // Document API (write, requires modifyDocument permission)
  documentWrite: {
    updateContent(nodeId: string, content: string): Promise<void>;
    addChild(parentId: string, content?: string): Promise<string>;   // returns newId
    addSibling(targetId: string, content?: string): Promise<string>;
    deleteNode(nodeId: string): Promise<void>;
    replaceSubtree(parentId: string, nodes: PuuNode[]): Promise<void>;
  };
  
  // UI
  ui: {
    showToast(message: string, type: "success" | "error" | "info"): void;
    showProgress(jobId: string, progress: number, message: string): void;
    openFullScreen(nodeId: string): void;
    switchToDocument(documentId: string): void;
  };
  
  // Storage (requires localStorage permission)
  storage: {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
  };
  
  // Network (requires networkAccess permission)
  network: {
    fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  };
  
  // Jobs
  jobs: {
    start(name: string, fn: (progress: (p: number) => void) => Promise<void>): string;
    cancel(jobId: string): void;
  };
  
  // Events
  events: {
    on(event: "nodeCreated" | "nodeUpdated" | "nodeDeleted" | "documentChanged", handler: Function): void;
    off(event: string, handler: Function): void;
  };
}
```

### 7.2. Sandboxing (2 варианта)

**Вариант A: Web Worker (для не-UI плагинов)**
- Плагин работает в Worker
- Доступ только через `postMessage` API
- Аудиты безопасности (CSP, ограничения fetch)
- Плюс: настоящая изоляция
- Минус: нет доступа к DOM, нельзя рендерить UI

**Вариант B: IFrame + postMessage (для UI плагинов)**
- Плагин загружается в sandboxed iframe
- Коммуникация через MessageChannel
- UI слоты рендерятся в iframe, позиционируются через портал
- Плюс: полная изоляция, можно рендерить любой UI
- Минус: сложнее, overhead памяти

**Рекомендация:** Комбинация. Для простых AI-плагинов (translate, summarise) — Web Worker. Для сложных (кастомные панели) — IFrame.

### 7.3. AI Provider System

```typescript
// aiProviderRegistry.ts
interface AiProviderConfig {
  id: string;                    // "openai-gpt4", "anthropic-claude", "ollama-llama3"
  name: string;
  type: "cloud" | "local" | "browser";
  
  // Runtime
  models: AiModel[];
  requiresApiKey: boolean;
  apiKeyStorage: "local" | "session" | "none";
  
  // Execution
  createCompletion(request: AiRequest): Promise<AiResponse>;
  streamCompletion?(request: AiRequest): AsyncIterable<AiChunk>;
}

interface AiModel {
  id: string;                    // "gpt-4o", "claude-sonnet-4"
  name: string;
  contextWindow: number;
  costPer1kTokens?: { input: number; output: number };
  capabilities: ("chat" | "json" | "function-calling" | "vision")[];
}

interface AiRequest {
  model: string;
  systemPrompt: string;
  context: string;               // extracted via buildContextForLLM
  instruction: string;           // user's prompt
  options?: {
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  };
}
```

### 7.4. UI Slots (места для встраивания плагинов)

```
┌──────────────────────────────────────────────────┐
│ Header  [plugin.toolbarButton] [plugin.dropdown] │  ← toolbar zone
├──────────┬───────────────────┬───────────────────┤
│          │                   │                   │
│  Card    │  [plugin.card     │                   │  ← card action buttons
│          │   Actions]        │                   │
│          │                   │                   │
├──────────┴───────────────────┴───────────────────┤
│ Footer  [plugin.statusBar]                       │  ← status bar widgets
└──────────────────────────────────────────────────┘

┌─────────────────────┐
│  Plugin Panel       │  ← floating/right panel
│  (custom UI)        │
│                     │
└─────────────────────┘
```

### 7.5. Roadmap (предлагаемый порядок реализации)

1. **Phase 1: Foundation (1-2 недели)**
   - Создать `PuuPluginAPI` (read-only document API)
   - Создать `PluginSandbox` (IFrame-based)
   - Реализовать UI slots (cardActions, toolbarButton)
   - Написать первый встроенный плагин: "AI Expand" (использует mockAiProvider)

2. **Phase 2: AI Providers (2-3 недели)**
   - OpenAI provider (GPT-4o)
   - Anthropic provider (Claude)
   - Ollama provider (local, Llama 3)
   - API key management UI (encrypted localStorage)
   - Streaming support

3. **Phase 3: Plugin Marketplace (3-4 недели)**
   - Plugin manifest schema v1
   - Plugin install/uninstall lifecycle
   - Plugin settings storage
   - Plugin discovery (GitHub repo / npm / static registry)

4. **Phase 4: Advanced (4+ недели)**
   - Plugin permissions UI (grant/revoke)
   - Multi-provider routing (fallback if primary fails)
   - Plugin analytics (usage stats, error rates)
   - Plugin collaboration (multiple plugins modifying same document)

---

## 8. Заключение

**PuuNote** — архитектурно зрелый проект с хорошими практиками:
- Плоский массив + TreeIndex — простое и эффективное представление графа
- Zod + repair-валидация — надёжный импорт данных
- Dirty-save — защита от потери данных
- Code-splitting — продуманная оптимизация загрузки

**Главные проблемы:**
1. **documentApi.ts не существует** — это блокирует сборку и ломает всю цепочку documentSlice
2. **JobRunner.ts не существует** — AI-операции не работают
3. **Module-level переменные** (`pendingSave`, `isHydratingFile`, `lastCopiedCards`) — антипаттерн, усложняет тестирование
4. **Plugin System** в зачаточном состоянии — нет sandbox, нет UI-слотов, нет реальных провайдеров

**Приоритеты на ближайшее время:**
1. Восстановить/создать `documentApi.ts`
2. Создать `JobRunner.ts`
3. Рефакторинг module-level переменных
4. UI/UX: cross-column drag-and-drop, мобильная адаптация
5. Plugin API Phase 1 (см. Roadmap выше)