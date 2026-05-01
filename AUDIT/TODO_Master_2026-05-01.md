# PuuNote — Сводный TODO-чеклист

> Источники: аудиты Antigravity, GPT-4o, big-pickle, minimax-m2.7 (2026-05-01)  
> Формат: `- [ ]` не сделано · `- [/]` в процессе · `- [x]` готово

---

## 🔴 БАГИ (реальные, воспроизводимые)

- [x] **BUG-1 · `moveNodes` — дублирование узлов в массиве**  
  `documentTree.ts:321-363` — после `[...withoutMoving, ...movingNodes]` перемещённые узлы попадают в итоговый массив дважды. `normalizeSiblingOrder` фиксирует порядок, но не удаляет дубли. Нужно пересобирать массив без дублей перед нормализацией.

- [x] **BUG-2 · `deleteFile` race при удалении последнего документа**  
  `useFileSystem.ts:414-424` — `createNewFile()` и фильтрующий `setState` могут конкурировать, потенциально выбросив только что созданный файл. Нужен единый атомарный `setState` с новым документом.

- [x] **BUG-3 · `deleteNodesPromoteChildren` — потеря точности float в orderKey**  
  `documentTree.ts:188-189` — при 3+ уровнях цепочки удалённых родителей `key += val / Math.pow(1000, index)` теряет точность. Нужна лексикографическая сортировка по массивам `[order0, order1, ...]` вместо float-encoding.

- [x] **BUG-4 · После paste не устанавливается `activeId`**  
  `useAppHotkeys.ts:246-264` — вставленные карточки не получают фокус. Пользователь не видит результат до ручного клика. После `setNodes` нужно ставить `activeId` на первый новый узел.

- [x] **BUG-5 · D&D: `draggedId` зависает если пользователь уходит из окна**  
  `Card.tsx` — если переключить вкладку во время drag, `dragend` не срабатывает в текущем окне, и `draggedId` застревает в сторе. Нужен `window.addEventListener('dragend', () => setDraggedId(null))` в App.tsx.

- [x] **BUG-6 · `restoreSnapshot` не сбрасывает `editingId`**  
  `snapshots.ts:88-89` — при восстановлении снепшота во время редактирования карточки `editingId` указывает на несуществующий узел. Нужно добавить `editingId: null` в setState при restore.

- [x] **BUG-7 · `revokeObjectURL` timeout слишком мал (100ms)**  
  `browserDownload.ts:15` — на медленных устройствах браузер может не успеть начать скачивание. Увеличить до 5000ms или вызывать revoke в обработчике клика.

- [x] **BUG-8 · `restoreSnapshot` оставляет пользователя без активного узла**  
  `snapshots.ts:89` — `setActiveId(null)` после restore оставляет пустой экран без навигации. Нужно устанавливать `activeId` на корневой узел восстановлённого документа.

- [x] **BUG-9 · FloatingCardActions: keyboard-triggered панель скрывается через hide-timer**  
  `FloatingCardActions.tsx` — при нажатии Space панель появляется, но 220ms hide-timer всё равно срабатывает до клика мышью. При keyboard trigger панель должна фиксироваться до явного действия (клик, Escape, навигация).

- [x] **BUG-10 · `parseMindMapFormat` скрыто удаляет blockquotes**  
  `markdownParser.ts:413` — `n.content.replace(/^\s*>/gm, "")` убирает `>` без предупреждения пользователя. Blockquote вставляется, а молча исчезает. Документировать или сохранять как metadata/note.

- [x] **BUG-11 · Race condition при переключении файлов**  
  `useFileSystem.ts:285-334` — `isHydratingFile` модульная переменная. Если пользователь быстро переключает файлы, load/save могут перекрыться. Нужен `AbortController` для `switchFile`.

- [x] **BUG-12 · Хрупкая эвристика парсинга Markdown**  
  `markdownParser.ts:198-205` — Если обычный Markdown-документ начинается с `---`, он ошибочно парсится как PuuNote-экспорт. Нужно проверять `type: puunote-export` или второй `---`.

