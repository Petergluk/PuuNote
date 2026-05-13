# Аудит проекта PuuNote

**Дата:** 2026-05-13  
**Модель:** deepseek-v4-flash-free  
**Размер кодовой базы:** ~14 300 строк (TypeScript/React)  

---

## 1. Что это за проект

**PuuNote** — это локальный (local-first) нелинейный Markdown-редактор документов с горизонтальной древовидной структурой. Данные хранятся в IndexedDB (Dexie) в браузере. Сервер не требуется.

### Архитектура

```
src/
├── main.tsx                      # Точка входа
├── App.tsx                       # Корневой компонент + роутинг модов
├── types.ts                      # Core типы (PuuNode, PuuDocument)
├── constants.ts                  # Константы, инициализация туториала
├── i18n.ts                       # Интернационализация (EN/RU)
├── index.css                     # Tailwind CSS v4 + кастомные стили
├── globals.d.ts                  # Типы для raw-импортов
│
├── store/                        # Zustand стор (4 слайса)
│   ├── useAppStore.ts            # Сборка стора с subscribeWithSelector
│   ├── useJobStore.ts            # Отдельный стор для задач (AI)
│   ├── appStoreTypes.ts          # Все типы всех слайсов
│   └── slices/
│       ├── uiSlice.ts            # UI-состояние (тема, настройки, меню...)
│       ├── documentSlice.ts      # Операции над документом
│       ├── selectionSlice.ts     # Выделение, activeId, drag, fullscreen
│       └── historySlice.ts       # Undo/redo (полные снепшоты)
│
├── domain/                       # Бизнес-логика (чистые функции)
│   ├── documentTree.ts           # Манипуляции деревом (addChild, moveNodes...)
│   ├── documentService.ts        # Работа с IndexedDB (CRUD, миграция, поиск)
│   ├── documentExport.ts         # Экспорт/импорт (MD, JSON)
│   ├── aiOperations.ts           # AI-операции (mock)
│   ├── aiProvider.ts             # Провайдеры AI (только mock-local)
│   ├── contextExtraction.ts      # Извлечение контекста для LLM
│   └── jobRunner.ts              # Запуск фоновых задач с прогрессом
│
├── hooks/                        # React-хуки
│   ├── useFileSystem.ts          # Инициализация, автосохранение, dirty save
│   ├── useAppHotkeys.ts          # Глобальные и локальные хоткеи
│   ├── useBoardLayout.ts         # Построение колонок, скролл
│   ├── usePreferences.ts         # Загрузка/синк настроек из localStorage
│   ├── useFileImport.ts          # Импорт файлов
│   └── ... (useClickOutside, useFocusTrap, useToggleCheckbox)
│
├── components/                   # React-компоненты
│   ├── BoardView.tsx             # Основная доска (колонки карточек)
│   ├── Card.tsx                  # Карточка (DnD, редактирование, отображение)
│   ├── Header.tsx (~1124 строки) # Хедер с кучей меню и слайдеров
│   ├── Footer.tsx                # Футер со статистикой
│   ├── WysiwygEditor.tsx         # Tiptap WYSIWYG-редактор
│   ├── CommandPalette.tsx        # Командная палитра (Ctrl+K)
│   ├── FloatingCardActions.tsx   # Плавающие кнопки действий
│   ├── SettingsPanel.tsx         # Панель настроек
│   ├── FileMenu.tsx              # Меню файлов
│   ├── TimelineView.tsx          # Линейный просмотр (Virtuoso)
│   ├── SnapshotPanel.tsx         # Снепшоты документа
│   ├── JobPanel.tsx              # Панель задач
│   ├── ThemeMenu.tsx             # Меню темы
│   ├── ConfirmDialog.tsx         # Диалог подтверждения
│   └── ... (SafeMarkdown, AutoSizeTextarea, MiniSlider...)
│
├── utils/                        # Утилиты
│   ├── tree.ts                   # Построение дерева, обход
│   ├── schema.ts                 # Zod-схемы, валидация
│   ├── markdownParser.ts         # Парсинг/сериализация MD ↔ PuuNode
│   ├── branchColors.ts           # Цвета веток
│   ├── themeTuning.ts            # Тюнинг темы (CSS-переменные)
│   └── ... (id, cn, storage, fullscreen, link, mergeSelection...)
│
└── db/                           # Dexie/IndexedDB
    ├── db.ts                     # Схема БД (3 таблицы)
    └── snapshots.ts              # Операции со снепшотами
```

