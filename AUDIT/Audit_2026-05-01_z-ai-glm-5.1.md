# Аудиторский отчёт: PuuNote

**Дата:** 2026-05-01
**Модель:** z-ai/glm-5.1
**Версия проекта:** 0.4 (package.json: 0.0.0)

---

## 1. Описание проекта

**PuuNote** — local-first горизонтальный древовидный markdown-редактор, структурно близкий к Gingko App / Obsidian Canvas. Дерево нод отображается в многоколоночном виде: дочерние элементы открываются правее родителей, образуя ветки.

### Архитектура

```
src/
├── components/    # 18 React-компонентов (BoardView, Card, Column, SafeMarkdown, …)
├── hooks/         # 9 хуков (useBoardLayout, useAppHotkeys, useFileSystem*, …)
├── domain/        # 10 доменных модулей (documentTree, contextExtraction, aiProvider, jobRunner, …)
├── utils/         # 11 утилит (tree, schema, markdownParser, id, storage, …)
├── store/         # Zustand-стор: 4 слайса + типы (560+ строк)
├── db/            # Dexie 4 (IndexedDB): AppDatabase + снапшоты
├── plugins/       # PluginRegistry (экспериментальный AI-слой)
├── i18n/          # i18next (en, ru)
└── types.ts       # Общие типы
```

### Стек

| Слой | Технология |
|---|---|
| UI | React 19 + Tailwind 4 + motion + react-virtuoso |
| Стейт | Zustand 5 (4 слайса: document, history, selection, ui) |
| БД | Dexie 4 → IndexedDB (offline-first) |
| Валидация | Zod 4 |
| Markdown | react-markdown + rehype-sanitize + remark-gfm + remark-breaks |
| Сборка | Vite 6 + TypeScript 5.8 |
| Тесты | Vitest 4 |

### Механика

- Ноды хранятся как плоский массив `PuuNode[]` с `parentId` / `order`
- `TreeIndex` (nodeMap + childrenMap) строится на лету из плоского массива
- Undo/Redo — стек past/future (до 50 записей), `diffAndEmit` оповещает PluginRegistry
- Сохранение: debounced 1с автосохранение в IndexedDB, dirty-бэкап на beforeunload
- AI-слой: mock-провайдер + PluginRegistry (экспериментально)

---

## 2. Удачные решения

1. **Offline-first на Dexie** — изолированная БД с миграциями (v1→v2) и снапшотами, dirty-бэкап на `visibilitychange` / `beforeunload`. Надёжная защита от потери данных.

2. **Изоляция слайсов Zustand** — чёткое разделение на домены (document, history, selection, ui), каждый слайс ответственен за свой фрагмент стейта. Снижает когнитивную нагрузку.

3. **Безопасный рендеринг Markdown** — разделение редактирования (AutoSizeTextarea) и показа (SafeMarkdown через rehype-sanitize). Защита от XSS.

4. **Zod-схема с авторемонтом** — `validateNodesWithReport` не только валидирует, но и чинит: дедуплицирует по ID, отсекает сирот, разрывает циклы, ограничивает глубину 200. Возвращает отчёт.

5. **Clipboard-стратегия** — тройной формат: text/plain (markdown), text/html (с мета-тегом для round-trip), кастомный MIME. Fallback на парсинг markdown/HTML при потере кастомного формата.

6. **Clipboard-кэш** — `lastCopiedCardsRef` с TTL 2 мин предотвращает повторный парсинг при вставке из того же буфера. Ограничение 1 МБ на кэш (PERF-7).

7. **Cancelable file switching** — `AbortController` на смену файла в `useFileSystemActions.switchFile`, предотвращает race condition при быстром переключении.

8. **Легковесные AI-адаптеры** — логика ИИ вынесена в `domain/`, не перемешана с UI. `PluginRegistry` позволяет расширять без изменения ядра.

---

## 3. Проблемы в коде (с решениями)

### 3.1. Критические