- [x] **BUG-13 · Отсутствует ErrorBoundary для корневых UI-модулей**  
  `App.tsx:195-205` — ErrorBoundary есть только у карточек. Ошибка в CommandPalette, SettingsPanel или FloatingCardActions скрашит всё приложение.

- [x] **BUG-14 · Отсутствует `upgrade()` handler в Dexie**  
  `db.ts:31-39` — Миграция v1→v2 не имеет fallback. Если у пользователя старая схема, база может повредиться.

---

## 🟡 ПРОИЗВОДИТЕЛЬНОСТЬ

- [x] **PERF-1 · `activeAncestorPath.includes()` — O(N×k) на каждый рендер**  
  `App.tsx:199` — для каждой карточки вызывается `.includes()` по массиву пути. Нужно один раз конвертировать в `Set` через `useMemo` и передавать вниз: `activeAncestorSet.has(node.id)`.

- [x] **PERF-2 · `buildTreeIndex` вызывается дважды за цикл**  
  `App.tsx:89` + `useBoardLayout.ts:95` — индекс строится в App (мемоизировано), но `useColumns` строит его заново. Нужно передавать готовый `treeIndex` как аргумент в `useColumns`.

- [x] **PERF-3 · CommandPalette грузит ВСЕ документы при открытии**  
  `documentService.ts:281-308` — `getSearchNodes` делает `db.files.toArray()` (все документы!) каждый раз при открытии палитры. При 50 документах × 1000 узлов — 50K записей в памяти. Нужен инкрементный индекс или ограничение.

- [x] **PERF-4 · `computeDescendantIds` пересобирает индекс на каждый keydown**  
  `useAppHotkeys.ts:451` — при Delete/Backspace вызывается без кеша. Использовать уже мемоизированный `treeIndex` из App.tsx.

- [x] **PERF-5 · 11 store-селекторов на каждую карточку**  
  `Card.tsx:81-96` — `useShallow` с 11 полями проверяется при любом изменении стора для каждой карточки. Разделить на два: визуальный стейт (isActive, isEditing...) и колбэки (стабильны).

- [x] **PERF-6 · `buildTreeIndex` вызывается на каждый shift-click**  
  `selectionSlice.ts` (`selectRange`) — O(n) операция на каждое действие выделения. Использовать закешированный `TreeIndex` или `useMemo`.

- [x] **PERF-7 · Утечка памяти в clipboard cache**  
  `useAppHotkeys.ts:102-130` — `lastCopiedCards` не имеет LRU-лимита. Если скопировать 5000 узлов, они зависнут в памяти на 2 минуты. Нужен лимит размера.

---

## 🟡 ДУБЛИРОВАНИЕ И DEAD CODE

- [ ] **DUP-1 · Три копии prose-классов с 70% общего кода**  
  `proseClasses.ts` — `PROSE_CARD`, `PROSE_FULL`, `PROSE_TIMELINE` повторяют headings, links, code, hr стили. Извлечь `PROSE_BASE` и композировать: `cn(PROSE_BASE, PROSE_CARD_SPECIFIC)`.

- [ ] **DUP-2 · `orderedChildren` определена в трёх местах**  
  `useBoardLayout.ts:6-13`, `tree.ts:22-28`, `documentTree.ts:28-29` — одна и та же сортировка по `order`. Унифицировать в `tree.ts`, остальные — удалить.

- [ ] **DUP-3 · Паттерн outside-click дублируется**  
  `Header.tsx:57-69`, `CommandPalette.tsx` — идентичный `useEffect` + `pointerdown` + `ref.contains`. Создать хук `useClickOutside(ref, handler)`.

- [ ] **DUP-4 · Паттерн `let newId; setNodes(prev => { newId = ...; })` × 5 раз**  
  `documentSlice.ts` — одинаковая конструкция для capture newId/newNodes из setNodes. Вынести в helper `applyAndCapture(operation)`.

- [ ] **DEAD-1 · `focusModeScope` — хранится, показывается, но нигде не читается**  
  `uiSlice.ts` — значения `single`/`branchLevel`/`column` есть в UI Settings, но ни один компонент не использует их. Реализовать или убрать.

