# PuuNote 0.4 — Комплексный аудит кода

**Дата аудита:** 2026-05-01
**Модель:** minimax-m2.7
**Версия проекта:** 0.4 (Local-first нелинейный редактор)
**Стек:** React 19 + TypeScript, Vite 6, Tailwind CSS 4, Dexie.js (IndexedDB), Zustand, Framer Motion

---

## 1. Описание проекта

### Что это за проект

**PuuNote** — это local-first текстовый редактор нового поколения, построенный на принципиально иной пространственной парадигме: вместо классического вертикального документа с линейным потоком текста, информация организована в **горизонтальное ветвящееся дерево карточек**, где идеи развиваются **слева направо** по колонкам.

Проект представляет собой **Single Page Application (SPA)** и работает полностью в браузере без серверной части, используя **IndexedDB** (через Dexie.js) для персистентного хранения данных. Это обеспечивает приватность (данные не уходят в облако), мгновенный старт и офлайн-работу.

### Архитектура и ключевые компоненты

#### 1.1 Модель данных (domain layer)

```
PuuNode {
  id: string
  content: string
  parentId: string | null
  order?: number
  metadata?: PuuNodeMetadata
}

PuuDocument {
  id: string
  title: string
  updatedAt: number
  metadata?: PuuDocumentMetadata
}
```

Простая и элегантная модель: **дерево узлов** (nodes) + **метаданные документа** (documents). Узел ссылается на родителя через `parentId`, что делает структуру плоской (удобной для хранения) и рекурсивной (удобной для обхода). Порядок `order` определяет положение среди сиблингов.

**Хранение:** IndexedDB (через Dexie.js) — три таблицы: `documents`, `files`, `snapshots`.

#### 1.2 Уровни абстракции (снизу вверх)

```
┌─────────────────────────────────────────────┐
│  UI Layer (React Components)                │
│  Card, Header, Footer, CommandPalette, etc.  │
├─────────────────────────────────────────────┤
│  State Management (Zustand Store)            │
│  AppStore: UiSlice, SelectionSlice,          │
│  HistorySlice, DocumentSlice                 │
├─────────────────────────────────────────────┤
│  Business Logic (Domain)                    │
│  documentTree.ts, documentService.ts,       │
│  documentExport.ts, aiOperations.ts         │
│  contextExtraction.ts, jobRunner.ts         │
├─────────────────────────────────────────────┤
│  Persistence (db/)                          │
│  Dexie.js (IndexedDB)                       │
│  db.ts, snapshots.ts                        │
├─────────────────────────────────────────────┤
│  Utilities (utils/, hooks/)                  │
│  tree.ts, schema.ts, markdownParser.ts,     │
│  id.ts, cn.ts, useBoardLayout.ts, etc.       │
└─────────────────────────────────────────────┘
```

#### 1.3 Ключевые модули

| Модуль | Назначение |
|--------|------------|
| `documentTree.ts` | Изолированные операции над графом узлов: add, delete, split, merge, move. Все изменения проходят через этот API — это защитный слой, не позволяющий сломать дерево. |
| `documentService.ts` | Трансляция между Zustand state и IndexedDB. Нормализация, валидация, dirty-save (аварийное сохранение перед unload). |
| `schema.ts` | Zod-схемы валидации node/document. Максимум 50 000 узлов, 5MB контента на узел, защита от циклов (глубина ≤ 200). |
| `tree.ts` | Индексы для быстрого обхода дерева: `buildTreeIndex()` строит `nodeMap` + `childrenMap` за один проход O(n). Все обходы дерева ( ancestors, descendants, depth-first) используют этот индекс. |
| `useBoardLayout.ts` | Логика построения колонок для рендеринга. Два режима: показ полного дерева или "active corridor" (фокус на активной ветке). |
| `aiOperations.ts` + `jobRunner.ts` + `aiProvider.ts` | Фундамент для AI-операций: Job Runner для фоновых задач с отменой, контекст для LLM, mock-provider с draft generation. |
| `PluginRegistry` | Система плагинов: хуки на создание/обновление/удаление узлов, card actions. |
| `markdownParser.ts` | Импорт/экспорт: два формата Markdown (flat + structured), clipboard JSON, HTML. Парсинг PuuNote-формата и "mind map" формата из внешних источников. |

### Как работает основной workflow

1. **Загрузка:** При старте `useFileSystemInit()` читает `activeFileId` из localStorage, загружает узлы из IndexedDB, кладёт в Zustand через `setNodesRaw()` (без истории, это hydrate).
2. **Редактирование:** Все изменения проходят через `setNodes(updater)` → slice `createHistorySlice` сохраняет предыдущее состояние в `past[]` (до 50 шагов назад) → UI перерисовывается.
3. **Автосохранение:** Через 1000ms после изменения запускается debounced save в IndexedDB. Перед unload/visibility-hidden — аварийный dirty-save в localStorage.
4. **Undo/Redo:** Ctrl+Z вызывает `undo()` из historySlice, который берёт последнее из `past[]` и кладёт текущее в `future[]`.
5. **Export:** Markdown (flat/structured) или JSON выгружаются через browser download API.

---

## 2. Удачные решения

### 2.1 Изолированный Document API

`documentTree.ts` — все мутации дерева (add, delete, move, merge, split) вынесены в чистые функции, которые принимают массив узлов и возвращают новый массив. Это:

