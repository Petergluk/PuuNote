# Метааудит PuuNote

Дата: 2026-05-02  
Репозиторий: `/Users/petergluk/GitHub/PuuNote`  
Цель: собрать выводы всех аудитов из `AUDIT/`, проверить их по текущему коду и зафиксировать актуальный сводный аудит.

## 1. Источники

Проверены все Markdown-файлы в `AUDIT/`:

| Файл | Статус как источник |
|---|---|
| `MultiAudit_2026-05-01_ru.md` | Полезен как историческая консолидация, но часть P0 уже устарела. |
| `Audit_2026-05-01_gemini-pro-latest.md` | Полезен для UX/scroll-находок, но утверждение о чистой сборке было устаревшим уже в следующих аудитах. |
| `AI_Plugin_Backlog_2026-05-01_ru.md` | Актуален как отдельный backlog, не как список срочных дефектов. |
| `Audit_2026-05-02_GPT-5.md` | Самый полный аудит; часть пунктов уже исправлена в текущем коде. |
| `Audit_2026-05-02_gemini-3.1-pro-preview.md` | Полезен по WYSIWYG, AI/plugin, DnD и производительности; часть оценок завышена для текущего масштаба проекта. |

## 2. Фактическая проверка текущего состояния

Команды запускались на текущем дереве кода.

| Проверка | Результат |
|---|---|
| `npm run typecheck` | OK |
| `npm run test` | OK, 11 файлов, 55 тестов |
| `npm run lint` | OK, без warnings |
| `npm run build` | OK, но главный chunk `index-*.js` 743.59 kB minified / 243.21 kB gzip |
| `npm run format:check` | OK |
| `npm audit --audit-level=low` | 0 vulnerabilities |
| `npm outdated --long` | Есть устаревшие зависимости: Vite 6 -> 8, TypeScript 5.8 -> 6, lucide 0.546 -> 1.14, `@types/node` 22 -> 25 и др. |

Вывод: текущих P0-блокеров сборки/тестов нет. Главные риски сейчас не в том, что проект не запускается, а в надежности persistence edge cases, WYSIWYG-синхронизации, валидации импортов, масштабировании и product/security границах будущего AI/plugin слоя.

## 3. Что это сейчас за проект

PuuNote - браузерный local-first редактор нелинейных Markdown-документов. Документ состоит не из одного длинного текста, а из дерева карточек. Корневые мысли находятся слева, дочерние уточнения раскрываются вправо в соседних колонках. По продуктовой модели это ближе к Gingko/outliner/mind-map редактору, чем к обычному Markdown editor.

Типовые сценарии:

- планирование статей, книг, сценариев и проектов;
- конспекты и декомпозиция сложных тем;
- нелинейная работа с идеями;
- импорт/экспорт Markdown и JSON;
- локальные снапшоты перед опасными операциями;
- экспериментальные AI-команды и будущая plugin-платформа.

Проект уже выглядит как рабочий local-first прототип с хорошим фундаментом, но еще не как полностью надежный публичный редактор для больших личных архивов.

## 4. Как проект устроен

### 4.1 Стек

- React 19, TypeScript, Vite.
- Zustand для глобального состояния.
- Dexie/IndexedDB для локального хранения документов, файлов и снапшотов.
- Tailwind CSS 4, CSS variables для тем.
- `react-markdown`, `remark-gfm`, `remark-breaks`, `rehype-sanitize` для безопасного Markdown-render.
- Tiptap для WYSIWYG-режима.
- `react-virtuoso` для Timeline view.
- Fuse.js для поиска в Command Palette.
- Zod для валидации импортируемых/сохраненных nodes.
- Sonner для toast-сообщений.
- i18next/react-i18next для RU/EN интерфейса.

### 4.2 Модель данных

Основная структура - плоский массив `PuuNode[]`:

- `id`: идентификатор карточки;
- `content`: Markdown-содержимое;
- `parentId`: связь с родителем или `null`;
- `order`: порядок среди соседей;
- `metadata`: поля для AI/plugin и будущих расширений.

Документ (`PuuDocument`) хранится отдельно:

- `id`;
- `title`;
- `updatedAt`;
- `metadata`.

Дерево восстанавливается через `buildTreeIndex(nodes)`: строятся `nodeMap` и `childrenMap`, затем UI получает колонки или depth-first список.

### 4.3 Основные слои

- `src/store/useAppStore.ts` собирает Zustand store из слайсов.
- `src/store/slices/historySlice.ts` хранит `nodes`, undo/redo и эмитит plugin events.
- `src/store/slices/documentSlice.ts` содержит команды над карточками: add/delete/move/split/merge/export.
- `src/store/slices/selectionSlice.ts` управляет active/selected/editing/drag/fullscreen.
- `src/store/slices/uiSlice.ts` хранит настройки интерфейса.
- `src/domain/documentTree.ts` - доменные операции дерева.
- `src/domain/documentService.ts` - IndexedDB, legacy migration, dirty backup, search cache.
- `src/db/db.ts` и `src/db/snapshots.ts` - Dexie schema и снапшоты.
- `src/utils/markdownParser.ts` - Markdown/clipboard import/export.
- `src/hooks/useFileSystem.ts` - init, autosave, переключение документов, dirty backup, создание/удаление файлов.
- `src/components/BoardView.tsx` - основное горизонтальное дерево.
- `src/components/Card.tsx` - карточка, editing, DnD.
- `src/components/TimelineView.tsx` - линейный режим.
- `src/components/WysiwygEditor.tsx` - Tiptap visual editor.
- `src/domain/aiProvider.ts`, `aiOperations.ts`, `jobRunner.ts`, `plugins/registry.ts` - экспериментальный AI/plugin/job foundation.

### 4.4 Runtime-поток

