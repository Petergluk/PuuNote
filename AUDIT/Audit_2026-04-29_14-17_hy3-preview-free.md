# Audit Report: PuuNote (Updated)
**Date:** 2026-04-29_14-17  
**Model:** hy3-preview-free  
**Scope:** Full updated project analysis (Post-iteration audit, regression check)

---

## 1. Project Overview (Current State)

**PuuNote 0.4** — локальный нелинейный редактор заметок с горизонтальной древовидной структурой. Контент организован как карточки-узлы, ветвящиеся слева направо.

### Key New Features (Since Last Audit):
- Виртуальный скроллинг для Timeline (react-virtuoso)
- Инфраструктура плагинов и извлечения контекста для LLM
- Множественный выбор узлов и их объединение
- Улучшенный импорт файлов и безопасность
- Система снимков (snapshots) для макро-отмены
- Фоновые задачи через JobRunner

### Tech Stack:
| Layer | Technology |
|-------|------------|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 6 |
| State Management | Zustand v5 + subscribeWithSelector |
| Styling | Tailwind CSS 4 + CSS Variables |
| Database | Dexie (IndexedDB) |
| Markdown | react-markdown + remark-gfm + rehype-sanitize |
| Animation | Motion (v12, замена Framer Motion) |
| Icons | Lucide React |
| Validation | Zod v4 |
| Search | Fuse.js (Command Palette) |
| Notifications | Sonner |

---

## 2. Architecture & Structure

### Updated Directory Structure:
```
src/
├── main.tsx                      # Entry point
├── App.tsx                       # Root component (layout, modals)
├── index.css                     # Global styles + Themes
├── i18n.ts                       # i18next config (Все еще есть мусор!)
├── types.ts                      # Core interfaces
├── constants.ts                  # App constants
├── components/                   # UI (Card, Header, Timeline, CommandPalette, etc.)
├── hooks/                        # Custom hooks (fileSystem, boardLayout, hotkeys, preferences)
├── store/
│   ├── useAppStore.ts           # Central Zustand store
│   └── useJobStore.ts           # Job progress store
├── domain/                       # Новый слой бизнес-логики
│   ├── documentTree.ts          # Логика дерева (moveNode вынесен сюда)
│   ├── contextExtraction.ts     # Подготовка контекста для LLM
│   └── jobRunner.ts             # Фоновые задачи
├── utils/                        # Утилиты (tree.ts, id.ts, schema.ts, markdownParser.ts)
├── db/
│   ├── db.ts                    # Dexie setup
│   └── snapshots.ts             # Система снимков (пока без UI)
├── plugins/
│   └── registry.ts              # Реестр плагинов (пока без UI)
└── vendor/                       # Vite manual chunks (vite.config.ts)
```

---

## 3. Previous Issues Status

| № | Issue | Status | Notes |
|---|-------|--------|-------|
| 1 | Редundant i18n (key===value) | ❌ НЕ ИСПРАВЛЕНО | `i18n.ts:11-63` все еще полон мусора |
| 2 | buildTreeIndex пересчет | ❌ НЕ ИСПРАВЛЕНО + ХУЖЕ | Вызывается даже в `contextExtraction.ts:19` |
| 3 | Дублирование дедупликации | ⚠️ ЧАСТИЧНО | Логика разделена, но все еще дублируется |
| 4 | Сложный moveNode | ✅ УЛУЧШЕНО | Перенесен в `domain/documentTree.ts`, но логика сложна |
| 5 | Неэффективный скроллинг | ❌ НЕ ИСПРАВЛЕНО | Двойной RAF, DOM-запросы без отмены |
| 6 | False positive в markdownParser | ❌ НЕ ИСПРАВЛЕНО | Все еще `includes` вместо `startsWith` |
| 7 | Error handling в useFileSystem | ❌ СТАЛО ХУЖЕ | Пустые catch-блоки глотают ошибки |
| 8 | Длинная строка классов | ❌ НЕ ИСПРАВЛЕНО | `Card.tsx:188` ~800+ символов |

---

## 4. New Issues Found

### 4.1 Critical Issues
1. **Пустые catch-блоки**  
   - `src/hooks/useFileSystem.ts:341-343` — ошибка полностью поглощается без логирования  
   - Решение: Добавить `console.error` или проброс ошибки

2. **Ложная детекция формата**  
   - `src/utils/markdownParser.ts:39` — `mdText.includes(PUUNOTE_FORMAT_MARKER)`  
   - Решение: Заменить на `mdText.startsWith(PUUNOTE_FORMAT_MARKER)`

3. **Кеширование индекса дерева**  
   - `buildTreeIndex` вызывается без кеширования в 6+ местах  
   - Решение: Мемоизировать результат по ссылке на массив `nodes`

### 4.2 Major Issues
1. **Нет UI для новых фич**:
   - Плагины (`plugins/registry.ts`) — есть инфраструктура, нет интерфейса
   - Снимки (`db/snapshots.ts`) — есть функции, нет управления
   - Фоновые задачи (`domain/jobRunner.ts`) — нет индикаторов прогресса

2. **Длинные строки классов**:
   - `Card.tsx:188` ~800 символов (prose classes)
   - `TimelineView.tsx:177` ~600 символов
   - Решение: Вынести в константы или использовать `clsx`

3. **Неиспользуемые импорты**:
   - `TimelineView.tsx:10` — `getDepthFirstNodes` импортирован, но не используется корректно