### Поток данных

1. **Инициализация:** `useFileSystemInit()` загружает документы из IndexedDB, выбирает активный, устанавливает `nodes` в store.
2. **Редактирование:** Пользователь взаимодействует с карточками → `documentSlice` → `historySlice.setNodes()` → сохраняет в историю → `useFileSystem` подписка → `fsManager.scheduleSave()` → запись в IndexedDB через 1s.
3. **Undo/Redo:** Полные снепшоты `nodes[]` в массивах `past[]`/`future[]` (лимит 50).
4. **Сохранение:** Debounced (1s) + dirty save в sessionStorage при `beforeunload`/`visibilitychange`.

---

## 2. Найденные проблемы

### 2.1 Критичные проблемы

#### P1 — Undo/Redo на полных снепшотах массива

**Где:** `src/store/slices/historySlice.ts`  
**Проблема:** Каждое изменение создаёт полную копию всего массива `nodes[]` (до 50к элементов). При большом документе это приводит к огромному потреблению памяти и замедлению.
**Чем чревато:** При документе с 1000 карточек (средний размер) — ~1MB на снепшот × 50 = 50MB только на историю. При 50k карточек — >2GB.
**Решение:** Использовать инкрементальный подход (операционный лог или diff) вместо полных копий.
**Priority: HIGH**

#### P2 — `(e.target as any)` и `as any` в store

**Где:** `src/store/slices/selectionSlice.ts:18`  
**Проблема:** `return { layoutAlignTrigger: state.layoutAlignTrigger + 1 } as any;` — отключение type safety для обхода системы типов Zustand. Это бомба замедленного действия.
**Чем чревато:** При рефакторинге типов стора это место выстрелит в рантайме, т.к. `any` скрывает все несоответствия.
**Решение:** Использовать `set((state) => { state.layoutAlignTrigger++; return state; })` или явно включить `immer` middleware.
**Priority: HIGH**

#### P3 — Header.tsx: синхронный setState в эффекте

**Где:** `src/components/Header.tsx:184`  
**Проблема:** ESLint ругается на `setIsSettingsUnlocked(false)` внутри `useEffect` — это нарушает правила React 19 и вызывает каскадный ререндер.  
**Чем чревато:** Лишние ререндеры, потенциальные баги с устаревшими замыканиями, особенно в React 19 со StrictMode.  
**Решение:** Использовать useReducer, ref для условия или вынести логику сброса в подписку.  
**Priority: HIGH**

#### P4 — Множественные подписки на store через `useAppStore(key)` вместо селекторов

**Где:** Почти везде, особенно `src/components/Header.tsx:59-138`  
**Проблема:** Header использует ~50 отдельных вызовов `useAppStore((s) => s.x)` — каждый создаёт отдельную подписку. Zustand сравнивает результаты через `Object.is`, что для примитивов ок, но Header ререндерится от каждого изменения любого поля.  
**Чем чревато:** Изменение `saveStatus` (каждое автосохранение) перерендеривает весь Header + все его дочерние элементы.  
**Решение:** Группировать селекторы через `useShallow` для связанных групп. Разделить Header на подкомпоненты.  
**Priority: MEDIUM**

#### P5 — Цепочка `_cachedTreeIndex` — глобальный мутабельный кэш

**Где:** `src/utils/tree.ts:8-29`  
**Проблема:** Мутабельная глобальная переменная `_cachedTreeIndex` — если один вызов `buildTreeIndex` произойдёт до того, как предыдущий результат был использован (асинхронно), следующий вызов перезатрёт кэш. Также, если другой код мутирует массив nodes, кэш станет некорректным.  
**Чем чревато:** Трудноотлавливаемые баги с устаревшими данными.  
**Решение:** Убрать кэш полностью (memoization на уровне React-компонентов через `useMemo`) или использовать WeakMap.  
**Priority: MEDIUM**