1. `App` вызывает `useFileSystemInit()` и `usePreferencesInit()`.
2. `DocumentService` мигрирует legacy localStorage, читает список документов из IndexedDB и выбирает active file.
3. Активный файл загружается в Zustand через `setNodesRaw`.
4. `BoardView` строит tree index, active path и колонки.
5. Карточка отображает `SafeMarkdown` либо редактор: `AutoSizeTextarea` или `WysiwygEditor`.
6. Изменения идут через `documentApi` в `setNodes`.
7. `useFileSystem` подписан на `nodes/activeFileId` и с debounce сохраняет в IndexedDB.
8. Перед закрытием/скрытием вкладки есть dirty backup в `sessionStorage` и flush pending save.
9. Импорт создает новый документ, экспорт скачивает Markdown/JSON.
10. AI-команда сейчас использует mock provider, создает snapshot и добавляет дочерние draft-карточки.

## 5. Как видится дальнейшее развитие

### Этап 1. Надежность данных

Сначала нужно закрыть edge cases сохранения, загрузки и восстановления. Для local-first редактора это важнее новых функций.

Приоритет:

1. Убрать гонку инициализации autosave.
2. Добавить persistence tests.
3. Исправить duplicate id repair без потери nodes.
4. Сделать delete/restore операции атомарнее и понятнее.

### Этап 2. Цельность редактора

После persistence стоит выровнять поведение Markdown и WYSIWYG:

- синхронизация Tiptap с внешним состоянием;
- round-trip тесты Markdown -> WYSIWYG -> Markdown;
- понятные ограничения GFM в visual mode;
- нормальная link form вместо `window.prompt`;
- доступная toolbar-навигация.

### Этап 3. Масштабирование

Если PuuNote должен держать тысячи карточек:

- пересмотреть хранение `nodes` только как массива;
- ограничить память undo/redo;
- виртуализировать BoardView или включать performance mode;
- оптимизировать Markdown parser;
- убрать mutable side effects из `TreeIndex`.

### Этап 4. Product polish

- полный i18n pass;
- accessibility pass;
- более сильный empty state;
- mobile/touch/keyboard alternatives для DnD;
- понятная документация ограничений.

### Этап 5. AI/plugin как отдельный продуктовый слой

Текущий слой правильнее считать foundation. Перед реальными внешними AI-провайдерами и плагинами нужны:

- явный consent и preview отправляемого контекста;
- patch/diff approval model;
- политика API keys;
- plugin manifest;
- permissions;
- sandbox;
- transaction API вместо прямого доступа к Zustand;
- audit log.

## 6. Актуальные проблемы

Критичность:

- **P0** - текущий блокер сборки/запуска/релиза. Сейчас подтвержденных P0 нет.
- **P1** - риск потери данных или явно сломанного ключевого сценария; лучше чинить ближайшим циклом.
- **P2** - важная проблема устойчивости, UX, доступности или масштабирования; можно жить в прототипе, но не стоит нести в публичный релиз.
- **P3** - hygiene/polish/future-proofing; можно отложить.

### Быстрый список по приоритетам

#### P0

- [x] Подтвержденных P0 сейчас нет: `test`, `typecheck`, `lint`, `build` проходят.

#### P1

- [x] P1-1. Гонка инициализации может сохранить пустой `nodes` поверх загруженного документа.
- [x] P1-2. WYSIWYG/Tiptap не синхронизируется с внешним состоянием.
- [x] P1-3. Duplicate id repair теряет данные.
- [x] P1-4. `deleteFile()` меняет UI даже если удаление из IndexedDB упало.

#### P2

- [x] P2-1. `deleteNode()` может зациклиться на циклическом дереве.
- [x] P2-2. Пустой документ частично поддержан, но snapshots/import все еще считают пустоту ошибкой.
- [x] P2-3. Поиск в Command Palette может не видеть несохраненные изменения активного документа.
- [ ] P2-4. Undo/redo хранит полные снимки всего документа. Частично улучшено: текстовый ввод теперь группируется, но память все еще хранит полные `PuuNode[]`.
- [ ] P2-5. BoardView рендерит все карточки без virtualization.
- [ ] P2-6. Обновление текста проходит через `nodes.map` по всему массиву.
- [x] P2-7. `TreeIndex` mutable cache может портиться побочными эффектами.
- [x] P2-8. Markdown parser имеет O(n^2) подсчет `order`.
- [x] P2-9. Production bundle слишком большой. Main chunk уменьшен примерно с 749 kB до 148 kB; WYSIWYG/Tiptap вынесен в lazy chunks.
- [x] P2-10. WYSIWYG не равен полной GFM-поддержке: README теперь явно ограничивает visual mode; полную GFM parity сознательно не делали.
- [ ] P2-11. I18n неполный.
- [ ] P2-12. Accessibility карточек, DnD и WYSIWYG toolbar неполная.
- [x] P2-13. `npm run dev` слушает LAN по умолчанию.
- [x] P2-14. Внешний Google Fonts запрос ослабляет offline/private историю.
- [ ] P2-15. Plugin foundation пока небезопасен как публичная plugin-платформа.
- [ ] P2-16. AI-команда выглядит как продуктовая фича, но это mock-only.
- [x] P2-17. Validation иногда молча чинит данные с потерей смысла.
- [x] P2-18. `format:check` падает.
- [x] P2-19. ESLint слишком мягкий для текущей сложности проекта. Базово усилено: ключевые warnings подняты до errors, добавлены правила против implicit coercion/var и unused disable.
- [x] P2-20. Нет тестов на самые рискованные persistence-сценарии. Добавлены regression tests на autosave flush/error, delete failure/success и switchFile flush/failure.

#### P3

- [ ] P3-1. Timeline click-to-edit отличается от BoardView.
- [ ] P3-2. Scroll/layout BoardView хрупкий.
- [x] P3-3. Формула ширины колонок конфликтует с padding. CSS и footer теперь используют единый gutter 32px; добавлен auto-fit по глубине документа.
- [ ] P3-4. DnD `dropTarget` зависит от React state и часто ререндерит.
- [ ] P3-5. Shift-select сложный и частично дорогой.
- [ ] P3-6. Paste вне editing всегда вставляет как children активной карточки.
- [ ] P3-7. Merge Markdown наивно склеивает блоки.
- [ ] P3-8. Zen/fullscreen поведение неочевидно.
- [ ] P3-9. README частично расходится с кодом.
- [ ] P3-10. Config/tooling hygiene.
- [ ] P3-11. Security headers/CSP не настроены.
- [ ] P3-12. Зависимости устарели, но уязвимости не найдены.

