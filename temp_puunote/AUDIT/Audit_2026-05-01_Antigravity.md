# Подробный аудит проекта PuuNote

**Дата:** 2026-05-01
**Аудитор:** Antigravity (Gemini)
**Версия проекта:** React 19 + Vite 6 + Tailwind CSS 4 + Dexie.js

---

## 1. Описание проекта

**PuuNote** — local-first, нелинейный Markdown-редактор с горизонтальной древовидной визуализацией (mind-map / канбан-подобный). Мысли "ветвятся" слева направо, каждая карточка — узел дерева (`PuuNode`), связанный с родителем через `parentId` и отсортированный по `order`.

### Стек
| Слой | Технологии |
|---|---|
| UI | React 19, Tailwind CSS 4, lucide-react, framer-motion (`motion`) |
| Стейт | Zustand + subscribeWithSelector, 4 слайса |
| Хранилище | IndexedDB (Dexie.js), localStorage (настройки, dirty-save) |
| Markdown | react-markdown + remark-gfm + rehype-sanitize |
| Поиск | fuse.js |
| Валидация | zod |
| AI | Собственный AiProvider + JobRunner + mock-провайдер |
| Сборка | Vite 6, manual chunks |

### Архитектура (слои)
```
components/ → UI (Card, Header, Footer, CommandPalette, модалки)
hooks/      → React-хуки (hotkeys, layout, preferences, file system)
store/      → Zustand (ui, selection, history, document слайсы)
domain/     → Чистая бизнес-логика (documentTree, documentService, AI)
plugins/    → PluginRegistry (хуки жизненного цикла, card actions)
db/         → Dexie (схема, снепшоты)
utils/      → tree, schema, id, cn, markdownParser, fullscreen
```

---

## 2. Удачные решения ✅

1. **Чистый `documentApi`** — все мутации дерева (`addChild`, `moveNodes`, `mergeNodes`, `splitNode`) — чистые функции, возвращают новые массивы. Легко тестируемы, не зависят от React.

2. **`JobRunner` с `AbortSignal`** — атомарное управление фоновыми задачами. Поддержка прогресса, отмены, автоочистки. Идеальная основа для AI-pipeline.

3. **Snapshot-система** — автоматические бэкапы перед деструктивными операциями (AI-генерация). Pruning (max 25 на документ). Грамотная обработка `QuotaExceededError`.

4. **Zustand slice-архитектура** — разбиение стора на 4 изолированных слайса (`ui`, `selection`, `history`, `document`) + `subscribeWithSelector` для точечных подписок.

5. **Zod-валидация с self-repair** — `validateNodesWithReport` не просто отвергает невалидные данные, а пытается починить (deduplicate IDs, fix orphan parents, detect cycles, enforce depth limit 200). Это делает импорт/загрузку устойчивыми к повреждениям.

6. **`cn()` утилита** — чистый фильтр falsy-классов без зависимости от `clsx`/`twMerge`. Минимальный footprint.

7. **Clipboard-система** — тройной формат (plain markdown + HTML с embedded JSON + custom MIME). Fallback через HTML `<meta>` тег + кеш последнего копирования для приложений, блокирующих custom MIME.

8. **Focus trap** (`useFocusTrap`) — правильная реализация с восстановлением фокуса, поддержкой `data-autofocus`, Tab-cycling.

9. **`buildBoardColumns` с "active corridor"** — умная визуализация: показывает только ветви, связанные с активным узлом, скрывая нерелевантные поддеревья.

10. **Dirty-save механизм** — `saveDirtyNodes` в localStorage перед `beforeunload`/`pagehide`/`visibilitychange:hidden`, с восстановлением при следующем запуске. Минимизирует потерю данных.

---

## 3. Проблемы и находки 🔴🟡

### 3.1 Архитектурные проблемы

#### 🔴 P1 — Сайд-эффекты в Zustand-слайсах
**Файл:** `documentSlice.ts`
Каждая мутация (`addChild`, `deleteNode`, `mergeNodes`...) вручную вызывает `PluginRegistry.emitNodeCreated/Updated/Deleted` внутри тела слайса. Это:
- Дублирует один и тот же паттерн 8+ раз
- Смешивает ответственность (store = хранилище, не оркестратор)
- Усложняет добавление новых хуков (logging, analytics, undo-metadata)