| # | Проблема | Файл | Пояснение | Решение |
|---|---|---|---|---|
| C1 | **Module-level mutable cache** | `src/utils/tree.ts:8-9` | `_cachedNodes` / `_cachedTreeIndex` — глобальное изменяемое состояние вне React. Нарушает реактивность: если массив нод заменён на новый с тем же ref (например при undo), кэш не инвалидируется. При hot-reload в dev может протечь. | Вынести кэш в `useMemo` / `useRef` внутри компонента, или сделать `buildTreeIndex` чистой функцией без кэша (при 50К нод Map строится <5мс). |
| C2 | **TS-ошибка в продакшене** | `src/components/AutoSizeTextarea.tsx:115` | `Type 'CSSProperties' is not assignable to type 'Style'` — `height: string` несовместим с ожидаемым `height: number`. **Сборка сломана**: `tsc --noEmit` падает, `npm run build` не работает. | Привести `style.height` к `number` (убрать `'px'`-суффикс, использовать `parseInt`), либо расширить тип `Style` в обёртке. |
| C3 | **Падающий тест** | `src/hooks/useBoardLayout.test.ts:59` | 1 из 38 тестов падает — `useBoardLayout` возвращает не те колонки для unfocused active-corridor режима. | Обновить ожидаемый результат в тесте после изменения логики `buildBoardColumns`, либо исправить саму логику. |

### 3.2. Архитектурные

| # | Проблема | Файл | Пояснение | Решение |
|---|---|---|---|---|
| A1 | **@-алиас указывает на корень проекта** | `tsconfig.json:13` | `"@/*": ["./*"]` — импорты вроде `@/package.json` станут валидными. Должно быть `"@/*": ["./src/*"]`. | Изменить путь на `./src/*`, обновить все импорты. |
| A2 | **Два хука на одну зону ответственности** | `useFileSystem.ts` | `useFileSystemInit` + `useFileSystemActions` — один файл, два хука. `useFileSystemInit` делает 2 разных `useEffect` (init + subscribe). | Разделить на `useFileSystemInit` (mount), `useFileSystemSync` (subscribe), `useFileSystemActions` (actions). Или объединить в один хук с явным API. |
| A3 | **JobRunner — singleton с прямым импортом стора** | `src/domain/jobRunner.ts` | `useJobStore.getState()` вызывается напрямую внутри singleton-класса. Нельзя подменить стор при тестировании, нельзя использовать в другом контексте. | Принять стор через конструктор / параметр `runJob`, либо через DI-контейнер. |
| A4 | **fsManager — singleton с мутабельным стейтом** | `src/hooks/useFileSystem.ts:9-36` | `FileSystemManager` — глобальный синглтон с `timer`, `fileId`, `nodes`, `isHydratingFile`. Те же проблемы: трудно тестировать, невозможно параллелить. | Переписать как часть Zustand-стора или React-контекста. |
| A5 | **parseMindMapFormat: O(n²) при вычислении order** | `src/utils/markdownParser.ts:468` | `const currentOrder = imported.filter(n => n.parentId === parentId).length` — для каждой ноды фильтруется весь массив. При 10К строк = 100М итераций. | Использовать `Map<string, number>` для подсчёта children per parent. Та же проблема в `parsePuuNoteFormat:286` и `parseLegacyPuuNoteFormat:346`. |
| A6 | **validateNodesWithReport: try/catch на каждую ноду** | `src/utils/schema.ts:66-74` | `PuuNodeSchema.safeParse(rawNode)` в цикле — при 50К нод создаёт 50К объектов result. | Использовать `.passthrough().array().safeParse(data)` один раз, затем фильтровать ошибки по индексу. |

### 3.3. Производительность