### [x] P1-1. Гонка инициализации может сохранить пустой `nodes` поверх загруженного документа

Файлы: `src/hooks/useFileSystem.ts:169-202`, `src/hooks/useFileSystem.ts:212-255`, `src/store/slices/historySlice.ts:37-44`.

Актуальность: подтверждено по текущему коду.

Что происходит: store стартует с `nodes: []`. В `init()` сначала выставляется `activeFileId`, а `fsManager.isHydratingFile = true` включается только позже, перед `setNodesRaw(newNodes)`. Подписка на Zustand уже активна и может запланировать save текущего пустого массива. Последующая hydration обновляет `fsManager.nodes`, но не отменяет старый timer, а callback `scheduleSave` замкнул старый `nodes`.

Почему это проблема: при неудачном тайминге существующий файл может быть перезаписан пустым массивом. Для редактора заметок это один из самых неприятных классов ошибок.

Решение: включать hydration guard до `setState({ activeFileId })`; устанавливать `activeFileId` и `nodes` одним атомарным store update; при hydration отменять pending timer; в `scheduleSave` читать актуальные `fsManager.nodes`, а не замкнутый массив; добавить тест lifecycle init/autosave.

Риски решения: легко сломать switchFile/createNewFile autosave, если сделать guard слишком широким. Нужны тесты на init, switchFile, createFile, dirty restore и pending save.

Можно жить сейчас: нежелательно. Это P1.

### [x] P1-2. WYSIWYG/Tiptap не синхронизируется с внешним состоянием

Файл: `src/components/WysiwygEditor.tsx:42-76`.

Актуальность: подтверждено. `content: initialValue` передается в `useEditor` при создании editor instance, но нет `useEffect`, который обновляет Tiptap при изменении `initialValue`.

Почему это проблема: undo/redo, AI-операции, restore snapshot или внешнее изменение карточки могут изменить Zustand, но открытый visual editor визуально останется на старом тексте. Пользователь может продолжить редактировать stale DOM и перезаписать корректное состояние.

Решение: добавить controlled-sync: сравнивать новый `initialValue` с текущим markdown Tiptap и вызывать `editor.commands.setContent(...)` только при реальном внешнем изменении. Для активного набора текста нужна защита от update-loop и сохранение selection.

Риски решения: возможны прыжки курсора, потеря undo stack Tiptap и циклы `setContent -> onUpdate -> onChange`. Это нужно делать аккуратно и покрыть component/integration tests.

Можно жить сейчас: только если visual mode считать экспериментальным. Для включенной настройки это P1.

### [x] P1-3. Duplicate id repair теряет данные

Файлы: `src/utils/schema.ts:76-85`, `src/domain/documentService.ts:65-99`.

Актуальность: подтверждено.

Что происходит: `validateNodesWithReport()` сначала складывает nodes в `Map` по `id`. При дубле предыдущая node перезаписывается последней. Затем `normalizeNodesWithReport()` пытается регенерировать duplicate id, но дубль уже потерян.

Почему это проблема: импорт/clipboard/legacy migration могут молча потерять карточку. Отчет пишет, что id deduplicated, но не сохраняет обе node.

Решение: repair делать последовательным проходом до `Map`: при повторном id генерировать новый id, вести remap, аккуратно обновлять parent references там, где можно. Если parent references неоднозначны, лучше показать warning и явно сказать, что именно отброшено.

Риски решения: у дублей невозможно всегда корректно понять, к какой исходной node относились дети. Нужна понятная политика и тесты на duplicate parent references.

Можно жить сейчас: плохо для надежного импорта. P1.

### [x] P1-4. `deleteFile()` меняет UI даже если удаление из IndexedDB упало

Файл: `src/hooks/useFileSystem.ts:429-463`.

Актуальность: подтверждено.

Что происходит: `DocumentService.deleteDocument(fileId)` обернут в `try/catch`, но после catch нет `return`. UI удаляет документ из списка и может переключить активный файл, хотя в DB документ остался.

Почему это проблема: UI и IndexedDB расходятся. Пользователь думает, что файл удален, а после reload он может вернуться.

Решение: после ошибки удаления делать `return`; либо сначала оптимистично менять UI, но при ошибке откатывать state.

Риски решения: при transient IndexedDB ошибке документ останется в списке. Это правильнее, чем ложное удаление, но нужен actionable toast.

Можно жить сейчас: лучше починить ближайшим циклом. P1/P2.

### [x] P2-1. `deleteNode()` может зациклиться на циклическом дереве

Файл: `src/domain/documentTree.ts:138-154`.

Актуальность: подтверждено. В `deleteNodes()` есть guard через `idsToRemove.has(curr)`, а в одиночном `deleteNode()` такого guard нет.

Почему это проблема: нормальная загрузка чинит циклы, но будущие plugins, прямой `setNodesRaw`, баги move/import или тестовые данные могут создать цикл. Тогда delete зависнет.

Решение: в `while` добавить проверку `if (idsToRemove.has(curr)) continue;`.

Риски решения: минимальные. Нужен regression-test.

Можно жить сейчас: да, если доверять validation, но фикс дешевый.

### [x] P2-2. Пустой документ частично поддержан, но snapshots/import все еще считают пустоту ошибкой

Файлы: `src/domain/documentService.ts:185-208`, `src/db/snapshots.ts:80-84`, `src/domain/documentExport.ts:113-118`, `src/domain/documentExport.ts:132-137`, `src/hooks/useFileImport.ts:23-29`.