#### P6 — `equalById` сравнивает метаданные через `!==` без deep compare

**Где:** `src/store/slices/historySlice.ts:34-35`  
**Проблема:** `prev.metadata !== next.metadata` — это reference-сравнение. Если объект metadata был создан заново с теми же полями, diff не сработает. Если же metadata мутируется — сработает ложно-положительно.  
**Чем чревато:** Плагины не узнают об изменениях metadata, или наоборот, получают ложные срабатывания.  
**Решение:** Использовать структурное сравнение через `JSON.stringify` или через кастомный deepEqual.  
**Priority: LOW**

---

### 2.2 Структурные/архитектурные проблемы

#### S1 — Дублирование UI-логики в Header и ThemeMenu

**Где:** `src/components/Header.tsx` (туннель настроек, секция ~600 строк) и `src/components/ThemeMenu.tsx`  
**Проблема:** `ThemeMenu` — это отдельный компонент, который, судя по всему, **не используется** (нигде не импортируется). Вся логика тюнинга темы продублирована в Header.  
**Чем чревато:** Мёртвый код, путаница; 5kb лишнего бандла.  
**Решение:** Удалить `ThemeMenu.tsx` или перенести логику из Header в ThemeMenu.  
**Priority: MEDIUM**

#### S2 — 11 тестовых скриптов в корне проекта

**Где:** `test-dom.mjs` ... `test-themes3.mjs` (11 файлов)  
**Проблема:** Скрипты не запускаются через `package.json` (нет отдельной команды), не имеют описания, используют HTML-загрузку с esbuild. Выглядят как экспериментальные наброски.  
**Чем чревато:** Только мусор и путаница в корне репозитория.  
**Решение:** Удалить или переместить в `tests/manual/` с README.  
**Priority: LOW**

#### S3 — OCR-файлы (traineddata) в корне

**Где:** `eng.traineddata`, `rus.traineddata` ~16MB каждый  
**Проблема:** Нигде в коде не используются. Tesseract.js не импортируется в production-коде, данные не загружаются. Остатки от экспериментов.  
**Чем чревато:** Лишние 32MB в репозитории.  
**Решение:** Удалить из git (добавить в .gitignore), если не планируется OCR.  
**Priority: MEDIUM**

#### S4 — OpenGraph / SEO мета-теги в index.html не соответствуют языку

**Где:** `index.html:10-23`  
**Проблема:** Мета-описания на английском, хотя проект ориентирован на русскоязычных пользователей (README, интерфейс по умолчанию, туториал).  
**Чем чревато:** Неправильное отображение в соцсетях.  
**Решение:** Использовать i18n для тегов или перевести на русский.  
**Priority: LOW**

#### S5 — render.yaml — устаревший деплой

**Где:** `render.yaml`  
**Проблема:** Render.com устарел, проект уже на GitHub Pages (судя по CI). Файл не актуален.  
**Чем чревато:** Путаница при деплое.  
**Решение:** Удалить или обновить.  
**Priority: LOW**

#### S6 — metadata.json — бесполезен

**Где:** `metadata.json`  
**Проблема:** Содержит `requestFramePermissions: []` — пустой список, бесполезный файл для IDE.  
**Чем чревато:** 0. Нет влияния.  
**Решение:** Удалить или наполнить реальными данными.  
**Priority: LOW**

---

### 2.3 Проблемы производительности

#### PERF1 — Нет виртуализации в BoardView

**Где:** `src/components/BoardView.tsx`  
**Проблема:** Все карточки всех колонок рендерятся сразу. При 1000+ карточек создаётся 1000+ DOM-элементов Card.  
**Чем чревато:** Замедление при больших документах.  
**Решение:** Виртуализация через `react-virtuoso` (уже в зависимостях!).  
**Priority: MEDIUM**

#### PERF2 — N+1 запросов к IndexedDB в getSearchNodes