| # | Проблема | Файл | Пояснение | Решение |
|---|---|---|---|---|
| P1 | **buildTreeIndex вызывается из множества мест** | Везде | `buildTreeIndex` вызывается в `useBoardLayout`, `useAppHotkeys`, `contextExtraction`, `documentTree`, `markdownParser`, `Card` (через хуки). Module-level кэш частично спасает, но при частых обновлениях массива (undo/redo) инвалидация ненадёжна. | Мемоизировать TreeIndex в Zustand-сторе или React-контексте, пересчитывать только при изменении `nodes`. |
| P2 | **Shift-Select: O(n²) в selectionSlice** | `selectionSlice.ts` | `uniqueById` при каждом `setNodes` пробегает весь массив. При 50К нод + 50 историях = 2.5М итераций. | `uniqueById` уже использует `Set` (O(n)) — это нормально. Но `currentNodes.every((node, index) => node === nextNodes[index])` — O(n) с reference equality, что ок, но при больших массивах стоит добавить `===` шорткат. |
| P3 | **ArrowDown/Up: O(n) find** | `useAppHotkeys.ts:458-477` | `nodes.find(n => n.id === activeId)` — линейный поиск при каждом нажатии. | Использовать `TreeIndex.nodeMap.get(activeId)`. |
| P4 | **content max 5 000 000 символов** | `src/utils/schema.ts:20` | 5М символов на ноду × 50К нод = 250 ГБ теоретического лимита. Зачем такой потолок для одной карточки? | Снизить до разумного (50К–100К), разделять длинный контент на дочерние ноды. |

### 3.4. Безопасность

| # | Проблема | Файл | Пояснение | Решение |
|---|---|---|---|---|
| S1 | **Нестандартный MIME-тип в clipboard** | `markdownParser.ts:7` | `"web application/x-puunote+json"` — нестандартный, большинство браузеров молча игнорирует `setData()` для неизвестных MIME. Код уже учитывает это (try/catch), но HTML fallback надёжнее. | Удалить кастомный MIME, оставить только HTML meta-tag + plain text. Уменьшит код и упростит. |
| S2 | **parseClipboardHtmlNodes: regex-парсинг HTML** | `markdownParser.ts:186-196` | Регулярка для извлечения `<meta>` из HTML — хрупко. Если HTML минифицирован или содержит переводы строк внутри атрибута — сломается. | Использовать DOMParser для парсинга HTML, читать meta через `document.querySelector('meta[name=puunote-clipboard]')`. |

### 3.5. Качество кода

| # | Проблема | Файл | Пояснение | Решение |
|---|---|---|---|---|
| Q1 | **storage.ts — 3 строки** | `src/utils/storage.ts` | Файл с одной функцией `isQuotaError` (3 строки). Размещение не оправдывает отдельный модуль. | Перенести в `useFileSystem.ts` или `documentService.ts`. |
| Q2 | **Клонирование кода stripIndent / getIndentLength** | `markdownParser.ts:299-320, 247-273` | Функции `stripIndent` и `getIndentLength` дублируют логику из `parsePuuNoteFormat` (строки 247–273 vs 299–320). Код идентичен. | Вынести общую логику в переиспользуемую функцию. |
| Q3 | **normalizeOptions перегружен** | `contextExtraction.ts:35-47` | `number | LLMContextOptions` — неочевидный API. Пользователь может передать число, но не ясно что это `maxLevels`. | Убрать `number`, оставить только `LLMContextOptions`. Если нужен shortcut — сделать отдельную функцию `buildContextForLLMWithDepth`. |
| Q4 | **index.html lang="en"** | `index.html:2` | Проект двуязычный (en/ru), но `lang` захардкожен на `en`. Скринридеры будут использовать английскую фонетику для русскоязычного контента. | Динамически обновлять `document.documentElement.lang` при смене языка через i18next. |
| Q5 | **dev:lan дублирует dev** | `package.json:8` | `"dev:lan": "vite --port=3000 --host=0.0.0.0"` — идентичен `dev`. Опечатка (`lan` вместо `lan`? или `local`?). | Удалить или переименовать/изменить. |
| Q6 | **render.yaml без envVars** | `render.yaml` | Конфиг деплоя на Render как static site. Актуален, но нет `envVars` для production-переменных. | Если деплой не используется — удалить. Если используется — дополнить. |
| Q7 | **metadata.json почти пуст** | `metadata.json` | `requestFramePermissions: []`, `majorCapabilities: []` — файл-заглушка из Figma/Frame. | Удалить, если не используется в пайплайне. |

