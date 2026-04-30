# PuuNote - Полный Чеклист Задач (TODO)

**Дата:** 2026-04-30  
**Всего задач:** 67  
**Критических:** 10  
**Высокого приоритета:** 10  
**Среднего приоритета:** 11  
**Низкого приоритета:** 8  
**UX:** 11  
**Security:** 6  
**Performance:** 7

---

## 🔴 CRITICAL - Исправить немедленно (10 задач)

### C1: Утечка памяти в FloatingCardActions (createPortal)
- **Файл:** `src/components/FloatingCardActions.tsx:186-209`
- **Проблема:** Portal создается при каждом рендере, хотя target один
- **Решение:** Вынести portal root в константу вне компонента
- **Код:**
```typescript
// ДО: portal создается каждый раз
return createPortal(<AnimatePresence>...</AnimatePresence>, document.body)

// ПОСЛЕ: статичный root
const PORTAL_ROOT = document.getElementById('floating-actions') || document.body
// Использовать useRef для container
```
- [ ] Исправить

### C2: Утечка слушателей событий при быстрой смене activeId
- **Файл:** `src/components/FloatingCardActions.tsx:129-155`
- **Проблема:** Если activeId меняется быстро, слушатели не успевают удалиться
- **Решение:** Использовать AbortController или cleanup в начале effect
- [ ] Исправить

### C3: Range selection (Shift+click) не реализован
- **Файл:** `src/store/slices/selectionSlice.ts:18-20`
- **Проблема:** Логика для Shift+click есть, но не работает диапазонный выбор
- **Решение:** Реализовать выбор диапазона от anchor до target
- **Код:** Добавить расчет диапазона через depth-first order
- [ ] Исправить

### C4: Plugin registry существует, но нет зарегистрированных плагинов
- **Файл:** `src/plugins/registry.ts`
- **Проблема:** Система плагинов работает, но ни одного плагина не зарегистрировано
- **Решение:** Создать демо-плагин (например, для AI) и зарегистрировать его
- [ ] Исправить

### C5: Пустой catch блок вызывает ошибку линтера
- **Файл:** `src/utils/id.ts`
- **Проблема:** `catch(e) {}` - пустой блок catch ломает линтер
- **Решение:** Заменить на `catch { /* fallback */ }` или добавить обработку
- [ ] Исправить

### C6: Snapshot storage без ограничений (может переполнить IndexedDB)
- **Файл:** `src/db/snapshots.ts`
- **Проблема:** Создается snapshot при каждом действии, но нет лимита
- **Решение:** Добавить максимум 25 снапшотов на документ
- **Код:** Добавить проверку перед созданием и удаление старых
- [ ] Исправить

### C7: Failed createNewFile все равно обновляет UI
- **Файл:** `src/hooks/useFileSystem.ts`
- **Проблема:** Если транзакция падает, UI все равно показывает новый файл
- **Решение:** Не обновлять state если транзакция не удалась
- [ ] Исправить

### C8: Реальный AI provider отсутствует (только mock)
- **Файлы:** `src/domain/aiProvider.ts`, `src/domain/aiOperations.ts`
- **Проблема:** Есть только mock провайдер, нет OpenAI/Anthropic/Ollama
- **Решение:** Добавить OpenAI провайдер с API key из настроек
- [ ] Исправить

### C9: Metadata типизирован как Record<string, any>
- **Файл:** `src/types.ts:6`
- **Проблема:** `any` ломает type safety
- **Решение:** Создать строгий интерфейс для metadata
```typescript
interface NodeMetadata {
  isGenerating?: boolean;
  ai?: { provider?: string; jobId?: string; generatedAt?: string };
}
```
- [ ] Исправить

### C10: SettingsPanel смешивает русский и английский
- **Файл:** `src/components/SettingsPanel.tsx:14-40`
- **Проблема:** "Настройки", "Затенять", "Одна" - все на русском
- **Решение:** Перевести все на английский и использовать i18n
- [ ] Исправить

---

## 🟠 HIGH PRIORITY - Исправить в течение недели (10 задач)

### H1: Race condition в SnapshotPanel
- **Файл:** `src/components/SnapshotPanel.tsx:23-34`
- **Проблема:** Если activeFileId изменится во время загрузки, установит снапшоты от другого документа
- **Решение:** Capture fileId в начале, проверять перед setState
- [ ] Исправить

### H2: Zustand селекторы не оптимизированы
- **Файл:** `src/components/Card.tsx:18-39`
- **Проблема:** 10+ селекторов создают новые функции каждый рендер
- **Решение:** Использовать useShallow или комбинированные селекторы
- [ ] Исправить

### H3: Impure функция normalizeSiblingOrder
- **Файл:** `src/domain/documentTree.ts:15-22`
- **Проблема:** Мутирует входной массив nodes
- **Решение:** Вернуть новый массив вместо мутации
- [ ] Исправить