**Решение:** Zustand middleware, который перехватывает изменения `nodes` и автоматически diff'ит массив, вызывая нужные emit'ы.

#### 🟡 P2 — Массив вместо Map для `nodes`
**Файл:** `appStoreTypes.ts`, все компоненты
`nodes: PuuNode[]` требует O(n) поиска через `nodes.find(n => n.id === id)`. В `documentTree.ts` для каждой операции вызывается `buildTreeIndex(nodes)`, создающий два `Map` заново. Для документов с 5000+ узлов это станет bottleneck.

**Решение (фаза 2):** Нормализованное хранение `Record<string, PuuNode>` + отдельный массив порядка. Или минимально — кешировать `TreeIndex` в сторе и инвалидировать при изменениях.

#### 🟡 P3 — `useFileSystem.ts` содержит модульный стейт
**Файл:** `useFileSystem.ts:9-13,15`
```typescript
const pendingSave: { timer, fileId, nodes } = { ... };
let isHydratingFile = false;
```
Мутабельные переменные на уровне модуля. Работает в SPA, но:
- Невозможно тестировать изолированно (shared state между тестами)
- При Hot Module Replacement значения не сбрасываются
- Два экземпляра модуля (SSR, microfrontend) создадут race condition

#### 🟡 P4 — Двойная title-деривация
**Файл:** `useFileSystem.ts:166-230`
При изменении `nodes` title документа пересчитывается дважды: один раз в `deriveDocumentTitle` (строка 214), и ещё раз в `updateDocumentTitleInStore`. Оба вызова происходят в одном подписчике.

### 3.2 Проблемы UI/UX

#### 🟡 P5 — D&D overlay-индикаторы не сбрасываются при потере фокуса окна
**Файл:** `Card.tsx:161`
`onDragLeave` сбрасывает `dropTarget`, но если пользователь переключит вкладку/окно во время drag'а, `dragend` может не сработать, и `draggedId` зависнет в сторе. Глобальный `dragend` обработчик в `App.tsx` отсутствует.

**Решение:** Добавить `window.addEventListener('dragend', () => setDraggedId(null))`.

#### 🟡 P6 — Toolbar-кнопки в editing mode доступны только при hover
**Файл:** `Card.tsx:212`
```
opacity-0 group-hover/edit:opacity-100
```
На touch-устройствах кнопки "Split node" и "Expand to fullscreen" недоступны. Нужно показывать их всегда при `isEditing` на touch-устройствах (`pointer: coarse`).

#### 🟡 P7 — Динамический z-index в App.tsx
**Файл:** `App.tsx`
`zIndex: Math.max(1, 30 - colIndex)` — ad-hoc z-index арифметика. С ростом числа overlays/modals это приведёт к "z-index wars".

#### 🟡 P8 — Export menu: дублирование паттерна outside-click
**Файлы:** `Header.tsx:57-69`, `CommandPalette.tsx`
Одинаковый паттерн `useEffect` + `pointerdown` + `ref.contains`. Нужен один `useClickOutside` хук.

### 3.3 Потенциальные баги

#### 🔴 P9 — `browserDownload.ts` — утечка Object URL
**Файл:** `browserDownload.ts:15`
```typescript
setTimeout(() => URL.revokeObjectURL(url), 100);
```
100ms — слишком мало для больших файлов на медленных устройствах. Если браузер не успеет начать загрузку, URL будет revoked, и скачивание оборвётся. Безопаснее использовать `URL.revokeObjectURL` в обработчике `a.addEventListener('click', ...)` или увеличить таймаут до 5000ms.

#### 🟡 P10 — `useAppHotkeys` — пустой dependency array при capture
**Файл:** `useAppHotkeys.ts:133,278`
Два `useEffect` с пустыми dependency arrays `[]` регистрируют глобальные обработчики один раз. Внутри них используется `useAppStore.getState()`, что корректно. Но `handleGlobalPaste` (строка 178) деструктурирует `state` и использует `setNodes` — если бы этот `setNodes` менялся (что в Zustand не происходит), была бы stale closure. Сейчас работает, но хрупко.