Актуальность: частично подтверждено. Сохранение и загрузка `[]` теперь возможны, dirty backup тоже сохраняет `[]`. Но restore snapshot отвергает пустой snapshot, а import JSON/Markdown не создает документ, если nodes пустые.

Почему это проблема: продуктовый контракт не до конца зафиксирован. Если пустой документ валиден, все слои должны принимать `[]`. Если не валиден, UI не должен позволять удалить последнюю карточку без создания пустой.

Решение: явно выбрать контракт. Рекомендация: считать пустой документ валидным, но показывать нормальный empty state и не путать его с ошибкой загрузки.

Риски решения: нужно проверить BoardView, TimelineView, snapshots, export/import и activeId fallback.

Можно жить сейчас: да, если пустые документы редки, но контракт надо закрыть.

### [x] P2-3. Поиск в Command Palette может не видеть несохраненные изменения активного документа

Файлы: `src/components/CommandPalette.tsx:87-100`, `src/domain/documentService.ts:294-333`.

Актуальность: подтверждено.

Что происходит: при открытии палитры search nodes читаются из IndexedDB. Если пользователь только что изменил активную карточку, debounce-save еще мог не пройти.

Почему это проблема: поиск по только что написанному тексту может ничего не найти.

Решение: перед построением search index делать `flushPendingSave()` и `flushPendingTextareas()`, либо для активного документа брать `useAppStore.getState().nodes`, а не DB.

Риски решения: sync flush при открытии палитры может добавить задержку; лучше комбинировать active in-memory nodes + DB для остальных документов.

Можно жить сейчас: можно, но UX заметный.

### [ ] P2-4. Undo/redo хранит полные снимки всего документа

Файл: `src/store/slices/historySlice.ts:46-67`, `src/store/slices/historySlice.ts:70-91`.

Актуальность: подтверждено.

Почему это проблема: каждое изменение кладет весь `PuuNode[]` в history, лимит 50 состояний. На больших документах и при visual editor updates это быстро станет памятью и GC-проблемой.

Решение: группировать изменения во время edit session; хранить patches/operations; ограничивать историю по размеру; не писать noop-изменения.

Риски решения: undo/redo станет сложнее. Нужны тесты на все document commands.

Можно жить сейчас: да для малых документов, нет для больших архивов.

### [ ] P2-5. BoardView рендерит все карточки без virtualization

Файлы: `src/components/BoardView.tsx:62-96`, `src/hooks/useBoardLayout.ts:52-68`.

Актуальность: подтверждено.

Почему это проблема: Timeline виртуализирован через Virtuoso, а BoardView строит все колонки и все карточки. Тысячи nodes дадут много DOM, дорогие layout/scroll/hover операции и общий лаг.

Решение: performance mode для больших документов; auto-hide inactive branches; виртуализация карточек внутри колонок; профилирование на 1k/10k nodes.

Риски решения: сложно совместить virtualization, DnD, scroll alignment и floating actions.

Можно жить сейчас: да, если документы небольшие.

### [ ] P2-6. Обновление текста проходит через `nodes.map` по всему массиву

Файл: `src/domain/documentTree.ts:88-91`.

Актуальность: подтверждено.

Что происходит: обновление одной карточки пересоздает массив через `nodes.map`. Markdown textarea сейчас debounced, но visual editor вызывает `onChange` на Tiptap updates.

Почему это проблема: на тысячах nodes каждое изменение текста будет O(n) по массиву и может запускать пересчеты derived данных.

Решение: не обязательно сразу переписывать все на `Record`. Более прагматичный путь: сначала batching edit sessions, selectors/memo, performance mode. Нормализованное хранение `nodesById + childrenIds` рассмотреть позже как крупную миграцию.

Риски решения: полная нормализация затронет почти весь код: import/export, store, tree helpers, tests, plugins.

Можно жить сейчас: да для прототипа; для больших документов это станет P1.

### [x] P2-7. `TreeIndex` mutable cache может портиться побочными эффектами

Файлы: `src/utils/tree.ts:8-29`, `src/utils/markdownParser.ts:54-61`.

Актуальность: снято для `exportNodesToMarkdown()`. Экспорт теперь сортирует копию массива children, не мутируя cached `childrenMap`.

Что происходит: `buildTreeIndex` кэширует последний `nodes` по ссылке. `childrenMap` содержит mutable arrays. `exportNodesToMarkdown()` берет массив children и сортирует его in-place.

Почему это проблема: derived структура выглядит как read-only, но экспорт может менять порядок массивов внутри cache. Это хрупко и может ломать будущие оптимизации.

Решение: в export сортировать копию: `[...(childrenMap.get(parentId) || [])].sort(...)`; подумать, нужен ли module-level cache или лучше memo/selector на уровне UI.

Риски решения: если просто убрать cache, можно ухудшить performance.

Можно жить сейчас: можно, но локальный fix дешевый.

### [x] P2-8. Markdown parser имеет O(n^2) подсчет `order`

Файл: `src/utils/markdownParser.ts:286`, `src/utils/markdownParser.ts:346-348`, `src/utils/markdownParser.ts:468`.

Актуальность: снято. Parser теперь ведет `Map<parentId, nextOrder>` вместо `imported.filter(...).length`.

Что происходит: для каждой новой node parser считает sibling order через `imported.filter(...).length`.

Почему это проблема: импорт больших Markdown-файлов может сильно замедляться.

Решение: вести `Map<parentId, nextOrder>`.

Риски решения: нужно не сломать порядок nested headings/lists/legacy format; нужны round-trip tests.

Можно жить сейчас: да для небольших импортов.

### [x] P2-9. Production bundle слишком большой

Файлы: `src/components/Card.tsx:7`, `src/components/TimelineView.tsx:13`, `src/components/FullScreenModal.tsx:7`, `vite.config.ts:14-33`.

Актуальность: закрыто. После lazy-load `WysiwygEditor` и ручного chunking `npm run build` больше не дает chunk warning; главный chunk уменьшен примерно до 148 kB minified.