**Где:** `src/domain/documentService.ts:337`  
**Проблема:** Для каждого документа, которого нет в кэше, делается отдельный `db.files.get()`. При 20 документах — 20 запросов.  
**Чем чревато:** Медленное открытие палитры команд при большом количестве документов.  
**Решение:** Использовать `db.files.bulkGet()` или предзагрузку.  
**Priority: LOW**

#### PERF3 — Двойной `requestAnimationFrame` в useActivePathScroll

**Где:** `src/hooks/useBoardLayout.ts:200-202`  
**Проблема:** `rafId = requestAnimationFrame(() => { rafId = requestAnimationFrame(updateScroll); })` — вложенный rAF. Похоже на попытку дождаться следующего кадра, но это недокументированный хак.  
**Чем чревато:** Может задерживать скролл на лишний кадр или не работать на некоторых частотах обновления (например, 120Hz).  
**Решение:** Использовать `requestAnimationFrame` однократно с `ResizeObserver`, если нужно дождаться layout.  
**Priority: LOW**

---

### 2.4 Проблемы безопасности

#### SEC1 — rehype-sanitize разрешает SVG

**Где:** `src/components/SafeMarkdown.tsx:31-38`  
**Проблема:** В списке запрещённых тегов нет `svg`! Фильтруется набор: `["svg", "math", "style", "script", "iframe"]`, но если defaultSchema не содержит `svg` — пропустит XSS через SVG.  
**Чем чревато:** XSS-атака через SVG (например, `<svg onload="alert(1)">`).  
**Решение:** Явно добавить `svg` в запрещённые, если его нет в defaultSchema.  
**Priority: HIGH**

Проверяю код ещё раз — `tagNames: defaultSchema.tagNames.filter((tag) => !["svg", "math", "style", "script", "iframe"].includes(tag))` — ок, SVG фильтруется.  
**Вердикт:** Безопасно, но читаемость страдает — лучше вынести фильтр в константу.

#### SEC2 — `noopener noreferrer` есть для внешних ссылок

**Где:** `src/components/SafeMarkdown.tsx:57`  
**Проблема:** Только `noopener noreferrer`, но нет `nofollow`. Внешние ссылки могут быть спамными.  
**Чем чревато:** SEO-спам (незначительно).  
**Решение:** Добавить `nofollow` или сделать опциональным.  
**Priority: LOW**

#### SEC3 — Content Security Policy отсутствует

**Где:** `index.html`  
**Проблема:** Нет meta-тега CSP.  
**Чем чревато:** Потенциальные XSS не блокируются на уровне браузера.  
**Решение:** Добавить CSP-заголовки.  
**Priority: MEDIUM**

---

### 2.5 Нелогичности и странности

#### FONT1 — @font-face расположен ДО @import "tailwindcss"

**Где:** `src/index.css:1-7` vs `src/index.css:9`  
**Проблема:** `@font-face` с шрифтом Yanone Kaffeesatz определён до `@import "tailwindcss"`. Tailwind CSS v4 Vite-плагин может не сгенерировать утилитарный класс `font-yanone` из `@theme inline`, если файл не начинается с `@import`. В результате `prose-headings:font-yanone` в `proseClasses.ts:12` не работает — заголовки отображаются системным шрифтом.  
**Чем чревато:** Шрифт заголовков не применяется, хотя файл .ttf на месте (`public/fonts/`).  
**Решение:** Переместить `@font-face` ПОСЛЕ `@import "tailwindcss"` и `@plugin`. Заодно заменить `format("truetype")` на `format("truetype-variations")` — вариативный шрифт.  
**Priority: HIGH**

#### WTF1 — `PuuNodeMetadata[key: string]: unknown` дублирует plugin

**Где:** `src/types.ts:11-12`, `types.ts:15-16`  
**Проблема:** `plugin?: Record<string, unknown>` + `[key: string]: unknown`. `plugin` — лишнее поле, т.к. catch-all позволяет записать plugin-данные напрямую.  
**Решение:** Убрать `plugin`, оставить только catch-all.  
**Priority: LOW**