- **Тестируемость** — каждая функция pure, можно тестировать без React/DOM.
- **Безопасность** — никакой плагин или AI не может "случайно" сломать структуру.
- **Undo/Redo совместимость** — каждое изменение иммутабельное, прошлое состояние сохраняется автоматически.

### 2.2 TreeIndex как кэш для обходов

`buildTreeIndex()` за один проход O(n) строит `nodeMap` и `childrenMap`. Вместо повторяющихся filter/reduce при каждом обходе — один раз построили, много раз использовали. Особенно важно для UI, где дерево может перестраиваться десятки раз при скролле.

### 2.3 Dirty Save (аварийное сохранение)

Стратегия: `beforeunload` + `visibilitychange` → сохраняем текущее состояние в localStorage. Это защита от ситуации "пользователь закрыл вкладку, а автосейв ещё не произошёл". При следующем запуске `restoreDirtySave()` восстановит несохранённые данные.

### 2.4 Snapshot System

Независимая система снимков (до 25 на документ) через IndexedDB. Перед каждой AI-операцией делается `takeDocumentSnapshot("Before AI...")`. Пользователь может откатиться к любому снимку. Это **изоляция деструктивных операций** — LLM-мутации не страшны.

### 2.5 Clipboard Format

Тройной формат при копировании: `text/plain` (Markdown) + `text/html` (визуальный) + `web application/x-puunote+json` (Puunote-специфичный). Это позволяет копировать между инстансами приложения без потери структуры, а также вставлять в обычные текстовые редакторы (получишь readable Markdown).

### 2.6 Валидация и нормализация

`schema.ts` с Zod валидирует все входящие данные (импорт, загрузка из IndexedDB). Deduplicate ID, удаляетorphan-узлы (родитель не существует → node.parentId=null), защита от циклов (depth > 200). Это превращает "грязные" данные в консистентное состояние.

### 2.7 Separation of concerns в Zustand slices

Четыре независимых slice объединяются в один store через spread:
- **UiSlice** — открыто/закрыто UI-элементов, тема, ширина колонки
- **SelectionSlice** — какой узел активен, какие выбраны, какой редактируется
- **HistorySlice** — nodes[], past[], future[]
- **DocumentSlice** — documents[], activeFileId, CRUD операции

Это позволяет модифицировать одну часть состояния без влияния на другие и упрощает тестирование.

### 2.8 Keyboard-First дизайн

Все ключевые операции доступны без мыши: навигация по стрелкам, Tab/Shift+Enter для создания узлов, Space для FloatingCardActions, M9 lock для панели действий. Это серьёзное UX достижение для power users.

### 2.9 Focus Path / Active Corridor

Визуальная индикация "активного пути" — от корня до текущего узла. Неактивные ветки можно затенять или скрывать. Это решает проблему визуального шума в больших деревьях.

---

## 3. Проблемы в коде и возможные решения

### 3.1 CRITICAL: History slice хранит полные копии массивов узлов

**Файл:** `src/store/slices/historySlice.ts:38-39`
```typescript
past: [...state.past, currentNodes].slice(-50),
```

При 50 исторических состояниях и 10 000 узлов в документе — это 50 × 10 000 объектов в памяти. Каждый объект `PuuNode` содержит строку контента (平均假设 average 500 символов = ~1KB). Итого: **~500MB RAM** только под историю при большом документе.

**Решение:**
1. **CoW-like storage:** Хранить в `past` не полные массивы, а **дельты** (список операций). При undo применяем дельты в обратном порядке. Это сложнее, но экономит 90%+ памяти.
2. **Лимит по размеру:** `past.length` ограничить не 50ю, а 5ю-10ю для больших документов.
3. **Сжатие:** Использовать `JSON.stringify` + compression (но это overhead CPU).
4. **Snapshot instead of history:** Для больших документов переключаться на snapshot-based undo (сохранять весь документ каждые N операций, не каждую).

### 3.2 CRITICAL: Search index cache может расти бесконечно

**Файл:** `src/domain/documentService.ts:23-26`
```typescript
let searchIndexCache: {
  signature: string;
  nodes: SearchDocumentNode[];
} | null = null;
```

`getSearchNodes()` вызывается при каждом открытии Command Palette. Если пользователь работает с 1000+ документами по 500 узлов — это 500 000 объектов в памяти. Cache invalidate происходит только при изменении `documents` (через `clearSearchIndexCache()`), но не при изменении содержимого узлов внутри документа.

**Решение:**
- Инвалидировать кэш при изменении nodes текущего документа.
- Использовать `fuse.js` с ограниченным количеством результатов и подгружать частями.
- Ограничить `searchIndexCache.nodes` — не хранить все документы, а только текущий.

### 3.3 HIGH: `buildBoardColumns` вызывается при каждом рендере

**Файл:** `src/hooks/useBoardLayout.ts:86-113`

`useColumns` использует `useMemo` с зависимостями `[activeId, activePath, nodes, treeIndex, useActiveCorridor, unfocusedDepthLimit]`, но `treeIndex` пересчитывается при каждом изменении `nodes` (зависимость `[nodes]` в `App.tsx:89`).

`buildTreeIndex()` — O(n) при каждом изменении nodes. Это приемлемо для небольших документов, но при 5000+ узлах и частых изменениях (например, AI-генерация) может вызывать торможения.