- [ ] **DEAD-2 · `editorMode` — `visual` режим не реализован**  
  `uiSlice.ts` — опция `visual` отображается в настройках, но редактор всегда `markdown`. Убрать из UI до реализации.

- [ ] **DEAD-3 · `computeAncestorPath` (без Index) — мёртвый код**  
  `tree.ts:49-54` — везде используется `computeAncestorPathFromIndex`. Wrapper-версия строит индекс заново и нигде не импортируется. Удалить или пометить `@deprecated`.

- [ ] **DEAD-4 · `getOrderedChildren` — экспортируется, но нигде не импортируется**  
  `tree.ts:88-93` — удалить.

- [ ] **DEAD-5 · `unfocusedDepthLimit` — параметр без реализации**  
  `useBoardLayout.ts:19` — есть в сигнатуре, вычисления не зависят от него. Реализовать или удалить из API.

- [ ] **DEAD-6 · `idCounter` fallback для `crypto.randomUUID`**  
  `id.ts` — все браузеры, поддерживающие React 19, имеют `crypto.randomUUID`. Fallback-ветка никогда не исполняется. Удалить или оставить как есть (безвредно).

- [ ] **DUP-5 · `isQuotaError` проверка дублируется в двух местах**  
  `useFileSystem.ts:17-19` и `snapshots.ts:43-44` — одна и та же логика `err.name === "QuotaExceededError"`. Вынести в `utils/storage.ts` и переиспользовать.

- [ ] **DEAD-7 · Ненужные опции компилятора в `tsconfig.json`**  
  Опции `experimentalDecorators` и `useDefineForClassFields: false` включены, но декораторы не используются.

- [ ] **DEAD-8 · Избыточные префиксы `fullscreenchange`**  
  `App.tsx:68-86` — 4 обработчика (webkit, moz, MS). В 2026 году достаточно стандартного `fullscreenchange`.

---

## 🟡 АРХИТЕКТУРА

- [x] **ARCH-1 · Plugin emit'ы дублируются в каждом методе documentSlice**  
  `documentSlice.ts` — `PluginRegistry.emitNodeCreated/Updated/Deleted` вызывается 8+ раз вручную. Нужен Zustand middleware, который diff'ит `nodes` до/после `setNodes` и вызывает нужные события автоматически.

- [x] **ARCH-2 · Module-level mutable state в нескольких модулях**  
  `useFileSystem.ts:9-13`, `useAppHotkeys.ts:107` — переменные `pendingSave`, `isHydratingFile`, `lastCopiedCards` существуют на уровне модуля. Проблемы с HMR, тестируемостью и SSR. Инкапсулировать в классы или перенести в store.

- [x] **ARCH-3 · `aiOperations.ts` вызывает `useAppStore.getState()` внутри domain-функции**  
  `aiOperations.ts:44` — domain-слой не должен знать о store. Передавать `nodes` как параметр из вызывающего кода.

- [x] **ARCH-4 · `App.tsx` слишком большой (277 строк, 4 зоны ответственности)**  
  Извлечь: `BoardView` (рендер колонок), `ImportHandler` (drag-n-drop импорт файла), оставить в App только инициализацию и композицию.

- [x] **ARCH-5 · История undo не ограничена по размеру**  
  `historySlice.ts` — `past: PuuNode[][]` растёт без предела. При активной работе может занять сотни МБ. Добавить `MAX_HISTORY_SIZE = 50` с вытеснением старых записей.

- [x] **ARCH-6 · `async init()` без cancellation flag**  
  `useFileSystem.ts:95-164` — если компонент размонтируется во время async init, `setNodesRaw` вызовется на мёртвый компонент. Добавить `let cancelled = false` + guard.

- [x] **ARCH-7 · `AiProviderRegistry` нет метода `unregister`**  
  `aiProvider.ts:102-115` — плагин может зарегистрировать провайдер, но отозвать нельзя. При HMR и будущем plugin marketplace — утечка. Добавить `unregister(id: string)`.