Почему это проблема: Tiptap/WYSIWYG и часть тяжелых зависимостей попадают в основной путь. Первичная загрузка хуже, особенно на мобильных.

Решение: `WysiwygEditor` загружается через `React.lazy`; Tiptap и ProseMirror вынесены в отдельные chunks; search/virtualization/autosize/state тоже отделены от main.

Риски решения: lazy editor нужно наблюдать в visual mode: autofocus и split уже проходят type/build checks, но ручной smoke полезен.

Можно жить сейчас: да.

### [x] P2-10. WYSIWYG не равен полной GFM-поддержке

Файлы: `README.md`, `src/components/WysiwygEditor.tsx:42-50`.

Актуальность: решено документационно. README больше не обещает, что visual mode является полной GFM-заменой; Markdown-render и visual editor описаны отдельно.

Что происходит: render поддерживает GFM, но Tiptap extensions покрывают не весь GFM. Таблицы и часть сложного Markdown могут исказиться при visual editing.

Почему это проблема: README обещает "полную поддержку GitHub Flavored Markdown" рядом с visual editor, а пользователь может потерять форматирование при round-trip.

Решение: либо добавить нужные Tiptap extensions, либо явно ограничить visual mode и предупреждать при неподдерживаемом Markdown.

Риски решения: полноценная GFM parity в Tiptap - отдельная задача.

Можно жить сейчас: да, если visual mode помечен как ограниченный.

### [ ] P2-11. I18n неполный

Файлы: `src/i18n.ts`, `src/components/SnapshotPanel.tsx:105-190`, `src/components/Footer.tsx:107-122`, `src/components/Footer.tsx:144-145`, `src/components/CommandPalette.tsx:317`, `src/App.tsx:115`.

Актуальность: подтверждено.

Примеры: `Snapshots`, `Create`, `Clear`, `No snapshots yet`, `Loading...`, `SELECTED`, `CARDS`, `WORDS`, `DEPTH`, `Searching...`, `Fit 3 columns`, `Loading timeline...` не везде проходят через существующие ключи.

Почему это проблема: при RU интерфейсе видна смесь языков или raw key, а aria/title тоже часто остаются на английском.

Решение: полный i18n pass по visible text, title, aria-label, placeholders и toast; добавить проверку на missing keys.

Риски решения: много мелких изменений, легко пропустить строки.

Можно жить сейчас: можно в прототипе, но перед релизом закрыть.

### [ ] P2-12. Accessibility карточек, DnD и WYSIWYG toolbar неполная

Файлы: `src/components/Card.tsx:148-209`, `src/components/WysiwygEditor.tsx:83-176`, `src/components/FloatingCardActions.tsx`.

Актуальность: подтверждено.

Что происходит: карточка - clickable/draggable `div` без роли и собственного keyboard focus. DnD в основном мышиный. WYSIWYG toolbar кнопки icon-only без `aria-label/title`.

Почему это проблема: клавиатурным пользователям и screen reader сложно управлять деревом и visual editor.

Решение: roving tabindex/role для карточек; keyboard action menu; move up/down/indent/outdent команды; `aria-label` для toolbar; jsx-a11y lint; axe smoke tests.

Риски решения: роли для дерева надо подобрать аккуратно, чтобы не ухудшить screen reader опыт.

Можно жить сейчас: можно для приватного прототипа, не для публичного инструмента.

### [x] P2-13. `npm run dev` слушает LAN по умолчанию

Файл: `package.json:7-8`.

Актуальность: подтверждено.

Что происходит: `dev` и `dev:lan` оба запускают `vite --host=0.0.0.0`.

Почему это проблема: local-first заметки могут стать доступны в локальной сети во время разработки.

Решение: сделать обычный `dev` localhost-only, `dev:lan` оставить отдельным осознанным режимом.

Риски решения: тестирование с телефона потребует запускать `npm run dev:lan`.

Можно жить сейчас: лучше исправить, fix дешевый.

### [x] P2-14. Внешний Google Fonts запрос ослабляет offline/private историю

Файл: `src/index.css:1`.

Актуальность: подтверждено.

Почему это проблема: local-first редактор при открытии делает внешний запрос к Google Fonts. Это хуже для offline, приватности и first render.

Решение: self-host font asset или перейти на system font stack.

Риски решения: изменится визуальный стиль.

Можно жить сейчас: можно, но для privacy-first позиционирования лучше убрать.

### [ ] P2-15. Plugin foundation пока небезопасен как публичная plugin-платформа

Файлы: `src/plugins/registry.ts`, `src/store/slices/historySlice.ts`, `AI_Plugin_Backlog_2026-05-01_ru.md`.

Актуальность: подтверждено.

Что есть: registry, node hooks, card action типы. Чего нет: manifest, permissions, sandbox, versioning, lifecycle, transaction API, storage boundaries.

Почему это проблема: если подключить сторонний код как plugin, он фактически получает слишком широкий доступ к пользовательским данным.

Решение: оставить формулировку "experimental foundation"; перед публичными plugins спроектировать manifest/permissions/sandbox/transactions.

Риски решения: полноценная plugin-платформа - отдельный проект, не быстрый рефакторинг.

Можно жить сейчас: да, пока сторонних plugins нет.

### [ ] P2-16. AI-команда выглядит как продуктовая фича, но это mock-only

Файлы: `src/components/CommandPalette.tsx:153-166`, `src/domain/aiOperations.ts:62-123`, `src/domain/aiProvider.ts:67-100`.

Актуальность: подтверждено.

Что происходит: команда `AI Draft Child Cards` всегда использует `mock-local` и генерирует шаблонные карточки. Реальных providers, consent, API keys, streaming, cost accounting нет.

Почему это проблема: пользователь может ожидать настоящий AI. При будущем внешнем provider появится риск отправки приватных заметок наружу.

Решение: явно маркировать команду как Demo/Mock или скрыть до настройки provider; перед внешним AI добавить preview контекста, consent, settings и audit log.