**Решение:**
- `treeIndex` вычислять в `useBoardLayout` через собственный `useMemo` вместо передачи пропсом.
- В deep editing режиме (AI generation) отключать реактивный пересчёт columns до завершения операции.

### 3.4 HIGH: Debounced save конфликтует с history

**Файл:** `src/hooks/useFileSystem.ts:185`

```typescript
pendingSave.timer = setTimeout(() => {
  // ... save after 1000ms
}, 1000);
```

Если пользователь делает 10 изменений за 10 секунд (каждое < 1 секунды), каждое изменение перезапускает таймер, и только последнее сохранится. Это нормально для обычной работы, но:

1. Если пользователь меняет узел → undo → redo, undo возвращает из `past[]`, но новый `setNodes` запускает новый save. History-состояние "между изменениями" не сохраняется в БД.
2. Если user делает rapid edits и закрывает вкладку до истечения 1000ms — dirty-save спасёт, но это неочевидное поведение.

**Решение:**
- Сохранять каждое history-состояние как потенциальную точку отката. Не прямо в IndexedDB (медленно), а в memory + dirty-save. При crash recovery показывать не dirty-save, а последний stable save.

### 3.5 HIGH: `isHydratingFile` — глобальный mutable флаг

**Файл:** `src/hooks/useFileSystem.ts:15`
```typescript
let isHydratingFile = false;
```

Этот флаг используется для того, чтобы во время начальной загрузки документа отключить autosave и обновление заголовка. Но это **глобальный side-effect** — если дважды вызвать `switchFile` или `createNewFile` одновременно, флаг может оказаться в неправильном состоянии.

**Решение:**
- Заменить на `Map<fileId, boolean>` или аналогичный механизм с учётом конкретного документа.
- Или использовать Zustand-специфичный флаг внутри store (например, `isLoadingFileId: string | null`).

### 3.6 MEDIUM: Строка `newIdValue` с мутабельным характером

**Файл:** `src/store/slices/documentSlice.ts:74-88`
```typescript
let newIdValue: string | null = null;
get().setNodes((prev) => {
  const { nextNodes, newId } = documentApi.addChild(prev, parentId);
  newIdValue = newId;  // side-effect внутри updater
  return nextNodes;
});
```

Это работает, но это **anti-pattern**: updater function должна быть чистой функцией (принимает state, возвращает new state). Здесь есть side-effect (присваивание во внешнюю переменную). Это хрупко — если Zustand изменит порядок вычислений (например, batching), это может сломаться.

**Решение:**
- Использовать Zustand `getState()` после `setNodes`, вне updater:
```typescript
get().setNodes((prev) => documentApi.addChild(prev, parentId).nextNodes);
const newId = get().nodes.find(/* newest by order */)?.id;
```

### 3.7 MEDIUM: Double RAF в `useActivePathScroll`

**Файл:** `src/hooks/useBoardLayout.ts:155-156`
```typescript
rafId = requestAnimationFrame(() => {
  rafId = requestAnimationFrame(updateScroll); // Double raf guarantees paint
});
```

"Double RAF guarantees paint" — это известный workaround для браузерных багов с scrollIntoView в прошлом. В современных браузерах (2024+) это уже не нужно. Этот код добавляет лишний frame задержки при каждой навигации.

**Решение:**
- Попробовать одинарный RAF. Проверить на Chrome, Safari, Firefox. Если работает — убрать двойной вызов.

### 3.8 MEDIUM: `orderKeyFor` использует float для сортировки

**Файл:** `src/domain/documentTree.ts:177-192`

При перемещении группы узлов с поддеревьями используется формула:
```typescript
key += (pathOrders[index] + 1) / Math.pow(1000, index);
```

Это означает, что если глубина дерева > 3, точность float (15-17 значащих цифр) может привести к коллизиям порядка. При depth=6 и больших `order` значениях возможно переполнение.

**Решение:**
- Использовать `BigInt` или строковые ключи (лексикографическое сравнение) вместо float.
- Или пересчитывать `order` целочисленно после каждой операции move (как это уже делается в `normalizeSiblingOrder`).

### 3.9 MEDIUM: AiProviderRegistry использует in-memory Map

**Файл:** `src/domain/aiProvider.ts:98-100`

```typescript
const providers = new Map<string, AiProvider>([
  [mockAiProvider.id, mockAiProvider],
]);
```

В текущей реализации есть только mock provider. Если реальные провайдеры будут добавляться динамически, они не сохранятся при hot reload (что нормально для MVP). Но если провайдеры будут сторонними плагинами — нужен persistence.

### 3.10 MEDIUM: Search nodes загружают ВСЕ документы

**Файл:** `src/domain/documentService.ts:289-291`

```typescript
const allFiles = await db.files.toArray(); // ALL files, not just current doc
```

`getSearchNodes()` загружает **все файлы** из базы, хотя Command Palette логически должна искать только по текущему документу или по всем — но это неясно из UI. Если у пользователя 500 документов по 1000 узлов — это 500 000 узлов для поиска при каждом открытии палитры.

**Решение:**
- Разделить поиск: "Search in current document" (быстро, локально) vs "Search all documents" (медленно, асинхронно с прогрессом).
- Добавить debounce и cancellation.

### 3.11 LOW: `deleteFile` вызывает `createNewFile` если документов не осталось

**Файл:** `src/hooks/useFileSystem.ts:414-418`