### H4: Небезопасный доступ к DOM без SSR проверки
- **Файл:** `src/components/FloatingCardActions.tsx:80-109`
- **Проблема:** document.getElementById может не существовать в SSR
- **Решение:** Добавить `if (typeof document === 'undefined') return`
- [ ] Исправить

### H5: Tree index перестраивается O(n) на каждый shift+click
- **Файл:** `src/store/slices/selectionSlice.ts:18-20`
- **Проблема:** buildTreeIndex вызывается при каждом клике
- **Решение:** Кэшировать treeIndex в сторе
- [ ] Исправить

### H6: Merge валидация пересчитывается на каждое нажатие клавиши
- **Файл:** `src/components/FloatingCardActions.tsx:52-57`
- **Проблема:** canMergeNodes вызывается при каждом изменении nodes (каждое нажатие)
- **Решение:** Мемоизировать или вызывать только при изменении selection
- [ ] Исправить

### H7: Job runner не виден пользователю
- **Файл:** `src/domain/jobRunner.ts`, `src/components/JobPanel.tsx`
- **Проблема:** Панель jobs появляется только при активных задачах, нет индикатора в Header
- **Решение:** Добавить счетчик jobs в Header/Footer
- [ ] Исправить

### H8: Нет лимита хранения для snapshots
- **Файл:** `src/db/snapshots.ts`
- **Проблема:** Можно создать бесконечное количество снапшотов
- **Решение:** Максимум 20 снапшотов на документ
- [ ] Исправить

### H9: Поисковый индекс перестраивается при каждом открытии CommandPalette
- **Файл:** `src/components/CommandPalette.tsx:71-81`
- **Проблема:** Запрос к IndexedDB каждый раз
- **Решение:** Кэшировать Fuse индекс
- [ ] Исправить

### H10: Нет undo для AI операций
- **Файл:** `src/domain/aiOperations.ts`
- **Проблема:** AI изменения нельзя отменить одной кнопкой
- **Решение:** Добавить "Revert AI changes" или автоматический снапшот
- [ ] Исправить

---

## 🟡 MEDIUM PRIORITY - Исправить в спринте (11 задач)

### M1: i18n не завершен в SettingsPanel
- **Файл:** `src/components/SettingsPanel.tsx`
- **Проблема:** Хардкод русский текст
- **Решение:** Использовать useTranslation() для всех строк
- [ ] Исправить

### M2: Магические числа в коде
- **Файлы:** Multiple
- **Примеры:**
  - `220` ms в FloatingCardActions
  - `340px` в SettingsPanel
  - `95vh` в App.tsx
- **Решение:** Вынести в именованные константы
- [ ] Исправить

### M3: Нет loading state для restore snapshot
- **Файл:** `src/components/SnapshotPanel.tsx`
- **Проблема:** Пользователь не знает что происходит во время restore
- **Решение:** Добавить spinner или toast
- [ ] Исправить

### M4: Accessibility - SettingsPanel tabs без aria
- **Файл:** `src/components/SettingsPanel.tsx:88-101`
- **Проблема:** Нет role="tab", aria-selected, aria-pressed
- **Решение:** Добавить accessibility атрибуты
- [ ] Исправить

### M5: Export dropdown не поддерживает клавиатуру
- **Файл:** `src/components/Header.tsx:204-240`
- **Проблема:** Нет Escape, focus trap, стрелок
- **Решение:** Добавить keyboard navigation
- [ ] Исправить

### M6: FullScreenModal проверка цикла O(n×depth)
- **Файл:** `src/components/FullScreenModal.tsx:50-61`
- **Проблема:** Может быть медленно на больших деревьях
- **Решение:** Оптимизировать или использовать Set
- [ ] Исправить

### M7: Дублированная логика debounce в CommandPalette
- **Файл:** `src/components/CommandPalette.tsx:84-99`
- **Проблема:** Два debounce - в коде и в memo
- **Решение:** Оставить один
- [ ] Исправить

### M8: Неиспользуемый импорт в AutoSizeTextarea
- **Файл:** `src/components/AutoSizeTextarea.tsx`
- **Проблема:** toggleCheckboxContent импортируется но не используется
- **Решение:** Удалить импорт
- [ ] Исправить

### M9: FloatingCardActions без клавиатурных триггеров
- **Файл:** `src/components/FloatingCardActions.tsx`
- **Проблема:** Только hover, нет клавиатуры
- **Решение:** Добавить горячие клавиши (P, Tab, Del)
- [ ] Исправить

### M10: Merge без подтверждения
- **Файл:** `src/components/FloatingCardActions.tsx:287-293`
- **Проблема:** Один клик и карточки сливаются
- **Решение:** Добавить confirmDialog
- [ ] Исправить