#### 🟡 P11 — `CommandPalette` загружает ВСЕ узлы всех документов
**Файл:** `CommandPalette.tsx:87-100`, `documentService.ts:281-308`
`getSearchNodes` загружает `db.files.toArray()` — все документы целиком — и создаёт Fuse-индекс. При 50 документах по 1000 узлов = 50K записей в памяти. Решение: lazy-загрузка, Web Worker, или ограничение индекса текущим документом + заголовками других.

#### 🟡 P12 — `restoreSnapshot` не сбрасывает `editingId`
**Файл:** `snapshots.ts:88-89`
При восстановлении снепшота сбрасывается только `activeId`, но не `editingId`. Если пользователь восстанавливает снепшот во время редактирования карточки, текстовый редактор будет указывать на несуществующий узел.

### 3.4 Дублирование и мусор

#### 🟡 P13 — Тройное дублирование prose-классов
**Файл:** `proseClasses.ts`
`PROSE_CARD`, `PROSE_FULL`, `PROSE_TIMELINE` содержат ~70% идентичного кода. Общие стили (`prose-headings:font-serif`, `prose-a:text-app-accent`, `prose-hr:...`, `prose-code:...`) повторяются буквально.

**Решение:** Извлечь `PROSE_BASE` и композировать: `cn(PROSE_BASE, PROSE_CARD_SPECIFIC)`.

#### 🟡 P14 — `orderedChildren` дублируется 3 раза
Функция сортировки детей по `order` существует в:
- `useBoardLayout.ts:6-13` — `orderedChildren()`
- `tree.ts:22-28` — `orderedChildrenFromIndex()`
- `documentTree.ts:28-29` — `sortByOrder()`

Нужно унифицировать в `tree.ts` и реэкспортировать.

#### 🟡 P15 — Неиспользуемый `computeAncestorPath` (без Index)
**Файл:** `tree.ts:49-54`
`computeAncestorPath` создаёт индекс заново. Везде в коде используется `computeAncestorPathFromIndex`. Wrapper-функция может быть удалена или помечена как deprecated.

#### 🟡 P16 — Неиспользуемый `idCounter` fallback
**Файл:** `id.ts:1`
`idCounter` инкрементируется при каждом вызове, но используется только в fallback-ветке, когда `crypto.randomUUID` недоступен. В современных браузерах (все поддерживающие React 19) этот код никогда не исполнится.

### 3.5 Безопасность

#### 🟡 P17 — `rehype-sanitize` разрешает `<img>` теги
**Файл:** `SafeMarkdown.tsx:24-31`
Фильтр удаляет `svg, math, style, script, iframe`, но пропускает `<img>`. Тег `<img>` с `onerror` JS handler'ом будет заблокирован sanitizer'ом (он удаляет event-атрибуты), но `<img src="https://tracker.evil.com/pixel.gif">` пройдёт — утечка IP/timing через tracking pixel. Для local-first приложения это приемлемо, но стоит документировать.

#### 🟡 P18 — `saveDirtyNodes` в localStorage без size-check
**Файл:** `documentService.ts:240-244`
`JSON.stringify({ fileId, nodes })` для большого документа может превысить лимит localStorage (5-10MB). Ошибка `QuotaExceededError` обрабатывается только в `snapshots.ts` и `useFileSystem.ts`, но не в `saveDirtyNodes`. Вызывающий код в `useFileSystem.ts:256-261` ловит generic ошибку через `console.error`, но не уведомляет пользователя.

### 3.6 Мелкие замечания

| # | Файл | Замечание |
|---|---|---|
| P19 | `Footer.tsx:75-77` | Лишние `{" "}` JSX-фрагменты (артефакт форматирования). Безвредно, но засоряет DOM. |
| P20 | `Header.tsx:117` | Длинные inline className-строки (100+ символов). `cn()` уже доступна — стоит применять. |
| P21 | `usePreferences.ts:85` | Комментарий `/* Sync to LocalStorage & DOM */` стоит на строке с закрывающей `]` useEffect. Выглядит как ошибка форматирования. |
| P22 | `markdownParser.ts:235-237` | `separatorRegex` проверяет условие, которое уже было true на строке 231. Dead code. |
| P23 | `documentService.ts:54` | `updatedAt` хранится как `string` в Dexie, но как `number` в runtime типе `PuuDocument`. Конвертация `String()`/`parseUpdatedAt()` — лишний слой. |