- [x] **ARCH-8 · History `.slice(-50)` пересоздаёт массив при каждом изменении**  
  `historySlice.ts:39` — `[...past, current].slice(-50)` создаёт два новых массива каждую операцию. Заменить: `if (past.length >= 50) past = past.slice(1); past.push(current)` (или через immer).

- [x] **ARCH-9 · Mixed UI state в одном `uiSlice`**  
  `uiSlice.ts` содержит theme, colWidth, focusModeScope. Изменение theme вызывает ререндер компонентов, зависящих только от colWidth. Разделить слайсы.

- [x] **ARCH-10 · Мутируемые Ref в `useBoardLayout`**  
  `useBoardLayout.ts:123-159` — мутация `colRefs.current` внутри useEffect — антипаттерн React (риск рассинхронизации). Использовать useState или ref-копии.

---

## 🟡 UX / UI

- [ ] **UX-1 · Undo/Redo сбрасывает activeId в null**  
  `useAppHotkeys.ts:304-314` — после undo выделение снимается, keyboard navigation перестаёт работать. Нужно восстанавливать `activeId` (первый узел состояния или последний взаимодействованный).

- [ ] **UX-2 · CommandPalette: нет `scrollIntoView` при навигации стрелками**  
  `CommandPalette.tsx:211-231` — при длинном списке активный элемент уходит за границу видимости. Добавить `element.scrollIntoView({ block: 'nearest' })` при смене `activeIndex`.

- [ ] **UX-3 · CommandPalette: 300ms debounce без индикатора**  
  `CommandPalette.tsx:103-118` — пользователь не понимает, идёт ли поиск. Показывать spinner/«Поиск...» в момент ожидания.

- [ ] **UX-4 · Toolbar-кнопки недоступны на touch-устройствах**  
  `Card.tsx:212` — `opacity-0 group-hover/edit:opacity-100` — на touch-экранах hover нет. При `isEditing` и `pointer: coarse` показывать кнопки всегда.

- [ ] **UX-5 · Export меню не закрывается по Escape**  
  `Header.tsx` — только outside-click. Добавить keydown-handler на Escape.

- [ ] **UX-6 · FloatingCardActions ищет DOM-элемент по ID в rAF**  
  `FloatingCardActions.tsx:96` — `document.getElementById('card-'+activeId)` в цикле requestAnimationFrame. При виртуализации в будущем сломается. Перейти на ref-callback из Card.

- [ ] **UX-7 · Нет loading states для async операций**  
  Импорт файла (`App.tsx:121-153`), поиск в CommandPalette, открытие Timeline — нет skeleton или spinner. Добавить минимальные индикаторы.

- [x] **UX-8 · Кнопки +/- ширины колонки оставляют хвост**  
  `Footer.tsx:120-157` — кнопки `-` и `+` должны подбирать `colWidth` так, чтобы N колонок точно заполняли экран. Но из-за эпсилонов (`+0.1`/`-0.1`) при граничных значениях формула промахивается на 1 колонку, и справа остаётся пустое место. Нужна точная целочисленная формула: `colWidth = Math.floor(availableWidth / targetColumnCount) - GAP`.

- [ ] **UX-9 · Снепшоты без preview содержимого**  
  `SnapshotPanel.tsx` + `snapshots.ts` — снепшоты создаются автоматически перед каждой AI-операцией и вручную; при 25 штуках они выглядят одинаково (только timestamp). Добавить в `takeDocumentSnapshot` авто-суффикс со счётчиком узлов: «Before AI expand (47 cards)».

- [ ] **UX-10 · No focus ring на keyboard navigation**  
  Интерактивные элементы без `focus-visible:ring`. Добавить `focus-visible:ring-2 focus-visible:ring-app-accent` на все кнопки и ссылки.