```typescript
if (newDocs.length === 0) {
  await createNewFile();
  useAppStore.setState((s) => ({
    documents: s.documents.filter((d) => d.id !== fileId),
  }));
}
```

Это работает, но создаёт race condition: `createNewFile` уже добавляет новый документ в `state.documents`, а затем `filter` удаляет старый. Может быть двойной render с неконсистентным состоянием.

**Решение:**
- Лучше: в `deleteFile` напрямую создать новый документ через `DocumentService.createDocument`, а не через `createNewFile` (который также изменяет activeFileId, nodes и много чего ещё).

### 3.12 LOW: Snapshot restore сбрасывает activeId в null

**Файл:** `src/db/snapshots.ts:89`

```typescript
useAppStore.getState().setActiveId(null);
```

При restore snapshot нет навигации к восстановленным узлам. Пользователь оказывается в "空" состоянии без визуального подтверждения, что restore сработал.

**Решение:**
- После restore переключать activeId на корень восстановлённого документа.

### 3.13 LOW: `parseMindMapFormat` делает две разные вещи

**Файл:** `src/utils/markdownParser.ts:413`

Эта функция парсит Markdown с заголовками и списками и восстанавливает из них дерево. Но она также делает `blockquotes stripping` в конце (`n.content.replace(/^\s*>/gm, "")`). Это hidden transformation — пользователь вставляет blockquote, а оно исчезает без предупреждения.

**Решение:**
- Явно документировать это поведение.
- Предпочтительно — не удалять, а интерпретировать blockquote как metadata или note.

### 3.14 LOW: ErrorBoundary только на уровне Card

**Файл:** `src/App.tsx:196`

```tsx
{colNodes.map((node) => (
  <ErrorBoundary key={node.id}>
    <Card node={node} ... />
  </ErrorBoundary>
))}
```

Если ErrorBoundary внутри Card (например, при рендеринге Markdown), весь Card исчезает с ошибкой. Но если Card сломался из-за parent context (например, store изменился), вся колонка может сломаться.

**Решение:**
- Поднять ErrorBoundary на уровень колонки.
- Добавить fallback UI: "This card failed to render. Click to retry."

---

## 4. Ошибки UI & UX, недочёты, потенциальные глюки

### 4.1 UX: Command Palette не показывает текущий документ

При открытии палитры (`Cmd+K`) она всегда показывает **Commands** (7 пунктов). Поиск по документу требует ввода текста. Нет визуального разделения: "Commands" vs "Search in current document" vs "Search all documents".

**Решение:**
- Добавить explicit tabs/sections: `[Commands] [Current Doc] [All Docs]`.
- Показывать название документа большим в результатах поиска.

### 4.2 UX: FloatingCardActions появляется ТОЛЬКО при hover

На десктопе (non-touch) действия появляются только при наведении мыши. Но keyboard-first flow: `Space` → действия появляются, но **не фиксируются** — через 220ms hide timer срабатывает. Это неочевидно: пользователь нажимает Space, видит кнопки, но не успевает кликнуть мышью.

**Решение:**
- При keyboard-triggered показе (`floatingActionsVisible`) действия должны оставаться видимыми до явного действия пользователя (клик, Escape, навигация).

### 4.3 UX: Drag & Drop индикатор нечитаем на некоторых темах

**Файл:** `src/components/Card.tsx:268-275`

Drop zone indicator — цвет `bg-app-accent` с glow. На тёмной коричневой теме (`theme-brown`) акцентный цвет может сливаться с фоном.

**Решение:**
- Добавить CSS-перменные для glow-цвета, адаптивные к теме.
- Использовать контрастный цвет (белый/чёрный) вместо акцентного.

### 4.4 UX: `colWidth` slider показывает не значение

**Файл:** `src/components/Footer.tsx:136-146`

Slider для ширины колонки не отображает текущее значение численно. Пользователь должен угадывать "320px или 340px?". Это мелочь, но для power users важно.

**Решение:**
- Добавить tooltip или small text рядом с slider, показывающий текущее значение.

### 4.5 UX: Delete confirmation не показывает название удаляемого узла

**Файл:** `src/hooks/useAppHotkeys.ts:451-459`

```typescript
state.openConfirm(
  `Delete this card and its ${descendantCount} descendants?`,
  () => state.deleteNode(activeId),
);
```

Показывается "this card and its N descendants" — но непонятно, КАКОЙ карточки. Если у пользователя 50 карточек, он может не помнить, какая была активна.

**Решение:**
- Добавить название/заголовок узла в сообщение.
- В Message включить первую строку content (до 30 символов).

### 4.6 UX: Paste в режиме Timeline не работает

**Файл:** `src/hooks/useAppHotkeys.ts:190`

```typescript
if (timelineOpen || fullScreenId) return;
```

Paste игнорируется в Timeline View. Это неочевидное ограничение: пользователь может подумать "я в timeline, хочу вставить сюда". Но при этом в timeline можно редактировать контент узла (textarea active).

**Решение:**
- Либо поддержать paste в timeline (создавать новые узлы в конце), либо показать toast "Paste is not available in Timeline View".

### 4.7 BUG: `initializedCols` ref очищается при unmount

**Файл:** `src/hooks/useBoardLayout.ts:132-136`

```typescript
useEffect(() => {
  const initCols = initializedCols.current;
  return () => {
    initCols.clear();
    colRefs.current = [];  // ← это не EFFECT cleanup, это return cleanup!
  };
}, []);
```