---

## 4. Сводная таблица приоритетов

| Приоритет | ID | Категория | Краткое описание |
|---|---|---|---|
| 🔴 High | P1 | Архитектура | Plugin emit'ы в слайсах — вынести в middleware |
| 🔴 High | P9 | Баг | `revokeObjectURL` timeout слишком мал |
| 🟡 Medium | P2 | Производительность | `nodes[]` → нормализованное хранение |
| 🟡 Medium | P5 | UX | D&D `draggedId` может зависнуть |
| 🟡 Medium | P6 | A11y | Toolbar недоступен на touch |
| 🟡 Medium | P11 | Производительность | CommandPalette загружает все документы |
| 🟡 Medium | P12 | Баг | `restoreSnapshot` не сбрасывает editingId |
| 🟡 Medium | P13 | Дублирование | Prose-классы — 70% копипаст |
| 🟡 Medium | P14 | Дублирование | `orderedChildren` × 3 |
| 🟡 Low | P3 | Архитектура | Module-level mutable state |
| 🟡 Low | P4 | Дублирование | Двойная title-деривация |
| 🟡 Low | P7 | UX | Ad-hoc z-index |
| 🟡 Low | P8 | Дублирование | Outside-click паттерн |
| 🟡 Low | P15-P23 | Мелочи | Cleanup, dead code, formatting |

---

## 5. Вектор развития: API для AI-плагинов

### Текущее состояние
Проект **отлично подготовлен** к расширению. Ключевые кирпичики:
- `PluginRegistry` — хуки жизненного цикла + card actions
- `AiProviderRegistry` — регистрация провайдеров + expand-card операция
- `JobRunner` — progress, cancellation, AbortSignal
- `contextExtraction` — бюджетированный текстовый контекст для LLM
- `documentApi` — чистые мутации, безопасные для вызова из любого контекста

### Рекомендуемая архитектура API

```
┌──────────────────────────────────┐
│  window.PuuNote (Public Facade)  │
│  ┌─────────┬──────────┬───────┐  │
│  │commands │ plugins  │  ai   │  │
│  │─────────┼──────────┼───────│  │
│  │addChild │register  │prompt │  │
│  │update   │unregister│stream │  │
│  │delete   │cardAction│cancel │  │
│  │search   │hooks     │config │  │
│  └─────────┴──────────┴───────┘  │
│            ▼                     │
│     Validation Layer (Zod)       │
│            ▼                     │
│   documentApi / useAppStore      │
└──────────────────────────────────┘
```

### Ключевые шаги

1. **`window.PuuNote` фасад** — проксирует вызовы в `documentApi` и `useAppStore` с валидацией входных данных через Zod.

2. **Sandbox для пользовательских плагинов** — `iframe sandbox="allow-scripts"` + `postMessage` API для безопасного исполнения. Для trusted-режима (local-only) — `new Function()`.

3. **Executable Cards** — карточки с тегом `[plugin]`, содержащие JavaScript. Кнопка "Run" регистрирует плагин в `PluginRegistry`.

4. **Unified AI Client** — `PuuNote.ai.generate({ messages, model? })`. Настройки провайдера (API key, endpoint) — в Settings panel. Поддержка OpenAI, Anthropic, Ollama через единый интерфейс.

---

## 6. Резюме

PuuNote — **зрелый, хорошо структурированный** проект с продуманной архитектурой. Основные слабости — это не ошибки проектирования, а типичный "долг роста": дублирование паттернов, несколько ad-hoc решений в UI, и отсутствие middleware-слоя для автоматизации сайд-эффектов. Критических уязвимостей или блокирующих багов **не обнаружено**. Проект готов к следующей фазе — построению публичного API для AI-плагинов.