Риски решения: усложняется UX AI-команд, но это правильная цена за приватность.

Можно жить сейчас: да, если честно назвать mock.

### [x] P2-17. Validation иногда молча чинит данные с потерей смысла

Файл: `src/utils/schema.ts:18-23`.

Актуальность: снижено. Импорт теперь возвращает repair report, а UI показывает warning, если данные были нормализованы или часть nodes была пропущена.

Что происходит: `content: z.string().max(...).catch("")`, `order: z.number().optional().catch(0)` могут превратить некорректные данные в пустую строку/0.

Почему это проблема: при импорте пользователь может потерять содержимое без понятного отчета.

Решение: для user import показывать repair report; oversized/non-string content не превращать в пустоту без warning; различать legacy recovery и import validation.

Риски решения: более строгий импорт может отвергать старые поврежденные данные.

Можно жить сейчас: можно, но это data-quality debt.

### [x] P2-18. `format:check` падает

Файлы: 27 файлов по выводу Prettier.

Актуальность: снято. `npm run format` выполнен, `npm run format:check` проходит.

Почему это проблема: CI сейчас не ловит формат, review будет шумным, а при добавлении format check pipeline сразу станет красным.

Решение: отдельным mechanical commit выполнить `npm run format`; потом добавить `npm run format:check` в CI.

Риски решения: большой diff. Делать отдельно от функциональных фиксов.

Можно жить сейчас: да, если формат не в CI; лучше закрыть перед дальнейшими правками.

### [x] P2-19. ESLint слишком мягкий для текущей сложности проекта

Файл: `eslint.config.js:19-27`.

Актуальность: закрыто в базовом объеме. `no-explicit-any`, `no-unused-vars` и `react-refresh/only-export-components` подняты до errors; включены `eqeqeq`, `no-implicit-coercion`, `no-var`, `prefer-const`, `reportUnusedDisableDirectives`.

Почему это проблема: проект уже содержит persistence, WYSIWYG, plugins, DnD и local data. Мягкий lint пропускает риски, которые лучше ловить до runtime.

Решение: выполнен первый практический шаг без большого churn. Отдельным будущим hardening можно добавить type-aware rules и `eslint-plugin-jsx-a11y`.

Риски решения: более строгий lint может подсвечивать старые паттерны при будущих правках, но текущий `npm run lint` зеленый.

Можно жить сейчас: да.

### [x] P2-20. Нет тестов на самые рискованные persistence-сценарии

Файлы: `src/hooks/useFileSystem.ts`, `src/domain/documentService.ts`, `src/db/snapshots.ts`.

Актуальность: закрыто для главных regression-сценариев в текущей архитектуре.

Что покрыто: latest-state autosave, pending save flush success/error, delete failure без удаления UI state, switchFile flush перед загрузкой, switchFile failure без перетирания текущего документа, successful active delete с переходом на следующий файл.

Почему это проблема: именно persistence сейчас главный риск продукта, а тестов на него нет.

Решение: добавлены focused tests вокруг `FileSystemManager`, `flushPendingSave`, `switchFile`, `deleteFile`.

Риски решения: полный Dexie/IndexedDB integration набор по dirty backup/snapshots/quota все еще лучше делать отдельно с `fake-indexeddb`.

Можно жить сейчас: да.

### [ ] P3-1. Timeline click-to-edit отличается от BoardView

Файл: `src/components/TimelineView.tsx:139-172`.

Актуальность: подтверждено.

Что происходит: клик по node в Timeline делает ее active, а active node сразу становится editor. В BoardView один клик выбирает, double click/Enter редактирует.

Почему это проблема: пользователь может случайно войти в edit mode; поведение двух режимов расходится.

Решение: добавить отдельный editing state для Timeline или использовать общий `editingId`.

Риски решения: нужно не сломать scroll-to-active.

Можно жить сейчас: да.

### [ ] P3-2. Scroll/layout BoardView хрупкий

Файлы: `src/components/BoardView.tsx:70-72`, `src/hooks/useBoardLayout.ts:128-204`.

Актуальность: подтверждено.

Что происходит: используется большой `pb-[95vh]`, DOM queries `document.getElementById`, `querySelectorAll`, двойной `requestAnimationFrame` и ручная математика scrollTop.

Почему это проблема: возможны прыжки, "проваливание" и сложные регрессии при изменении верстки.

Решение: refs-based alignment, более явные spacers, возможно `scrollIntoView` там, где хватает.

Риски решения: текущая синхронизация колонок чувствительная; нужен visual smoke desktop/mobile.

Можно жить сейчас: да, если баг не воспроизводится.

### [x] P3-3. Формула ширины колонок конфликтует с padding

Файлы: `src/index.css:144-159`, `src/components/BoardView.tsx:70-72`, `src/components/Footer.tsx:153-158`.

Актуальность: закрыто.

Что было: на desktop `.column-container` имел `width: calc(var(--col-width) + 16px)`, но получал `px-4` (32px горизонтального padding), а `.column-inner` имел `width: var(--col-width)`.

Почему это проблема: возможны clipping/смещения, footer считает `GAP = 32`, а CSS использует `+16px`.

Решение: CSS и footer переведены на единую формулу `colWidth + 32px`; расчеты вынесены в `src/utils/columnSizing.ts`; добавлен auto-fit ширины по максимальной глубине документа при init/switch/create.

Риски решения: может поменяться ощущение плотности колонок, потому что раньше часть ширины фактически съедалась padding/overflow.

Можно жить сейчас: да.

### [ ] P3-4. DnD `dropTarget` зависит от React state и часто ререндерит

Файл: `src/components/Card.tsx:156-190`.

Актуальность: подтверждено.

Что происходит: `onDragOver` часто вызывает `setDropTarget`, а `onDrop` читает state, который может быть не самым свежим.

Почему это проблема: лишние ререндеры во время drag и риск drop не туда, куда пользователь видел в последний момент.