Этот `return` в useEffect — это cleanup function, которая выполняется при unmount компонента. Но эффект зависит от `[]` (mount only), поэтому cleanup выполнится при unmount. Это работает, но стиль сбивает с толку — лучше использовать `useLayoutEffect` и помечать тип явно.

### 4.8 BUG: `onConfirm` в ConfirmDialog — нестабильная ссылка

**Файл:** `src/store/slices/uiSlice.ts:21-28`

```typescript
openConfirm: (message, onConfirm) =>
  set({
    confirmDialog: { isOpen: true, message, onConfirm },
  }),
```

При каждом вызове `openConfirm` создаётся **новый объект** `{ isOpen, message, onConfirm }`. Это вызывает перерисовку любого компонента, подписанного на `confirmDialog`. Если `onConfirm` — это inline arrow function (что типично), ссылка меняется при каждом рендере.

**Решение:**
- Хранить `onConfirm` в отдельном ref, недоступном для React reconciliation.
- Или использовать `useCallback` для стабилизации ссылки.

### 4.9 BUG: Merge validation не блокирует UI

**Файл:** `src/components/FloatingCardActions.tsx:309-333`

Кнопка Merge появляется, когда `mergeValidation.ok === true`. Но если validation не пройдена — пользователь не видит причину (почему нельзя мержить?). Кнопка просто не отображается.

**Решение:**
- Показывать кнопку всегда, но в disabled-состоянии с tooltip "Only sibling cards can be merged" и т.д.

### 4.10 UX: No focus ring на keyboard navigation

При использовании клавиатуры (Tab, стрелки) нет визуального **focus ring** на активном элементе. Это нарушает accessibility и делает keyboard-only навигацию неочевидной.

**Решение:**
- Добавить `focus-visible:ring-2 focus-visible:ring-app-accent` на все интерактивные элементы.

### 4.11 UX: Import создаёт НОВЫЙ документ, но не предупреждает

**Файл:** `src/App.tsx:134-139`

```typescript
useAppStore.getState().openConfirm("Import will create a new document. Proceed?", () => {
  createNewFile(imported.nodes, imported.title, imported.metadata);
});
```

Импорт из файла создаёт **новый** документ. Это может быть неожиданно, если пользователь хотел заменить текущий. С другой стороны, это разумно (не потерять текущую работу). Но стоит добавить опцию "Replace current document".

### 4.12 UX: Zen Mode имеет неочевидный exit

**Файл:** `src/App.tsx:233-258`

При переключении в fullscreen первое нажатие на exit переключает в **Zen Mode** (`setUiMode("zen")`), а не в normal/fullscreen closed. Это три состояния в нелинейном переходе. Пользователь может не понимать, что он в "Zen" а не в "Fullscreen".

**Решение:**
- Упростить: fullscreen toggle → либо fullscreen, либо normal. Zen Mode сделать отдельной explicit кнопкой/shortcut.

### 4.13 UX: Снепшоты не показывают preview содержимого

**Файл:** `src/components/SnapshotPanel.tsx`

Панель показывает только description и timestamp снимка. Preview content (количество узлов, первые слова) отсутствует. При 25 снепшотах непонятно, какой из них актуален.

**Решение:**
- Добавлять в description автоматически: "Snapshot (47 cards, 1200 words)".

---

## 5. Структурные недооптимальности

### 5.1 `contextExtraction.ts` импортирует `getDepthFirstNodesFromIndex`

**Файл:** `src/domain/contextExtraction.ts:3-6`

```typescript
import {
  getDepthFirstNodesFromIndex,
  buildTreeIndex,
  type TreeIndex,
} from "../utils/tree";
```

Но `buildTreeIndex` уже построен в `buildContextForLLM`. Можно переиспользовать. Это не баг, просто стиль.

### 5.2 Дублирование `buildTreeIndex` между `useBoardLayout` и `App`

**Файл:** `src/hooks/useBoardLayout.ts:95` vs **Файл:** `src/App.tsx:89`

В App: `const treeIndex = useMemo(() => buildTreeIndex(nodes), [nodes]);`
В useBoardLayout: `const index = treeIndex || buildTreeIndex(nodes);`

Если `treeIndex` не передан, `useBoardLayout` строит его повторно. Это бывает при тестах или при прямом вызове `buildBoardColumns`. Но в основном flow App всегда передаёт его. Не критично, но есть дублирование.

### 5.3 `normalizeNodesWithReport` парсит twice

**Файл:** `src/domain/documentService.ts:58-92`

При каждой загрузке из IndexedDB вызывается `normalizeNodesWithReport`, который:
1. Валидирует через Zod (уже гарантировано валидную схему при сохранении)
2. Проверяет дубликаты ID
3. Пересчитывает `order` для всех

Это защитный слой, но он выполняется даже для данных, которые уже прошли валидацию при сохранении. Можно добавить флаг "skip validation for trusted data".

### 5.4 Zustand store объединён через spread operator

**Файл:** `src/store/useAppStore.ts:9-15`

```typescript
export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    ...createUiSlice(set, get),
    ...createSelectionSlice(set, get),
    ...createHistorySlice(set, get),
    ...createDocumentSlice(set, get),
  })),
);
```

Это работает, но:
- Нет type safety между slices — если два slice определяют одно поле, последний побеждает без предупреждения.
- `get()` возвращает полный state, не конкретный slice. Это размывает ответственность.