### M11: Нет visual feedback для multi-select count
- **Файл:** `src/components/Footer.tsx`
- **Проблема:** Не показывается сколько карточек выбрано
- **Решение:** Добавить счетчик в Footer
- [ ] Исправить

---

## 🟢 LOW PRIORITY - Когда будет время (8 задач)

### L1: Лишние Tailwind классы
- **Файл:** `src/App.tsx:163`
- **Проблема:** `gap-0 px-0 py-0` - избыточно
- **Решение:** Удалить
- [ ] Исправить

### L2: Организация тестовых файлов
- **Проблема:** Тесты рядом с кодом или в `__tests__`?
- **Решение:** Унифицировать структуру
- [ ] Исправить

### L3: UI для отмены Job
- **Файл:** `src/components/JobPanel.tsx`
- **Проблема:** Cancel есть, но нет подтверждения
- **Решение:** Добавить confirm
- [ ] Исправить

### L4: Неиспользуемая константа BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD
- **Файл:** `src/constants.ts:13`
- **Проблема:** Константа есть, но не используется
- **Решение:** Либо использовать, либо удалить
- [ ] Исправить

### L5: documentService.ts не используется
- **Файл:** `src/domain/documentService.ts`
- **Проблема:** Файл существует но не импортируется
- **Решение:** Проверить назначение
- [ ] Исправить

### L6: Редундантные переводы в i18n.ts
- **Файл:** `src/i18n.ts`
- **Проблема:** Записи вида "Your Documents": "Your Documents"
- **Решение:** Очистить
- [ ] Исправить

### L7: Разные размеры иконок
- **Файлы:** Multiple components
- **Проблема:** Размеры 14, 16, 18 в разных местах
- **Решение:** Стандартизировать
- [ ] Исправить

### L8: ErrorBoundary без кнопки "Попробовать снова"
- **Файл:** `src/components/ErrorBoundary.tsx`
- **Проблема:** Нет кнопки reset
- **Решение:** Добавить
- [ ] Исправить

---

## 🎨 UI/UX - Улучшения интерфейса (11 задач)

### UX1: Touch support для FloatingCardActions
- **Проблема:** Только hover - не работает на мобильных
- **Решение:** Добавить long-press или показывать при selection
- [ ] Исправить

### UX2: Смешение языков в SettingsPanel
- **Проблема:** Русский + английский
- **Решение:** Весь UI на английском + i18n
- [ ] Исправить

### UX3: Режим "hide" скрывает колонки полностью
- **Проблема:** Пользователь может потеряться
- **Решение:** Добавить breadcrumbs или "Showing X of Y branches"
- [ ] Исправить

### UX4: Active vs Selected выглядят одинаково
- **Файл:** `src/components/Card.tsx:59-65`
- **Проблема:** Оба border-l-4
- **Решение:** Active = border + shadow, Selected = bg без тени
- [ ] Исправить

### UX5: Имена снапшотов не редактируемые
- **Файл:** `src/components/SnapshotPanel.tsx`
- **Проблема:** Всегда "Manual snapshot"
- **Решение:** Добавить input для имени
- [ ] Исправить

### UX6: Job cancel без подтверждения
- **Файл:** `src/components/JobPanel.tsx:70-75`
- **Проблема:** Мгновенная отмена
- **Решение:** Confirm dialog
- [ ] Исправить

### UX7: Timeline scroll alignment проблемы
- **Файл:** `src/components/TimelineView.tsx`
- **Проблема:** align: "center" обрезает первый элемент
- **Решение:** Использовать "start" или scrollToIndex
- [ ] Исправить

### UX8: Нет горячей клавиши для Settings
- **Файл:** `src/components/Header.tsx`
- **Проблема:** Иконка Settings только в хедере
- **Решение:** Добавить Ctrl+,
- [ ] Исправить

### UX9: Theme toggle только в Palette
- **Файл:** `src/components/Header.tsx:49`
- **Проблема:** Сложно найти
- **Решение:** Добавить в Footer или Settings
- [ ] Исправить

### UX10: Delete confirmation текст слишком длинный
- **Файл:** `src/components/FloatingCardActions.tsx:266`
- **Проблема:** Перегруженный текст
- **Решение:** Сократить до "Delete card and X branches?"
- [ ] Исправить

### UX11: Нет onboarding для новых пользователей
- **Файл:** `src/App.tsx`
- **Проблема:** Много новых фич, нет tutorial
- **Решение:** Добавить interactive tour
- [ ] Исправить

---

## 🛡️ SECURITY - Безопасность (6 задач)

### S1: Plugin code injection риск
- **Файл:** `src/plugins/registry.ts:35-40`
- **Проблема:** Если плагин загружается динамически, может выполниться malicious код
- **Решение:** CSP, sandboxed iframe
- [ ] Исправить