- [ ] **UX-11 · Space в качестве хоткея для FloatingCardActions**  
  `useAppHotkeys.ts` — Пробел для панели действий неинтуитивен и конфликтует с обычным пробелом (даже с guard'ом). Переназначить на `.` или `f`.

---

## 🔒 БЕЗОПАСНОСТЬ

- [ ] **SEC-1 · `metadata` schema принимает произвольные данные без лимита размера**  
  `schema.ts:16` — `.catchall(z.unknown())` позволяет вредоносному импорту хранить гигабайты в метаданных. Добавить лимит глубины/размера или белый список ключей.

- [ ] **SEC-2 · `MAX_FILE_SIZE_BYTES` проверяется только при импорте, не при сохранении**  
  `documentService.ts:saveNodes` — пользователь может набить документ вручную до любого размера. Добавить проверку сериализованного размера перед записью в IndexedDB.

- [ ] **SEC-3 · `saveDirtyNodes` не обрабатывает `QuotaExceededError`**  
  `documentService.ts:240-244` — `JSON.stringify(nodes)` для большого документа может переполнить localStorage (лимит 5-10MB). Обернуть в try/catch с уведомлением пользователя.

- [ ] **SEC-4 · External links в Markdown без `rel="noopener noreferrer"`**  
  `SafeMarkdown.tsx` — rehype-sanitize блокирует XSS, но tracking pixels и фишинговые ссылки проходят. Добавить `rel="noopener noreferrer"` + предупреждение при переходе на внешний URL.

- [ ] **SEC-5 · `dirty-save` в `localStorage` вместо `sessionStorage`**  
  `documentService.ts:240-244` — dirty-save персистентен между сессиями и потенциально между вкладками. Использовать `sessionStorage` или добавить проверку timestamp (игнорировать если старше N минут).

- [ ] **SEC-6 · No rate limiting на AI операции**  
  `aiOperations.ts` — `JobRunner` не имеет лимита на количество одновременных/параллельных jobs. Buggy plugin может запустить тысячи jobs. Добавить `MAX_CONCURRENT_JOBS = 3`.

---

## 🤖 AI PLUGIN FOUNDATION (следующая фаза)

- [ ] **AI-1 · `window.PuuNote` — публичный фасад API**  
  Проксирует `documentApi` + `useAppStore` с Zod-валидацией входных данных. Минимальный набор: `addChild`, `updateNode`, `deleteNode`, `getNodes`, `getActiveNode`, `runJob`.

- [ ] **AI-2 · Реальные AI-провайдеры (OpenAI / Anthropic / Ollama)**  
  Реализовать через существующий `AiProvider` интерфейс. Хранение API ключей в IndexedDB (encrypted). Выбор провайдера в Settings.

- [ ] **AI-3 · Plugin Manifest Schema**  
  Zod-схема для манифеста плагина: `id`, `name`, `version`, `permissions[]`, `hooks[]`, `actions[]`. Валидация при регистрации.

- [ ] **AI-4 · Sandbox для пользовательских плагинов**  
  Web Worker с restricted global + `postMessage` API. Для trusted/local режима — `new Function()` с явным предупреждением.

- [ ] **AI-5 · Executable Cards (плагины внутри карточек)**  
  Карточки с тегом `[plugin]` содержат JS-код. Кнопка «Run» регистрирует плагин в `PluginRegistry`.

- [ ] **AI-6 · Streaming responses**  
  `AiProvider.run()` расширить до поддержки `AsyncIterable<Chunk>` для потоковой генерации с постепенным обновлением карточки.

- [ ] **AI-7 · Audit log**  
  Логировать все plugin actions (timestamp, pluginId, operation, nodeId) в отдельную Dexie-таблицу. Отображать в панели «Activity».

---

## 📊 Приоритеты на старт

| Приоритет | Задачи |
|-----------|--------|
| **Сначала** | BUG-1, BUG-3, BUG-4, BUG-8, BUG-9 |
| **Потом** | PERF-1, PERF-2, BUG-5, BUG-6, BUG-10, DEAD-1..DEAD-6, DUP-5, UX-1, UX-2, UX-8 |
| **Когда время есть** | ARCH-1..ARCH-8, SEC-1..SEC-6, UX-3..UX-13 |
| **Следующая фаза** | AI-1..AI-7 |