**Решение:**
- Использовать `combine` из Zustand для автоматической проверки пересечений.
- Или документировать конвенцию: каждый slice уникален, пересечений нет.

### 5.5 Проверка `isQuotaError` дублируется

**Файл:** `src/hooks/useFileSystem.ts:17-19` и **Файл:** `src/db/snapshots.ts:43-44`

```typescript
const isQuotaError = (err: unknown) =>
  err instanceof Error &&
  (err.name === "QuotaExceededError" || err.message.includes("Quota"));
```

Эта функция определена в `useFileSystem.ts` и используется только там. В `snapshots.ts` та же логика inline. Стоит вынести в утилиту.

### 5.6 `AiProviderRegistry` — это singleton без интерфейса для removal

**Файл:** `src/domain/aiProvider.ts:102-115`

```typescript
export const AiProviderRegistry = {
  register(provider: AiProvider) {
    providers.set(provider.id, provider);
  },
  // Нет unregister
};
```

Плагин может зарегистрировать provider, но не может отозвать. При hot-reload или переключении AI-провайдеров это может приводить к утечкам.

### 5.7 `exportNodesToClipboardHtml` использует `encodeURIComponent`

**Файл:** `src/utils/markdownParser.ts:163`

```typescript
const encodedPayload = encodeURIComponent(exportNodesToClipboardJson(nodes));
```

`encodeURIComponent` не кодирует все символы (например, `!`, `'`, `(`, `)`, `~`). Для надёжности лучше использовать `btoa` + base64 или просто `encodeURIComponent` для безопасной части.

### 5.8 History limit = 50, но проверяется через `.slice(-50)`

**Файл:** `src/store/slices/historySlice.ts:39`

Это работает, но создаёт новый массив каждый раз. Лучше: проверять `length > 50` и slice_once, чтобы не пересоздавать массив при каждом изменении.

---

## 6. Потенциальные уязвимости и риски

### 6.1 XSS через Markdown (partial mitigation)

**Файл:** `src/components/SafeMarkdown.tsx`

`rehype-sanitize` фильтрует опасные теги, но:
- `data:` протокол для src/href отключён (только http/https). **Хорошо.**
- Но `<img src="javascript:alert(1)">` может пройти, если sanitize не полный.
- `on*` event handlers stripped. **Хорошо.**

Рекомендация: периодически обновлять `rehype-sanitize` до последней версии и проверять known CVEs.

### 6.2 No rate limiting на AI operations

**Файл:** `src/domain/aiOperations.ts`

`runMockExpandSelectedCard` запускает job без rate limiting. Злоумышленник или buggy plugin может запустить тысячи job-ов. `JobRunner` хранит их в `activeJobs` Set, но нет limit.

**Решение:**
- Добавить `max concurrent jobs` (например, 3).
- Добавить `max jobs per minute` для IP/сессии.

### 6.3 No authentication/authorization

Это local-first приложение — данные хранятся локально. Это и преимущество (privacy), и риск: если кто-то получит доступ к браузеру, все документы доступны. Нет защиты паролем, шифрования at-rest.

Если в будущем появится sync/collaboration — это станет критической проблемой.

### 6.4 No CSRF protection (local-first, не актуально)

Приложение не делает сетевых запросов, поэтому CSRF не применимо. Но если появится backend sync — нужно будет добавить токены.

### 6.5 `localStorage` вместо `sessionStorage` для dirty-save

**Файл:** `src/domain/documentService.ts:240-244`

Dirty-save хранится в `localStorage` (персистентный). Это значит, что если пользователь открывает приложение на другом устройстве — dirty-save там тоже будет (устаревший). Хотя бы `sessionStorage` был бы изолированнее.

**Решение:**
- Использовать `sessionStorage` вместо `localStorage` для dirty-save.
- Или добавить timestamp и проверять age.

---

## 7. Итоговый чеклист проблем

### Критические (CRITICAL) — требуют немедленного внимания

- [ ] **H-1:** History slice хранит полные копии массивов узлов — риск OOM при больших документах (10k+ узлов)
- [ ] **H-2:** Search index cache не инвалидируется при изменениях узлов — утечка памяти и устаревшие результаты
- [ ] **H-3:** `isHydratingFile` — глобальный mutable флаг, не thread-safe при concurrent file operations

### Высокие (HIGH) — важно исправить

- [ ] **M-1:** `buildBoardColumns` перестраивает treeIndex при каждом изменении nodes (O(n) каждую секунду при AI generation)
- [ ] **M-2:** `buildTreeIndex` вызывается дважды (App и useBoardLayout) при основном flow
- [ ] **M-3:** Paste игнорируется в Timeline View без уведомления пользователя
- [ ] **M-4:** Search загружает ВСЕ файлы из IndexedDB, не только текущий документ

### Средние (MEDIUM) — следует исправить

- [ ] **L-1:** Side-effect внутри Zustand updater (newIdValue)
- [ ] **L-2:** Double RAF для scroll alignment — legacy workaround
- [ ] **L-3:** Float-based order key может давать коллизии при depth > 6
- [ ] **L-4:** `deleteFile` с createNewFile race condition
- [ ] **L-5:** Snapshot restore сбрасывает activeId в null без визуальной навигации
- [ ] **L-6:** `parseMindMapFormat` скрыто удаляет blockquotes без предупреждения
- [ ] **L-7:** `onConfirm` в ConfirmDialog создаёт новый объект при каждом вызове
- [ ] **L-8:** `isQuotaError` проверка дублируется в двух местах
- [ ] **L-9:** No focus ring при keyboard navigation (accessibility)

