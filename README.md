# PuuNote

PuuNote — local-first редактор нелинейных Markdown-документов. Документ хранится не как один длинный текст, а как дерево карточек: главные идеи остаются слева, уточнения и детали раскрываются вправо в соседних колонках.

Проект подходит для планов, сценариев, конспектов, исследований, заметок и любых материалов, где важна структура. Данные хранятся локально в браузере через IndexedDB; сервер для работы с заметками не нужен.

## Возможности

- **Горизонтальное дерево карточек.** Корневые карточки находятся слева, дочерние карточки раскрываются вправо.
- **Фокус ветки.** Активная ветка подсвечивается, неактивные ветки можно затемнять или скрывать.
- **Markdown-редактор.** Карточки хранят Markdown, render поддерживает GitHub Flavored Markdown через `remark-gfm`.
- **Visual editor.** Визуальный режим на Tiptap поддерживает базовое форматирование, списки, задачи и ссылки. Он не является полной GFM-заменой: сложные таблицы и нестандартный Markdown лучше редактировать в Markdown-режиме.
- **Импорт и экспорт.** Поддерживаются Markdown, structured Markdown и lossless JSON export/import.
- **Repair при импорте.** Поврежденные или неоднозначные данные нормализуются с предупреждением, чтобы пользователь видел, что импорт был исправлен.
- **Undo/redo.** Текстовый ввод группируется, поэтому `Ctrl/Cmd+Z` не отменяет набор по одной букве. История пока хранит полные снимки документа.
- **Snapshots.** Можно вручную сохранять снимки документа и возвращаться к ним.
- **Command Palette.** `Ctrl/Cmd+K` открывает быстрые команды и поиск. Поиск учитывает несохраненные изменения активного документа.
- **Timeline view.** Линейное чтение дерева depth-first потоком.
- **Drag & Drop.** Карточки можно переставлять и переносить между ветками мышью.
- **RU/EN интерфейс.** Язык переключается в Settings.
- **Темы.** Светлая, темная, синяя и коричневая темы. Шрифт заголовков подключен локально.

## Стек

- React 19, TypeScript, Vite 6.
- Zustand для состояния.
- Dexie/IndexedDB для локального хранения документов и snapshots.
- Tailwind CSS 4.
- `react-markdown`, `remark-gfm`, `remark-breaks`, `rehype-sanitize`.
- Tiptap для visual editor.
- Fuse.js для поиск.
- Zod для валидации импортируемых и сохраненных nodes.
- Vitest для regression tests.

## Локальный запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

По умолчанию `npm run dev` слушает только `127.0.0.1`. Для осознанного тестирования с другого устройства в локальной сети используйте:

```bash
npm run dev:lan
```

## Проверки

```bash
npm run test
npm run typecheck
npm run lint
npm run format:check
npm run build
```

Текущее состояние после последнего аудита:

- `test` проходит.
- `typecheck` проходит.
- `lint` проходит без warnings.
- `format:check` проходит.
- `build` проходит, но главный JS chunk остается крупным.

## Модель данных

Основная структура документа — плоский массив `PuuNode[]`:

- `id` — идентификатор карточки.
- `content` — Markdown-содержимое.
- `parentId` — id родительской карточки или `null`.
- `order` — порядок среди соседей.
- `metadata` — служебные поля для будущих расширений.

Дерево восстанавливается через `buildTreeIndex(nodes)`: строятся `nodeMap` и `childrenMap`, после чего UI формирует колонки, active path и timeline.

## AI/plugin foundation

В коде есть экспериментальная основа для AI-команд, фоновых jobs и будущих plugins:

- `JobRunner` для фоновых задач.
- `takeDocumentSnapshot()` перед крупными изменениями.
- `buildContextForLLM()` для сборки контекста ветки.
- `PluginRegistry` для базовых node events.
- Mock AI-команда для draft child cards.

Это пока **не публичная plugin-платформа** и не полноценная AI-интеграция. Перед реальными внешними AI providers или сторонними plugins нужны consent/preview отправляемого контекста, permissions, sandbox, API key policy и audit log.

## Важные инженерные правила

- Не удалять Markdown mode и Visual mode: оба режима являются частью продукта.
- Не писать напрямую в `nodes` без доменных операций, если изменение касается структуры дерева.
- Перед массовыми или AI-операциями делать snapshot.
- Не подключать внешний AI к приватным заметкам без явного preview и consent.
- Не развивать публичные plugins без manifest/permissions/sandbox.

## Известные проблемы

> Последнее обновление: 14 мая 2026. Критические (P0) проблемы закрыты. Ниже — то, с чем можно жить.

### Архитектура и качество кода