### 3.6. Тестирование

| # | Проблема | Пояснение | Решение |
|---|---|---|---|
| T1 | **Нет тестов для AI-слоя** | `aiOperations.ts`, `aiProvider.ts`, `PluginRegistry` — 0 тестов. | Минимум: тест на mock-провайдер, тест на `buildContextForLLM`, тест на `PluginRegistry.emit`. |
| T2 | **Нет тестов для стора** | `useAppStore` — 0 тестов. Критичная логика: undo/redo, selection, document CRUD. | Покрыть `historySlice` (undo/redo/diff), `selectionSlice`, `documentSlice`. |
| T3 | **Нет тестов для БД** | `db.ts`, `snapshots.ts`, `DocumentService` — 0 тестов. | Интеграционные тесты с Dexie (in-memory). |
| T4 | **Нет тестов для clipboard** | `markdownParser.ts` — критичный модуль для копирования/вставки, нет тестов на round-trip (export → import). | Тесты: export→parse markdown, export→parse HTML, custom MIME, edge cases. |
| T5 | **1 падающий тест** | `useBoardLayout.test.ts:59` — ожидание не совпадает с реальностью. | Починить тест или логику. |

---

## 4. Ошибки UI/UX

1. **Проваливание первой карточки при загрузке**
   - **Симптом:** При загрузке первая карточка оказывается в самом низу колонки.
   - **Причина:** `pt-[95vh]` в `BoardView.tsx` — огромный padding-top, при котором `offsetTop` в хуке скролла срабатывает некорректно.
   - **Решение:** Заменить на `pt-[30vh]` или Spacer div.

2. **Гонки скролла (requestAnimationFrame)**
   - **Симптом:** Фокус «прыгает» при быстрых изменениях стейта.
   - **Причина:** Два последовательных `requestAnimationFrame` в `useBoardLayout` с ручной математикой `getBoundingClientRect`.
   - **Решение:** Заменить на `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` по React-рефам.

3. **Потеря визуального пути на глубоких уровнях**
   - **Симптом:** При 4+ колонках теряется понимание, где находишься.
   - **Решение:** Сильнее димить карточки вне активного пути (`activeAncestorPath`), добавить breadcrumb.

4. **Коллизии горячих клавиш**
   - **Симптом:** Навигационные хоткеи (Delete, Backspace, Tab) могут сработать внутри textarea.
   - **Причина:** Проверка `isEditableTarget` есть не везде (в `handleKeyDown` проверяется, но в `handleGlobalPaste` — частично).
   - **Решение:** Централизовать проверку в одном месте, убедиться что все глобальные обработчики корректно игнорируют editable-элементы.

5. **Shift-Select: непредсказуемое поведение**
   - **Симптом:** Эвристика «предотвратить выделение родителя, если дети выделены» даёт неожиданный результат.
   - **Решение:** Упростить до классической модели: выделение — путь от А до Б, без исключений.

6. **Нет PWA / сервис-воркера**
   - **Симптом:** Нельзя «установить» приложение, нет оффлайн-кеширования статики.
   - **Решение:** Добавить `vite-plugin-pwa`, manifest.json, сервис-воркер для кеширования статики.

---

## 5. Итоговый чеклист проблем

### Критические (блокируют сборку/работу)
- [ ] **C2** Починить TS-ошибку в `AutoSizeTextArea.tsx:115` — `npm run build` не работает
- [ ] **C3** Починить падающий тест `useBoardLayout.test.ts:59`