Решение: хранить last drop zone в ref, пересчитывать позицию прямо в `onDrop`, state оставить только для индикатора; позже рассмотреть `dnd-kit`.

Риски решения: нужно сохранить multi-select move и текущие top/right/bottom пороги.

Можно жить сейчас: да.

### [ ] P3-5. Shift-select сложный и частично дорогой

Файл: `src/store/slices/selectionSlice.ts:25-83`.

Актуальность: подтверждено.

Почему это проблема: cross-branch selection строит depth-first range, потом фильтрует родителей через повторные `state.nodes.filter`. Поведение трудно предсказать.

Решение: выбрать простую модель selection: sibling-range, plain depth-first range или path-range; закрепить тестами.

Риски решения: можно изменить привычный workflow.

Можно жить сейчас: да.

### [ ] P3-6. Paste вне editing всегда вставляет как children активной карточки

Файл: `src/hooks/useAppHotkeys.ts:267-285`.

Актуальность: подтверждено.

Почему это проблема: в outliner это логично, но пользователь может ожидать paste as sibling.

Решение: добавить отдельные команды "Paste as child" / "Paste after active" или описать семантику в help.

Риски решения: больше команд в UI.

Можно жить сейчас: да.

### [ ] P3-7. Merge Markdown наивно склеивает блоки

Файл: `src/domain/documentTree.ts:410-416`.

Актуальность: подтверждено.

Почему это проблема: `join("\n\n")` может ломать сложные Markdown-блоки, списки или незакрытые code fences.

Решение: добавить smarter merge или хотя бы tests на code fences/lists.

Риски решения: Markdown merge без AST всегда будет частично эвристическим.

Можно жить сейчас: да.

### [ ] P3-8. Zen/fullscreen поведение неочевидно

Файлы: `src/components/Header.tsx:84-106`, `src/App.tsx:128-153`.

Актуальность: подтверждено.

Что происходит: desktop toggle циклически ведет fullscreen -> zen -> normal, а zen mode имеет отдельную floating-кнопку выхода.

Почему это проблема: "fullscreen" и "zen" смешаны в одном действии.

Решение: разделить команды или явно назвать states в UI.

Риски решения: может измениться привычный shortcut/user flow.

Можно жить сейчас: да.

### [ ] P3-9. README частично расходится с кодом

Файлы: `README.md`, `package.json`, `vite.config.ts`, `src/components/WysiwygEditor.tsx`, `src/utils/markdownParser.ts`, `src/i18n.ts`.

Актуальность: подтверждено.

Примеры:

- README: `PuuNote 0.4`, package: `0.0.0`.
- README говорит `Vite 6 (с Code Splitting)`, но главный chunk все еще крупный.
- README говорит `Framer Motion`, код импортирует `motion`.
- "Полная GFM" спорна для visual editor.
- Import "заголовков и списков" не включает ordered list как структуру.
- RU/EN интерфейс неполный.
- Не описаны лимиты 5MB/50k nodes и особенности mock AI.

Решение: обновить README после стабилизации или честно описать ограничения уже сейчас.

Риски решения: минимальные.

Можно жить сейчас: да, но docs debt заметный.

### [ ] P3-10. Config/tooling hygiene

Файлы: `tsconfig.json:12-22`, `vite.config.ts:9-12`, `metadata.json`, `src/utils/schema.ts:26-31`, `src/utils/markdownParser.ts:231-237`, `src/db/db.ts:44-47`, `package.json`.

Актуальность: подтверждено.

Пункты:

- alias `@/*` указывает на корень проекта, импортов через `@/` нет;
- config files не входят в `tsc --noEmit`, потому что `include: ["src"]`;
- `metadata.json` выглядит как заглушка, нужно понять владельца;
- `PuuNodesArraySchema` объявлена, но не используется;
- dead branch в `parsePuuNoteFormat`: после раннего return ветка `cleanText.includes("<!-- puunote-node -->")` недостижима;
- Dexie upgrade handler содержит `console.log` и не делает реальной миграции;
- direct deps `@tiptap/core`, `@tiptap/pm`, `@tiptap/extension-bubble-menu` стоит проверить, прежде чем держать как прямые зависимости.

Решение: отдельный cleanup после P1/P2.

Риски решения: удаление deps/metadata требует проверки `npm ls`, build и внешнего пайплайна.

Можно жить сейчас: да.

### [ ] P3-11. Security headers/CSP не настроены

Файлы: `index.html`, `render.yaml`.

Актуальность: подтверждено.

Почему это проблема: Markdown sanitize есть, но CSP полезен как defense-in-depth, особенно перед plugins/AI-generated content.

Решение: добавить CSP/security headers на hosting layer, если Render static это поддерживает; учесть fonts/img/connect sources.

Риски решения: слишком строгий CSP может сломать fonts, assets или будущие providers.

Можно жить сейчас: да, пока приложение static и без сторонних plugins.

### [ ] P3-12. Зависимости устарели, но уязвимости не найдены

Файл: `package.json`.

Актуальность: подтверждено `npm audit` и `npm outdated`.

Почему это проблема: tooling/security fixes уходят вперед. Major upgrades Vite/TypeScript/lucide могут потребовать адаптации.

Решение: обновлять отдельной веткой после зеленого build/test и formatter cleanup. Не смешивать с persistence fixes.

Риски решения: TypeScript 6 и Vite 8 могут вскрыть новые ошибки типов/config.

Можно жить сейчас: да.

## 7. Снятые или частично снятые пункты старых аудитов