**Дублирование логики тем.**  
`setTheme` и `toggleTheme` в `uiSlice.ts` содержат почти идентичную логику сохранения branch-settings при смене темы. Не влияет на работу, но усложняет поддержку. Рекомендация: извлечь общую функцию `switchThemeWithBranchSettings`.

**`as any` в selectionSlice.ts.**  
Единственный `as any` во всём `src/` — обход типов для обновления поля из другого slice. Рекомендация: использовать `Partial<AppState>` return type.

**`useFileSystem.ts` — перегруженный хук (483 строки).**  
Смешивает init-логику, auto-save, file CRUD, title derivation и dirty-save recovery. Работает стабильно, но труден для чтения. Рекомендация: разделить на `useFileSystemInit`, `useFileSystemAutoSave` и `fileSystemActions.ts`.

**Повторяющийся паттерн в setBranchColor\* сеттерах.**  
8 сеттеров в `uiSlice.ts` содержат идентичный паттерн. Рекомендация: создать generic-функцию `createBranchSettingSetter(key)`.

**`markdownParser.ts` — высокая сложность.**  
Три параллельные реализации парсинга Markdown (plain, structured, separator-based). Работает корректно, но труден для ревью и тестирования.

### Производительность больших документов

**Undo/redo хранит полные снимки документа.**  
Каждый шаг undo сохраняет полную копию массива `PuuNode[]`. `HISTORY_LIMIT = 50` ограничивает стек. Для типичного использования (~100–300 узлов) это приемлемо. При >500 узлов может потребоваться переход на diff-based history.

**BoardView без виртуализации.**  
Timeline view виртуализирован, а основная доска рендерит все видимые карточки. На >200 карточках возможны лаги. Виртуализация BoardView рискованна: нужно не сломать scroll alignment, active path, floating actions и DnD.

**Обновление текста проходит через массив nodes.**  
Одна правка карточки обновляет массив через `nodes.map`. Сейчас это смягчено debounce и grouped undo, но для очень больших документов нормализованное хранение `nodesById + childrenIds` может стать следующим архитектурным шагом.

**Поисковый индекс загружает все документы.**  
`getSearchNodes` загружает все документы для построения индекса. Кэш на основе signatures ускоряет повторные вызовы, но при >100 документов может быть медленным.

### Тестирование

**Persistence tests покрыты не полностью.**  
Есть regression tests на autosave race, pending save success/error и delete flow, но полного тестового покрытия `init/switch/dirty backup/snapshot restore/quota` еще нет.

**`moveNodes` не валидирует перемещение в собственного потомка.**  
`moveNodes` в `documentSlice.ts` не проверяет, что целевой узел не является потомком перемещаемого. На практике UI не позволяет такой DnD, но на уровне store защита отсутствует.

### UX, i18n и accessibility

**I18n неполный.**  
Основной RU/EN интерфейс есть, но не все visible strings, tooltips, aria labels и toast-сообщения полностью локализованы.

**Accessibility закрыта частично.**  
WYSIWYG toolbar получил `title`/`aria-label`, но карточки, DnD и часть keyboard/touch alternatives требуют отдельного accessibility pass.

**Visual editor не имеет полной GFM parity.**  
Markdown-render поддерживает GFM, но Tiptap visual mode покрывает только базовый набор форматирования. Для сложных таблиц и нестандартного Markdown безопаснее Markdown mode.

**Timeline click-to-edit отличается от BoardView.**  
В Timeline клик быстрее приводит к редактированию, чем на основной доске.

### Security/product boundaries

**AI-команда сейчас mock-only.**  
Команда AI draft child cards не является настоящей внешней AI-интеграцией. Перед реальным provider нужен отдельный UX с preview контекста, consent, настройками ключей и audit log.

**Plugin foundation небезопасен как публичная платформа.**  
Сейчас это внутренний foundation (`PluginRegistry` в `src/plugins/registry.ts`, ни одного зарегистрированного плагина). Для публичных plugins нужны manifest, permissions, sandbox, versioning и transaction API.

**CSP/security headers для static hosting не настроены.**  
Для локального прототипа это не блокер. Для публичного hosting стоит добавить CSP и базовые security headers.

### Tooling и сопровождение

**Production bundle крупный.**  
Сборка проходит, но главный chunk больше 500 kB. Основная причина — тяжелые зависимости редактора и UI. Следующий шаг — lazy-load `WysiwygEditor`/Tiptap.

**`format:check` и `typecheck` не включены в CI.**  
Оба проходят локально. Следующий шаг — добавить в `.github/workflows/ci.yml`.

**ESLint можно усилить.**  
Текущий lint чистый, но нет type-aware rules и `jsx-a11y`. Включать лучше поэтапно.

**Зависимости устарели.**  
Уязвимостей по `npm audit` не было, но часть пакетов имеет новые major/minor версии. Обновлять лучше отдельной веткой с полным regression pass.