### Низкие (LOW) — желательно исправить

- [ ] **L-10:** Command Palette не разделяет Commands / Current Doc Search / All Docs Search
- [ ] **L-11:** FloatingCardActions не фиксируется после keyboard trigger
- [ ] **L-12:** Drag & Drop indicator нечитаем на theme-brown
- [ ] **L-13:** `colWidth` slider не показывает числовое значение
- [ ] **L-14:** Delete confirmation не показывает название узла
- [ ] **L-15:** Merge validation скрыта — кнопка просто не появляется
- [ ] **L-16:** Import всегда создаёт новый документ, нет опции replace
- [ ] **L-17:** Zen Mode exit flow запутанный (3 состояния)
- [ ] **L-18:** Snapshots не показывают preview content
- [ ] **L-19:** AiProviderRegistry не имеет unregister
- [ ] **L-20:** history `.slice(-50)` создаёт новый массив каждый раз

---

## 8. Видение дальнейшего развития: API для AI-плагинов

### Контекст

Проект уже имеет **фундамент** для AI-системы (`aiProvider.ts`, `aiOperations.ts`, `jobRunner.ts`, `PluginRegistry`). Следующий этап — **публичный plugin API** и **реальные AI-провайдеры**.

### Предлагаемая архитектура

```
┌────────────────────────────────────────────────────────────────┐
│                        Plugin API Layer                         │
│  manifest.ts + plugin-sdk + sandbox (iframe/worker)             │
├────────────────────────────────────────────────────────────────┤
│                      AI Provider Layer                          │
│  OpenAI Provider | Anthropic Provider | Ollama Provider         │
│  (smart routing, fallback, load balancing)                       │
├────────────────────────────────────────────────────────────────┤
│                      Core AI Layer                              │
│  aiOperations.ts + contextExtraction.ts + jobRunner.ts          │
├────────────────────────────────────────────────────────────────┤
│                   Document Model Layer                          │
│  documentTree.ts + schema.ts (unchanged, stable)                 │
└────────────────────────────────────────────────────────────────┘
```

### 8.1 Plugin Manifest Schema

```typescript
interface PluginManifest {
  id: string;                    // unique, kebab-case
  name: string;                  // human-readable
  version: string;               // semver
  description: string;
  author?: string;
  homepage?: string;
  
  // Permissions model (least privilege)
  permissions: {
    nodes: "read" | "read-write" | "none";
    documents: "read" | "read-write" | "none";
    network: boolean;             // can make external requests
    storage: boolean;            // can use plugin's own IndexedDB table
    ui: "none" | "actions" | "full";
  };
  
  // Hooks implemented by this plugin
  hooks: ("node-created" | "node-updated" | "node-deleted" | "document-loaded" | "ai-context")[];
  
  // AI operations this plugin provides
  aiOperations?: {
    id: string;                   // "expand-card", "summarize", etc.
    label: string;
    destructive: boolean;          // can modify user's data
    requiresConfirmation: boolean;
  }[];
  
  // UI extensions
  cardActions?: {
    id: string;
    label: string;
    icon: string;                 // SVG string or icon name from lucide
    position: "floating" | "card-menu" | "toolbar";
  }[];
  
  // Entry point
  entry: string;                  // URL to plugin bundle
}
```

### 8.2 Plugin Sandboxing

**Critical:** Plugins must NEVER run in the main thread with full access. Two options:

**Option A: iframe sandbox (simpler, MVP)**
```
Main App (React) ←postMessage→ [iframe: plugin]
                                       ↓
                              [plugin-sdk API]
                                       ↓
                              [limited capabilities:
                               - nodes: read-only or read-write (per manifest)
                               - NO direct DOM access
                               - NO localStorage except plugin's own
                               - network: only to declared endpoints
                              ]
```

**Option B: Web Worker sandbox (more secure, complex)**
- Plugin runs in Worker, communicates via structured clone.
- Main thread validates all operations before applying.
- Pros: true parallelism, no UI blocking. Cons: complex state sync.

**Recommendation for MVP:** iframe sandbox with `sandbox="allow-scripts"` attribute. Plugin receives `window.parent.postMessage` API. Main app filters all messages.

### 8.3 AI Provider Interface

```typescript
interface AiProviderConfig {
  id: string;
  name: string;
  apiEndpoint: string;
  apiKey: string;                    // stored encrypted in IndexedDB
  model: string;                     // "gpt-4", "claude-3-opus", etc.
  maxTokens?: number;
  temperature?: number;
  retryAttempts?: number;
  timeout?: number;
}

interface AiProvider {
  id: string;
  label: string;
  isExternal: boolean;
  
  run(request: AiRunRequest): Promise<iAiRunResult>;
  
  // Optional streaming support
  runStreaming?(request: AiRunRequest, onChunk: (text: string) => void): Promise<AiRunResult>;
  
  // Health check
  ping?(): Promise<boolean>;
}
```

### 8.4 Smart Context Extraction

LLM получает не весь документ, а релевантный срез:

```typescript
interface ContextConfig {
  maxTokens: number;              // budget (e.g., 128k context / 4 = 32k tokens)
  includeAncestors: boolean;      // path from root to target
  includeSiblings: boolean;       // sibling nodes at same level
  includeDescendants: boolean;   // children, grandchildren, ...
  maxDepth: number;              // how deep to go
  
  // Content selection
  prioritizeBy: "recent" | "relevance" | "order";
  truncateMode: "end" | "head" | "head+tail";
}

// LLM видит:
// "Path: Root > Chapter 1 > Section A > [TARGET NODE]"
// "[TARGET NODE content]"
// "Children (3): [first child], [second child], ..."
```

### 8.5 AI Operations Registry

```typescript
const AI_OPERATIONS = {
  "expand-card": {
    label: "Expand with AI",
    description: "Generate child cards with AI",
    destructive: false,
    requiresConfirmation: false,
    icon: "Sparkles",
    defaultContext: { maxDepth: 2, includeAncestors: true, maxTokens: 8000 },
  },
  "rewrite-card": {
    label: "Rewrite with AI",
    description: "Rewrite card content",
    destructive: true,           // modifies existing content
    requiresConfirmation: true,
    icon: "RefreshCw",
    defaultContext: { maxDepth: 0, includeSiblings: true, maxTokens: 4000 },
  },
  "summarize-branch": {
    label: "Summarize branch",
    description: "Create summary of current branch",
    destructive: false,
    requiresConfirmation: false,
    icon: "FileText",
    defaultContext: { maxDepth: 5, includeAncestors: false, maxTokens: 12000 },
  },
  "ask-question": {
    label: "Ask AI",
    description: "Get answer about current context",
    destructive: false,
    requiresConfirmation: false,
    icon: "MessageCircle",
    defaultContext: { maxDepth: 3, includeAncestors: true, maxTokens: 16000 },
  },
} as const;
```

### 8.6 Plugin Storage API

Plugins can store their own data in isolated IndexedDB table:

```typescript
interface PluginStorageAPI {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

// Usage in plugin:
const storage = getPluginStorage("my-plugin-id");
await storage.set("last-run", Date.now());
await storage.set("user-preferences", { theme: "dark" });
```

Table naming: `plugin_{pluginId}_data` — isolated namespace per plugin.

### 8.7 UI Extension Points

Plugins can register UI at these points:

| Extension Point | Description | API |
|----------------|-------------|-----|
| `card-actions` | Buttons on floating action panel | `addCardAction(action)` |
| `card-context-menu` | Right-click menu items | `addContextMenuItem(item)` |
| `toolbar` | Extra buttons in Header | `addToolbarButton(button)` |
| `panel` | Side panel (like Settings) | `registerPanel(panel)` |
| `ai-operation` | New AI operation in palette | `registerAiOperation(op)` |
| `shortcut` | Keyboard shortcut | `registerShortcut(keys, handler)` |

### 8.8 Security Model

```
┌─────────────────────────────────────────────────────┐
│                    Main App                         │
│  - Full trust: React, Zustand, Dexie                │
│  - Implements policy engine                          │
│  - Validates ALL plugin operations before applying  │
│  - Enforces permissions from manifest               │
└─────────────────────────────────────────────────────┘
         ↑ validated operations only ↑
┌─────────────────────────────────────────────────────┐
│              Sandboxed Plugin (iframe)              │
│  - No direct DOM access                             │
│  - No access to localStorage (only plugin storage)   │
│  - Network only to whitelisted endpoints            │
│  - Cannot read nodes without read permission        │
│  - Cannot modify nodes without write permission    │
└─────────────────────────────────────────────────────┘
```

**Policy Enforcement:**
1. Plugin sends `{ type: "ai:run", operation: "expand-card", nodeId: "abc" }`
2. Main app checks: `manifest.permissions.nodes === "read-write"` ✓
3. Main app checks: `"expand-card"` in `manifest.aiOperations` ✓
4. Main app executes operation, sends result back
5. Plugin NEVER touches Zustand or Dexie directly

### 8.9 Migration Path (Incremental)

```
Phase 1 (MVP): Plugin SDK + manifest + iframe sandbox
  - Only text-generation plugins (no UI extensions)
  - One hardcoded provider (OpenAI)
  - Manual plugin loading (no store yet)

Phase 2: Plugin Store UI + review system
  - Plugin registry in IndexedDB
  - In-app plugin browser
  - Basic review/approval workflow for new plugins

Phase 3: Multiple providers + smart routing
  - Anthropic, Ollama, Azure OpenAI
  - Automatic fallback on failure
  - Cost tracking per provider

Phase 4: Real-time collaboration foundation
  - CRDT-based sync
  - Presence indicators
  - Conflict resolution UI
```

---

## 9. Заключение

**PuuNote 0.4** — это технически зрелый, хорошо структурированный проект с чистой архитектурой и продуманным дизайном. Код читается легко, разделение на слои соблюдено, критические функции (snapshot, undo/redo, export/import) реализованы надёжно.

Основные направления для улучшения:
1. **Производительность** — history slice и search cache требуют оптимизации для больших документов.
2. **Plugin API** — текущий foundation отличный, нужно довести до публичного SDK.
3. **UX polish** — keyboard flow отполирован хорошо, но детали (focus ring, confirmation dialogs, merge UX) требуют внимания.

Проект готов к переходу от "foundation для AI" к реальной AI-платформе. Предложенная архитектура plugin API сохраняет все текущие преимущества (local-first, изоляция операций, snapshot safety) и добавляет extension points без нарушения существующей структуры.