| Пункт из старых аудитов | Текущий статус |
|---|---|
| `AutoSizeTextarea` ломает TypeScript build | Снято. `typecheck` и `build` проходят. |
| `useBoardLayout` tests конфликтуют | Снято. Текущие tests проходят. |
| `npm run build` падает | Снято. Build проходит. |
| `npm run test` падает | Снято. Tests проходят. |
| Последние символы textarea теряются перед unload | В основном снято: есть `textareaFlushRegistry` и `flushPendingTextareas()`. |
| `visibilitychange:hidden` отменяет pending save | Снято: сейчас вызывается dirty backup и `flushPendingSave()`. |
| `updatedAt` не обновляется при обычном редактировании | Снято: `touchUpdatedAt: true` после save. |
| Tutorial detection завязан только на title | В основном снято: добавлен `metadata.kind = "tutorial"` и fallback по текущему title. |
| Mobile header overflow | Частично снято: добавлено mobile menu, но mobile/touch workflows и DnD остаются слабым местом. |
| `editorMode` влияет только на Timeline | Снято: Board/Card, Timeline и FullScreenModal используют WYSIWYG/Markdown mode. |
| Shortcuts не показывают `.` и Escape clear focus не работает | Снято: `.` есть в modal, Escape clear focus реализован. |
| `html lang` всегда `en` | В основном снято: i18n обновляет `document.documentElement.lang`; начальный HTML все еще `en` до загрузки JS. |
| Favicon отсутствует | Снято: `public/favicon.svg` и `public/favicon.ico` есть, `index.html` ссылается на SVG. |
| CI отсутствует | Снято: `.github/workflows/ci.yml` есть, но не запускает `format:check`. |
| Render deploy невозможен из-за build failure | Снято как отдельный пункт: build сейчас проходит. |
| `temp_puunote` ломает lint | Снято: папки нет. |

## 8. Итоговый чеклист по категориям

### Данные и persistence

- [x] P1: убрать autosave race при инициализации active file.
- [x] P1: исправить duplicate id repair без потери nodes.
- [x] P1/P2: остановить UI-удаление файла после ошибки `deleteDocument`.
- [x] P2: зафиксировать контракт пустого документа во всех слоях.
- [x] P2: добавить persistence tests на init/autosave/switch/delete. Покрыты autosave latest-state/flush/error, delete failure/success, switch flush/failure. Dirty backup/snapshot/quota integration tests остаются отдельным будущим слоем.
- [x] P2: сделать search в Command Palette aware of unsaved active document.
- [x] P2: показывать repair report при импорте поврежденных данных.

### Редактор и Markdown

- [x] P1: синхронизировать Tiptap editor с внешним `initialValue`.
- [x] P2: описать или реализовать GFM parity в visual mode.
- [x] P2: заменить `window.prompt("URL")` на нормальную link form с validation.
- [ ] P3: добавить tests на Markdown merge, ordered list import и WYSIWYG round-trip.
- [ ] P3: решить paste semantics: child/sibling.

### Производительность

- [x] P2: lazy-load WYSIWYG/Tiptap, уменьшить главный chunk.
- [x] P2: сгруппировать текстовый undo, чтобы Ctrl+Z не отменял ввод по одной букве.
- [ ] P2: ограничить память undo/redo или перейти на patches/transactions.
- [ ] P2: подготовить BoardView к большим документам.
- [x] P2: убрать mutable sort из `exportNodesToMarkdown`.
- [x] P2: оптимизировать O(n^2) parser order calculation.
- [ ] P2/P3: batching/нормализация для текстовых updates на больших документах.

### UI/UX и accessibility

- [ ] P2: полный i18n pass, включая aria/title/toast.
- [ ] P2: accessibility pass для карточек, DnD и WYSIWYG toolbar. Частично: WYSIWYG toolbar buttons получили `title`/`aria-label`.
- [ ] P2/P3: richer empty state для пустого документа.
- [ ] P3: выровнять Timeline click/edit поведение с BoardView.
- [x] P3: стабилизировать column width formulas. Scroll alignment остается отдельной P3-2 задачей.
- [ ] P3: добавить keyboard/touch alternatives для move/reparent.
- [ ] P3: сделать Zen/fullscreen понятнее.

### Security/privacy

- [x] P2: сделать `npm run dev` localhost-only, LAN оставить в `dev:lan`.
- [x] P2/P3: убрать внешний Google Fonts или self-host.
- [ ] P2: не развивать external AI без consent/preview/audit log.
- [ ] P2: не делать публичные plugins без manifest/permissions/sandbox.
- [ ] P3: добавить CSP/security headers на static hosting.

### Tooling/docs/cleanup

- [x] P2: прогнать Prettier отдельным mechanical commit.
- [ ] P2: добавить `format:check` в CI после форматирования.
- [x] P2/P3: усилить ESLint базовыми rules. Type-aware rules и jsx-a11y остаются будущим hardening.
- [ ] P3: синхронизировать README с текущим кодом и ограничениями.
- [ ] P3: обновлять зависимости отдельной веткой.
- [ ] P3: почистить alias/config/dead code/unused schema/metadata/deps.

## 9. Рекомендуемый порядок работ

1. Исправить autosave race при init и добавить regression-test.
2. Исправить duplicate id repair и `deleteFile()` failure flow.
3. Закрыть контракт пустого документа и snapshots/import behavior.
4. Добавить базовые persistence tests.
5. Исправить WYSIWYG external-state sync.
6. Прогнать Prettier отдельным коммитом и добавить `format:check` в CI.
7. Lazy-load WYSIWYG/Tiptap.
8. Сделать i18n/accessibility pass.
9. Privacy hardening: `dev` host и Google Fonts.
10. Обновить README и только потом браться за AI/plugin design.

## 10. Общая оценка

PuuNote сейчас в хорошем состоянии для активного local-first прототипа: build/test зеленые, базовые доменные тесты есть, архитектура читаемая, данные хранятся локально, Markdown-render санитизируется, есть импорт/экспорт, snapshots, Timeline и начальный AI/job/plugin foundation.

Но до устойчивого релизного состояния еще есть важный слой работы. Самое важное - не добавлять крупные новые фичи поверх persistence debt. Надежность сохранения, корректный импорт/repair, WYSIWYG sync и тесты на жизненный цикл данных должны идти первыми. После этого проект можно уверенно развивать в сторону больших документов, полированного UX и безопасного AI/plugin слоя.