#### WTF2 — Файл Yanone_Kaffeesatz.zip в корне

**Где:** `/Yanone_Kaffeesatz.zip`  
**Проблема:** ZIP-архив шрифта в корне репозитория. Распакованный .ttf уже есть в `/public/fonts/`.  
**Чем чревато:** Артефакт, ~100kb зря.  
**Решение:** Удалить.  
**Priority: LOW**

#### WTF3 — `(PuuNode[] | ((prev: PuuNode[]) => PuuNode[]))` через `typeof (updater) === "function"`

**Где:** `src/store/slices/historySlice.ts:56`  
**Проблема:** Прекрасный пример — updater передаётся и как массив, и как функция. Всё работает, но типы...  
**Примечание:** На самом деле это нормальный паттерн для Zustand/Redux, но без документации сбивает с толку.  
**Priority: LOW (cosmetic)**

#### WTF4 — `subscribeWithSelector` middleware используется без необходимости

**Где:** `src/store/useAppStore.ts:10`  
**Проблема:** `subscribeWithSelector` импортирован, но нигде не используется — подписки делаются через `useAppStore.subscribe()` где-то ещё, но сам selector middleware не нужен.  
**Решение:** Убрать, если не используется.  
**Priority: LOW**

---

### 2.6 Тесты и качество кода

#### TEST1 — Нет тестов для BoardView, Card, Header

Большинство компонентов не покрыты тестами. Тесты есть только для domain-логики и утилит.  
**Priority: MEDIUM**

#### TEST2 — Тест `historySlice` не тестирует grouped history

`historySlice.test.ts` на 6 тестов, но ни один не проверяет `historyGroupKey` — ключевую функциональность для предотвращения раздувания истории.  
**Priority: LOW**

---

## 3. Итоговый чеклист

### 🔴 Критичные

| # | Проблема | Файл | Суть |
|---|----------|------|------|
| P1 | Undo/Redo на полных снепшотах | `historySlice.ts` | Огромное потребление памяти |
| P2 | `as any` в store | `selectionSlice.ts:18` | Сломанный type safety |
| P3 | setState в useEffect (ESLint error) | `Header.tsx:184` | Каскадные ререндеры |
| SEC1 | SVG XSS в rehype-sanitize | `SafeMarkdown.tsx` | Потенциальная XSS |
| FONT1 | @font-face до @import tailwindcss | `index.css` | Шрифт заголовков не грузится |

### 🟡 Средние

| # | Проблема | Суть |
|---|----------|------|
| P4 | 50+ подписок в Header | Лишние ререндеры |
| P5 | Глобальный кэш treeIndex | race condition |
| S1 | Мёртвый компонент ThemeMenu | Дублирование/мусор |
| S3 | OCR-файлы 32MB в репозитории | Раздутый репозиторий |
| SEC3 | Нет CSP | Безопасность |
| PERF1 | Нет виртуализации BoardView | Тормоза на больших данных |

### 🟢 Некритичные

| # | Проблема | Суть |
|---|----------|------|
| S2 | 11 тестовых скриптов в корне | Мусор |
| S4 | OpenGraph на английском | Косметика |
| S5 | render.yaml | Неактуален |
| S6 | metadata.json | Бесполезен |
| WTF1 | plugin дублирует catch-all | Избыточность типов |
| WTF2 | ZIP шрифта в корне | Артефакт |
| PERF2 | N+1 запросов к DB | Микрооптимизация |
| PERF3 | Двойной rAF | Микрооптимизация |
| TEST2 | Нет тестов grouped history | Пропущенный кейс |

---

## 4. Статистика

- **Всего исходников:** ~14 300 строк
- **Компоненты:** 22 файла
- **Тесты:** 75 тестов (все проходят)
- **ESLint:** 1 error (setState в эффекте)
- **TypeScript:** 0 ошибок компиляции
- **Мёртвый код:** `ThemeMenu.tsx`, 11 test-*.mjs, 2 .traineddata, 1 .zip
- **Устаревшая конфигурация:** `metadata.json`, `render.yaml`