### 4.3 Minor Issues
1. **Опечатка** — `snapshots.ts:22`: `QuotaExceededError` (пропущена 'c')  
2. **HMR-проблема** — `utils/id.ts:1`: `idCounter` сбрасывается при горячей перезагрузке  
3. **Theme check** — `usePreferences.ts:30-34`: `theme.includes("blue")` может сработать на частичные совпадения  

---

## 5. Positive Changes Since Last Audit

1. ✅ **Слой Domain** — Логика дерева вынесена из стора в `domain/documentTree.ts`
2. ✅ **Виртуальный скроллинг** — TimelineView использует `react-virtuoso`
3. ✅ **Контекст для LLM** — `domain/contextExtraction.ts` готовит данные для ИИ
4. ✅ **Система плагинов** — Базовый реестр в `plugins/registry.ts`
5. ✅ **Снимки (Snapshots)** — Макро-отмена через `db/snapshots.ts`
6. ✅ **JobRunner** — Управление фоновыми задачами с отменой
7. ✅ **Code Splitting** — Vite настроен на ручные чанки (`vite.config.ts:17-23`)
8. ✅ **Валидация** — Zod-схемы в `utils/schema.ts`
9. ✅ **Тесты** — Базовые тесты для `tree.ts` и `documentTree.ts`

---

## 6. Checklist of All Current Issues

### Critical Priority
- [ ] Пустые catch-блоки в `useFileSystem.ts:341-343`
- [ ] Ложная детекция формата в `markdownParser.ts:39`
- [ ] Отсутствие кеширования `buildTreeIndex`

### High Priority
- [ ] Редundant i18n переводы в `i18n.ts`
- [ ] Длинные строки классов в `Card.tsx` и `TimelineView.tsx`
- [ ] Неэффективный скроллинг в `useBoardLayout.ts`
- [ ] Отсутствие UI для плагинов, снимков, задач
- [ ] Нет реализации API для ИИ (только инфраструктура)

### Medium Priority
- [ ] Дублирование логики дедупликации в сторе
- [ ] Сложная логика `moveNode` в `documentTree.ts`
- [ ] Неиспользуемые импорты в `TimelineView.tsx`
- [ ] HMR-проблема с `idCounter` в `utils/id.ts`

### Low Priority
- [ ] Опечатка `QuotaExceededError` в `snapshots.ts:22`
- [ ] Частичная проверка темы в `usePreferences.ts`

---

## 7. Future Development Roadmap

### 7.1 AI Features Integration (Next Priority)
1. **Создать API-слой**:
   ```
   src/services/ai.ts
   ```
   - Абстракция провайдеров (OpenAI, Anthropic)
   - Управление API-ключами (только через бэкенд!)

2. **UI для ИИ**:
   - Добавить кнопку "Generate" на карточку (использовать `metadata.isGenerating`)
   - Индикатор прогресса через `JobRunner`
   - Настройки модели в Preferences

3. **Пример потока**:
   ```typescript
   // Карточка -> "Expand with AI"
   JobRunner.runJob("AI Generation", async (updateProgress, checkCancelled) => {
     updateProgress(10, "Building context...");
     const context = buildContextForLLM(nodes, nodeId);
     
     updateProgress(30, "Calling LLM...");
     const result = await aiService.generate(context.textContext);
     
     checkCancelled();
     updateProgress(80, "Updating document...");
     // Обновление узла сгенерированным контентом
   });
   ```

### 7.2 Plugin System Completion
1. **Загрузчик плагинов** — `plugins/loader.ts` для динамического импорта
2. **Интеграция с UI** — Добавить меню действий плагинов в `Card.tsx`
3. **Управление плагинами** — Страница настроек с включением/отключением

### 7.3 Performance Optimization
1. **Мемоизация индекса дерева**:
   ```typescript
   // utils/tree.ts
   let cachedIndex: TreeIndex | null = null;
   let cachedNodesRef: PuuNode[] | null = null;
   
   export const getTreeIndex = (nodes: PuuNode[]): TreeIndex => {
     if (cachedNodesRef === nodes) return cachedIndex!;
     cachedNodesRef = nodes;
     cachedIndex = buildTreeIndex(nodes);
     return cachedIndex;
   };
   ```

2. **Оптимизация скроллинга** — Использовать `IntersectionObserver` вместо ручных вычислений

### 7.4 Code Quality
1. **Удалить мусор** — Очистить `i18n.ts` от key===value переводов
2. **Рефакторинг классов** — Вынести длинные prose-строки в константы
3. **Тесты** — Покрыть edge cases для `documentTree.ts`, добавить интеграционные тесты

---

## 8. Conclusion

Проект шагнул вперед: появился доменный слой, инфраструктура для ИИ и плагинов, виртуальный скроллинг. Однако **старые проблемы не решены**, а некоторые (пустые catch-блоки) стали даже хуже.

**Ближайшие шаги**:
1. Исправить критические проблемы (catch-блоки, детекция формата, кеширование индекса)
2. Интегрировать ИИ-фичи (есть база, нужен UI и API-слой)
3. Удалить мусор и оптимизировать производительность

Проект готов к внедрению ИИ-функций — есть `contextExtraction`, `JobRunner`, флаги `isGenerating`. Нужно только "сшить" это с интерфейсом и бэкендом.