### Высокий приоритет (влияют на корректность)
- [ ] **C1** Убрать module-level кэш из `tree.ts` — заменить на мемоизацию в React/Zustand
- [ ] **A1** Исправить `@/*` алиас на `./src/*` в tsconfig.json
- [ ] **P1** Централизовать построение TreeIndex (один раз на изменение nodes)

### Средний приоритет (влияют на производительность / поддержку)
- [ ] **A5** Исправить O(n²) в `parseMindMapFormat` / `parsePuuNoteFormat` (currentOrder)
- [ ] **A6** Оптимизировать `validateNodesWithReport` — один safeParse вместо цикла
- [ ] **A3** Убрать прямой импорт `useJobStore` из `JobRunner`
- [ ] **P3** Заменить `nodes.find()` на `TreeIndex.nodeMap.get()` в `useAppHotkeys`
- [ ] **P4** Снизить `content.max(5_000_000)` до разумного предела
- [ ] **Q2** Удалить дублирование stripIndent / getIndentLength
- [ ] **Q4** Динамически обновлять `document.documentElement.lang` при смене языка

### Низкий приоритет (code quality / hygiene)
- [ ] **A2** Реорганизовать `useFileSystem.ts` — разделить init/sync/actions
- [ ] **A4** Переписать `fsManager` как часть стора или контекста
- [ ] **Q1** Перенести `isQuotaError` из `storage.ts` в более подходящее место
- [ ] **Q3** Упростить `normalizeOptions` в `contextExtraction.ts`
- [ ] **Q5** Удалить дублирующий `dev:lan` скрипт
- [ ] **Q6** Уточнить статус `render.yaml` — удалить или дополнить
- [ ] **Q7** Удалить `metadata.json`, если не используется
- [ ] **S1** Удалить нестандартный MIME-тип из clipboard
- [ ] **S2** Заменить regex-парсинг HTML на DOMParser

### UI/UX
- [ ] Заменить `pt-[95vh]` в BoardView на более адекватный отступ
- [ ] Переписать скролл-логику на `scrollIntoView`
- [ ] Добавить димминг неактивных карточек при глубокой вложенности
- [ ] Упростить Shift-Select до классической модели
- [ ] Добавить PWA manifest + сервис-воркер

### Тестирование
- [ ] **T1** Добавить тесты для AI-слоя
- [ ] **T2** Добавить тесты для Zustand-стора (undo/redo, selection, document)
- [ ] **T3** Добавить тесты для БД (Dexie, snapshots)
- [ ] **T4** Добавить тесты для clipboard round-trip

---

## 6. Видение развития проекта

### Ближайшие шаги (1–2 недели)
1. Починить C2 + C3 — вернуть сборку и тесты в зелёное состояние
2. Централизовать TreeIndex (C1 + P1) — убрать module-level кэш, строить один раз
3. Починить `@/*` алиас (A1) — это минутное дело, но влияет на архитектурную чистоту

### Краткосрочные (1 месяц)
4. Покрыть тестами: стор, clipboard, БД (T1–T4)
5. Оптимизировать парсинг markdown (A5, A6) — для поддержки больших документов
6. Переписать скролл-логику на scrollIntoView
7. Добавить PWA: manifest + сервис-воркер + offline install

### Среднесрочные (2–3 месяца)
8. Refactor `useFileSystem` + `fsManager` — вынести в Zustand middleware или React context
9. Упростить Shift-Select
10. Добавить breadcrumb для навигации при глубокой вложенности
11. Расширить AI-слой: реальный провайдер (OpenAI / local LLM), streaming

### Долгосрочные
12. Collaboration: CRDT-синхронизация (Yjs / Automerge) для multi-user
13. Плагинная система:第三方 плагины через sandboxed iframe / Web Worker
14. Мобильная адаптация: свайпы вместо хоткеев, touch-friendly колонки

---

*Отчёт подготовлен на основе полного чтения всех исходных файлов проекта (18 компонентов, 9 хуков, 10 domain-модулей, 11 утилит, 4 слайса, БД, плагины, конфиги).*