### S2: XSS риск от SVG изображений
- **Файл:** `src/components/SafeMarkdown.tsx`
- **Проблема:** SVG могут содержать JavaScript
- **Решение:** Блокировать SVG или санитизировать
- [ ] Исправить

### S3: API ключи на клиенте нужен backend proxy
- **Файл:** `src/domain/aiProvider.ts`
- **Проблема:** API ключи видны в коде
- **Решение:** Backend proxy или env variables
- [ ] Исправить

### S4: Нет rate limiting для AI вызовов
- **Файл:** `src/domain/aiProvider.ts`
- **Проблема:** Можно сделать бесконечное количество запросов
- **Решение:** Добавить rate limiting
- [ ] Исправить

### S5: Metadata не санитизирован
- **Файл:** `src/types.ts`
- **Проблема:** Можно сохранить что угодно
- **Решение:** Валидация metadata
- [ ] Исправить

### S6: Удаленные изображения (privacy)
- **Файл:** `src/utils/markdownParser.ts`
- **Проблема:** Markdown images загружают внешние ресурсы
- **Решение:** Proxy или блокировка
- [ ] Исправить

---

## ⚡ PERFORMANCE - Производительность (7 задач)

### P1: Board view не виртуализирован
- **Файл:** `src/App.tsx:182-218`
- **Проблема:** Timeline виртуализирован, Board - нет
- **Решение:** Добавить virtualization для Board
- [ ] Исправить

### P2: Timeline Virtuoso неправильно подключен к скроллу
- **Файл:** `src/components/TimelineView.tsx`
- **Проблема:** useWindowScroll но скролл внутри #main-scroller
- **Решение:** Использовать customScrollParent
- [ ] Исправить

### P3: Tree index повторяется
- **Файлы:** `src/utils/tree.ts`, `src/domain/contextExtraction.ts`
- **Проблема:** buildTreeIndex вызывается многократно
- **Решение:** Кэшировать
- [ ] Исправить

### P4: Command palette перестраивает Fuse индекс
- **Файл:** `src/components/CommandPalette.tsx`
- **Проблема:** Новый Fuse каждый раз
- **Решение:** Мемоизировать
- [ ] Исправить

### P5: Undo хранит полные снапшоты
- **Файл:** `src/store/slices/historySlice.ts:39-41`
- **Проблема:** Полные массивы вместо patches
- **Решение:** Рассмотреть patch-based undo
- [ ] Исправить

### P6: FloatingCardActions слушатели scroll/resize
- **Файл:** `src/components/FloatingCardActions.tsx:166-180`
- **Проблема:** Множественные слушатели
- **Решение:** Debounce или throttle
- [ ] Исправить

### P7: buildContextForLLM конкатенация строк
- **Файл:** `src/domain/contextExtraction.ts:137-186`
- **Проблема:** Создает новые строки
- **Решение:** StringBuilder или ограничить maxChars
- [ ] Исправить

---

## 📊 Статистика

```
Всего задач:        67
Critical (🔴):      10
High (🟠):           10
Medium (🟡):        11
Low (🟢):            8
UX (🎨):            11
Security (🛡️):       6
Performance (⚡):      7

Готово:             0
В процессе:         0
Осталось:           67
```

---

## 🎯 Рекомендуемый порядок исправления

### Неделя 1 (Critical)
1. C5 - Починить lint (5 мин)
2. C10 - Перевести SettingsPanel (30 мин)
3. C6 - Добавить лимит snapshots (30 мин)
4. C9 - Типизировать metadata (1 час)
5. C1 - Memory leak FloatingCardActions (1 час)
6. C2 - Event listener leak (1 час)
7. C3 - Range selection (2 часа)
8. C7 - Failed createNewFile (30 мин)
9. C4 - Создать демо-плагин (2 часа)
10. C8 - Добавить OpenAI провайдер (3 часа)

### Неделя 2 (High Priority)
11-20. Все H1-H10

### Неделя 3 (Medium + Low)
21-38. Все M1-M11 и L1-L8

### Неделя 4 (UX)
39-49. Все UX1-UX11

### Неделя 5 (Security + Performance)
50-62. Все S1-S6 и P1-P7

---

## ✅ Definition of Done

Для каждой задачи:
- [ ] Код изменен
- [ ] Тесты проходят (npm run test)
- [ ] Линтер проходит (npm run lint)
- [ ] TypeScript проходит (npm run typecheck)
- [ ] Билд проходит (npm run build)
- [ ] Проверено вручную (если UX)

---

**Создан:** 2026-04-30  
**Автор:** moonshotai/kimi-k2.5  
**На основе:** 8 аудитов от разных моделей
