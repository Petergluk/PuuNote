# Аудит PuuNote

- Дата: 2026-05-01
- Модель: codex-gpt-5
- Репозиторий: `/Users/petergluk/GitHub/PuuNote`
- Метод: статический просмотр кода, запуск `lint/test/build/audit/outdated`, проверка UI через dev-сервер в desktop/mobile viewport.

## Краткий вывод

PuuNote - local-first редактор карточек с горизонтальным деревом. Идея и базовая архитектура логичные: плоская модель узлов, отдельный `documentApi` для операций с деревом, Zustand-слайсы, Dexie/IndexedDB, Markdown/JSON импорт-экспорт, снапшоты и зачаток AI/job/plugin слоя.

Но текущее состояние нельзя считать стабильным: `npm run build` падает на TypeScript, `npm run test` падает на конфликтующем тесте, Render-деплой с текущим `render.yaml` тоже не пройдет. Самые опасные продуктовые риски связаны с сохранением: пустой документ не сохраняется, последние символы из debounced textarea могут не попасть в store перед закрытием вкладки, а `visibilitychange` отменяет pending-save и оставляет данные только в sessionStorage backup.

## Что это за проект

PuuNote - браузерное React-приложение для нелинейных заметок. Пользователь работает не с одной вертикальной страницей, а с деревом карточек:

- каждая карточка - `PuuNode` с `id`, `content`, `parentId`, `order`, `metadata`;
- документы - `PuuDocument` с `id`, `title`, `updatedAt`, `metadata`;
- дерево хранится плоским массивом, связи восстанавливаются через `parentId`;
- UI показывает уровни дерева как горизонтальные колонки;
- активная ветка подсвечивается, неактивные ветки можно затемнять или скрывать;
- есть board view, timeline view, focus/fullscreen modal, file menu, command palette, settings, snapshots, job panel.

## Как устроено

Основной стек:

- React 19 + TypeScript + Vite + Tailwind CSS 4.
- Zustand для глобального состояния.
- Dexie/IndexedDB для документов, файлов и снапшотов.
- `react-markdown` + `remark-gfm` + `rehype-sanitize` для Markdown.
- `react-virtuoso` для timeline virtualization.
- `fuse.js` для поиска.
- `zod` для валидации импортируемых/сохраняемых узлов.

Ключевые слои:

- `src/store/useAppStore.ts` собирает Zustand store из UI, selection, history и document slices.
- `src/domain/documentTree.ts` содержит операции над деревом: add/delete/split/move/merge.
- `src/domain/documentService.ts` отвечает за IndexedDB, миграцию legacy localStorage, импорт/нормализацию и search index.
- `src/hooks/useFileSystem.ts` связывает Zustand-state с автосохранением в IndexedDB.
- `src/utils/markdownParser.ts` импортирует/экспортирует Markdown, structured Markdown и clipboard payload.
- `src/components/*` реализуют board/timeline/cards/modals/панели.
- `src/domain/aiProvider.ts`, `aiOperations.ts`, `jobRunner.ts`, `plugins/registry.ts` - экспериментальный фундамент для AI/plugin сценариев.

## Удачные решения

- Local-first архитектура хорошо подходит продукту: текст хранится в браузере, нет лишнего backend-слоя.
- Плоский массив узлов с `parentId` проще сериализовать, валидировать, импортировать и сохранять, чем вложенный объект.
- `documentApi` отделяет доменную логику дерева от UI-компонентов.
- Есть Zod-валидация и ремонт битых импортов: missing parent, циклы, дубликаты, лимит узлов.
- Markdown рендерится через `rehype-sanitize`; опасные теги и протоколы сильно ограничены.
- Есть JSON export/import для lossless backup.
- Есть снапшоты перед потенциально разрушительными AI/массовыми операциями.
- Timeline использует virtualization, что правильно для длинного линейного чтения.
- Модальные окна в основном имеют focus trap.
- В коде уже есть тесты для дерева, markdown parser, schema, export, context extraction.

## Проверки

### Команды

| Проверка | Результат |
|---|---|
| `npm run lint` | Прошел без вывода |
| `npm run test` | Падает: 1 failed / 37 passed |
| `npm run build` | Падает на `tsc --noEmit` |
| `npm audit --audit-level=low` | `found 0 vulnerabilities` |
| `npm outdated --long` | Есть устаревшие major/minor пакеты |
| Browser desktop `1440x1000` | Приложение открывается, runtime error нет, есть 404 favicon |
| Browser mobile `390x844` | Приложение открывается, но header переполнен и Settings уходит за экран |

### Build failure

`npm run build` падает:

```text
src/components/AutoSizeTextarea.tsx(115,9): error TS2322:
Type 'CSSProperties' is not assignable to type 'Style'.
Types of property 'height' are incompatible.
Type 'string' is not assignable to type 'number'.
```

Причина: `react-textarea-autosize` ожидает более узкий тип `style`, а код передает `React.CSSProperties` с потенциальной строковой `height`.

Файл: `src/components/AutoSizeTextarea.tsx:115`.

### Test failure

`src/hooks/useBoardLayout.test.ts` содержит два теста с одинаковым вызовом:

```ts
buildBoardColumns(buildTreeIndex(nodes), [], null, true)
```

Но один тест ожидает полное дерево, второй - только root cards. Это логически несовместимо. По help-тексту продукта "сброс фокуса" должен снова показывать все дерево, значит вероятнее всего устарел тест `can limit unfocused active-corridor mode to root cards`.

Файл: `src/hooks/useBoardLayout.test.ts:48-61`.

## Найденные проблемы и решения

### P0. Проект сейчас не собирается

Проблема: `npm run build` падает на TypeScript. Из-за этого не пройдет и Render-деплой, потому что `render.yaml` вызывает `npm ci && npm run build`.

Решение:

- исправить тип `style` в `AutoSizeTextarea`;
- не кастовать весь объект к `React.CSSProperties`, а привести к типу компонента или убрать конфликтующую возможность строковой `height`;
- после фикса прогнать `npm run typecheck && npm run build`.

### P0. Тесты не проходят

Проблема: suite падает из-за противоречивого теста active-corridor behavior.

Решение:

- выбрать контракт: при cleared focus показывать все дерево или только roots;
- исходя из текущего help/UI, оставить "показывать все дерево";
- удалить или переписать root-only тест;
- если root-only поведение нужно, добавить явный параметр `limitUnfocusedCorridorToRoots`.

### P1. Пустой документ не сохраняется

Проблема: автосохранение и dirty backup выходят раньше, если `nodes.length === 0`.

Критичные места:

- `flushPendingSave`: `if (fileId && nodes.length > 0)`.
- подписка в `useFileSystemInit`: `if (!activeFileId || nodes.length === 0) return`.
- dirty backup: `if (!fileId || nodesToSave.length === 0) return`.

Сценарий: пользователь удаляет последнюю карточку, UI становится пустым, но IndexedDB не перезаписывается пустым массивом. После reload старые карточки могут вернуться.

Решение:

- разрешить сохранение `[]` как валидного состояния документа;
- различать "нет загруженного файла" и "документ пуст";
- добавить тест на удаление последней карточки и перезагрузку.

### P1. Риск потери последних символов при закрытии вкладки

Проблема: `AutoSizeTextarea` держит ввод локально и отправляет в store с debounce 150ms. `beforeunload/pagehide` читает `useAppStore.getState().nodes`, где последние символы могут еще отсутствовать.

Дополнительно `visibilitychange -> hidden` вызывает `saveCurrentStateToDirtyBackup()`, который делает `fsManager.clearTimer()`. Если пользователь просто свернул вкладку, pending IndexedDB save отменен, а данные остаются только в памяти/sessionStorage backup.

Решение:

- добавить централизованный flush pending editor changes перед dirty backup;
- не отменять IndexedDB save на `visibilitychange`, либо сразу выполнять `flushPendingSave`;
- рассмотреть сохранение текста в store на каждый input, а debounce оставить только для IndexedDB;
- добавить e2e-тест: напечатать текст и сразу reload/close simulation.

### P1. `updatedAt` документа не обновляется при обычном редактировании

Проблема: `updatedAt` меняется только когда меняется title, вычисленный из первой карточки. Редактирование тела документа без изменения title не обновляет порядок в FileMenu и timestamp.

Код: `src/hooks/useFileSystem.ts:234-250`.

Решение:

- обновлять `documents[].updatedAt` на успешный `saveNodes`;
- title update и content update разделить;
- если хочется избежать частых metadata writes, обновлять `updatedAt` в том же debounce, что и nodes.

### P1. Tutorial detection почти наверняка сломана

Проблема: `TUTORIAL_DOCUMENT_TITLE = "PuuNote: Complete Guide"`, но `src/assets/help.md` начинается с `# PuuNote: Полное руководство`. `createNewFile(INITIAL_NODES, TUTORIAL_DOCUMENT_TITLE)` все равно вызывает `deriveDocumentTitle`, который берет title из первой карточки, а не из переданного title.

Итог: кнопка `?` может не находить уже созданный tutorial и плодить дубликаты; reset/current tutorial detection тоже сравнивает с английской константой.

Решение:

- не определять tutorial по title;
- добавить `metadata.kind = "tutorial"` или стабильный `metadata.systemDocument = "tutorial"`;
- либо синхронизировать константу с реальным title и дать `createNewFile` возможность явно уважать переданный title.

### P1. Mobile header переполнен

Проверка на `390x844`: правый блок header шире экрана, кнопка Settings находится за правой границей (`x=396` при ширине viewport 390). Пользователь на телефоне может не добраться до настроек.

Код: `src/components/Header.tsx:145-283`.

Решение:

- спрятать вторичные actions в overflow menu на мобильных;
- оставить в header только documents, view/search и одну кнопку меню;
- либо сделать горизонтально прокручиваемый toolbar с явным affordance, но лучше menu.

### P1. Горячие клавиши и help не совпадают

Проблемы:

- Shortcuts modal показывает "Clear focus: Esc", но non-editing `Escape` не сбрасывает active card.
- Floating actions открываются клавишей `.`, но это не показано в Shortcuts.
- В комментарии FloatingCardActions написано про Space, фактически используется `.`.
- "Save changes: Cmd/Ctrl+Enter" на самом деле выходит из edit mode и запускает обычное debounce autosave, а не мгновенное сохранение в IndexedDB.

Решение:

- реализовать `Escape` для clear focus вне режима редактирования;
- добавить `.` в Shortcuts или поменять на Space;
- переименовать "Save changes" в "Finish editing" либо действительно вызывать flush.

### P2. `editorMode` вводит в заблуждение

Проблема: настройка `editorMode` влияет только на TimelineView layout/rendering. В BoardView и FullScreenModal редактор всегда Markdown textarea.

Решение:

- переименовать настройку в `timelineMode`;
- либо реально реализовать visual/markdown behavior во всех режимах редактирования.

### P2. TimelineView одним кликом превращает карточку в editor

Проблема: в timeline, если карточка активна, она сразу рендерится как `AutoSizeTextarea`. Один клик по карточке делает ее active и превращает в editor, в отличие от board, где один клик выбирает, а double click/Enter редактирует.

Решение:

- разделить active selection и editing state в TimelineView;
- использовать `editingId`, как в BoardView;
- сохранить single-click для выбора и double-click/Enter для редактирования.

### P2. История хранит полные копии документа

Проблема: `setNodes` кладет весь `currentNodes` в `past` до 50 состояний. Для больших документов это быстро станет десятками/сотнями MB памяти, особенно при редактировании текста.

Решение:

- батчить историю по editing session, а не по debounce tick;
- хранить patch/diff или operation log;
- ограничивать history по суммарному размеру, а не только по количеству.

### P2. BoardView рендерит все видимые карточки без virtualization

Timeline виртуализирован, но board columns рендерят все карточки в колонках. Для больших деревьев это будет узкое место: DOM, scroll alignment, измерения layout, hover/floating actions.

Решение:

- добавить virtualization по колонкам;
- сделать `hide inactive branches` дефолтом для больших документов;
- кэшировать tree index и derived paths аккуратно, без мутации cached children.

### P2. Глубина дерева больше 200 может быть "починена" с потерей структуры

`validateNodesWithReport` считает ancestry глубже 200 небезопасной и переносит узел в root. Пользовательский документ с глубокой легальной структурой может быть изменен при сохранении/импорте.

Решение:

- явно ограничить создание глубины в UI, если 200 - продуктовый лимит;
- либо поднять лимит/убрать silent reparenting для данных, созданных самим приложением;
- показывать пользователю warning при repair.

### P2. `buildTreeIndex` кэширует mutable массивы children

`buildTreeIndex` возвращает `childrenMap`, где значения - mutable arrays. `exportNodesToMarkdown` берет массив из map и сортирует его in-place.

Код:

- `src/utils/tree.ts:8-29`
- `src/utils/markdownParser.ts:57-60`

Риск небольшой, но неприятный: cached index может меняться побочным эффектом.

Решение:

- всегда сортировать копию: `[...(childrenMap.get(parentId) || [])].sort(...)`;
- считать `TreeIndex` immutable контрактом.

### P2. `dev` и `dev:lan` одинаково открывают сервер в LAN

В `package.json`:

```json
"dev": "vite --port=3000 --host=0.0.0.0",
"dev:lan": "vite --port=3000 --host=0.0.0.0"
```

Для local-first редактора безопаснее, чтобы `npm run dev` слушал localhost, а LAN-режим был отдельным осознанным сценарием.

Решение:

- `dev`: `vite --port=3000 --host=127.0.0.1`;
- `dev:lan`: оставить `0.0.0.0`.

### P2. i18n неполный

В интерфейсе смешаны RU/EN строки: Snapshots, Create, Clear, Loading, manual snapshot, many aria/title strings, toast/openConfirm messages. В i18n используются ключи вроде `Wait...`, `Searching...`, но в resources их нет, значит пользователь увидит raw key.

Решение:

- вынести все user-facing strings в i18n;
- добавить тест/скрипт на missing keys;
- не использовать English в `title`/`aria-label` при русском UI.

### P2. Accessibility неполная

Проблемы:

- карточки - clickable `div`, без роли/табиндекса как отдельные элементы;
- drag & drop только мышью;
- floating actions не описаны в shortcuts;
- нет `eslint-plugin-jsx-a11y`;
- часть icon-only controls имеет English labels при русском языке.

Решение:

- добавить keyboard-accessible карточки или roving tabindex;
- добавить actions menu для карточки, доступное с клавиатуры;
- подключить jsx-a11y lint;
- прогнать axe/Playwright accessibility smoke tests.

### P2. Plugin/AI foundation пока не является платформой

README честно говорит, что plugin API экспериментальный. В коде registry без permissions/sandbox, без async contracts, без security boundary, без version negotiation. Это нормально для foundation, но опасно позиционировать как готовую plugin-систему.

Решение:

- держать в UI/README формулировку "experimental";
- перед реальными плагинами спроектировать permissions, sandbox, manifest, storage, hooks lifecycle и failure isolation.

### P3. `@` alias указывает на корень и не используется

В `vite.config.ts` и `tsconfig.json` alias `@/*` указывает на `./*`, а не на `src/*`. При этом импортов через `@/` нет.

Решение:

- удалить alias;
- либо поменять на `src` и начать использовать консистентно.

### P3. Dead/unreachable branch в Markdown parser

В `parsePuuNoteFormat` сначала проверяется `cleanText.includes("<!-- puunote-node -->")` и сразу вызывается legacy parser. Следующий `separatorRegex` снова проверяет то же условие; true-ветка уже недостижима.

Решение:

- удалить недостижимую ветку;
- зафиксировать формат `<!-- puunote-format: 1 -->` в тестах и документации.

### P3. Clipboard HTML парсится regex-ом

`parseClipboardHtmlNodes` ищет meta tag regex-ом. Для собственного HTML это обычно работает, но порядок атрибутов/нормализация HTML браузером могут сломать импорт структуры.

Решение:

- использовать `DOMParser`;
- искать `meta[name="puunote-clipboard"]`;
- добавить тест на reordered attributes.

### P3. DnD drop position зависит от React state

`onDragOver` обновляет `dropTarget`, а `onDrop` использует state. На быстрых событиях state может быть устаревшим.

Решение:

- вычислять drop zone повторно прямо в `onDrop` по координатам события;
- state оставить только для визуального индикатора.

### P3. Есть дублирование логики undo/redo и delete confirmations

Undo/redo active restoration продублированы в Header и hotkeys. Delete confirmation тексты/логика есть в hotkeys и FloatingCardActions.

Решение:

- вынести command actions в единый слой: `commands.undo`, `commands.redo`, `commands.deleteSelection`, `commands.mergeSelection`;
- Header, hotkeys и command palette должны вызывать одни и те же команды.

### P3. Snapshot restore bypasses history/plugin diff

`restoreSnapshot` вызывает `setNodesRaw`, который очищает history и не вызывает `diffAndEmit`. Это может быть нормально, но для plugin foundation это означает, что плагины не увидят массовое изменение.

Решение:

- либо явно документировать `setNodesRaw` как silent hydrate/restore;
- либо добавить `replaceDocumentNodes({ emitPlugins, preserveHistory })`.

### P3. Favicon отсутствует

В браузере есть console error:

```text
Failed to load resource: the server responded with a status of 404 @ /favicon.ico
```

Решение: добавить favicon или link на существующий asset.

### P3. Версионирование и документация расходятся

`README.md` говорит `PuuNote 0.4`, а `package.json` - `version: "0.0.0"`.

Решение:

- синхронизировать версию;
- добавить CHANGELOG или хотя бы release notes.

### P3. Нет CI

В репозитории нет workflow для `lint/test/build`. С учетом текущих падений это уже проявилось.

Решение:

- добавить GitHub Actions: `npm ci`, `npm run lint`, `npm run test`, `npm run build`;
- optional: Playwright smoke на desktop/mobile.

### P3. Зависимости устарели, но уязвимостей npm audit не нашел

`npm audit --audit-level=low`: 0 vulnerabilities.

`npm outdated --long` показал, среди прочего:

- `vite` current 6.4.2, latest 8.0.10;
- `@vitejs/plugin-react` current 5.2.0, latest 6.0.1;
- `typescript` current 5.8.3, latest 6.0.3;
- `lucide-react` current 0.546.0, latest 1.14.0;
- `zod` current 4.3.6, latest 4.4.1.

Решение: не обновлять все сразу. Сначала стабилизировать build/test, затем отдельной веткой обновить Vite/React tooling и прогнать smoke/e2e.

## UI/UX: ошибки, неудобства, недочеты

- На мобильном header переполнен; Settings уходит за экран.
- На desktop первый экран выглядит аккуратно, но правые колонки могут частично уходить за viewport; для горизонтального дерева это ожидаемо, но affordance горизонтального скролла почти незаметен.
- Кнопки header почти полностью icon-only. Для опытного пользователя нормально, для первого запуска - слабая discoverability.
- Import/Export icons потенциально двусмысленны: import использует download icon, export - upload icon.
- TimelineView редактирует активную карточку сразу, в отличие от BoardView.
- "Visual" editor mode фактически является visual timeline mode, не editor mode.
- "Save changes" в Shortcuts не означает немедленное сохранение.
- `Esc` заявлен как clear focus, но вне editing mode не работает.
- `.` для floating actions не документирован.
- Delete confirmation тексты на английском в русском UI.
- Snapshot panel почти полностью на английском.
- ErrorBoundary fallback на английском.
- Command Palette search может показывать raw missing i18n keys (`Searching...`).
- Нет ручного переименования документа; title выводится из первой карточки. Это минималистично, но пользователь может не ожидать, что изменение первой строки переименует файл.
- Состояние "Unsaved/Saving/Saved" есть, но при закрытии вкладки оно не гарантирует, что последние локальные textarea changes уже попали в store.
- Cards collapse скрывает хвосты карточек визуальной маской, но нет явного "expand this card".
- Drag & drop нет доступного keyboard fallback.

## Безопасность и приватность

Плюсы:

- Нет backend и нет отправки заметок на сервер в текущей реализации.
- Markdown проходит через `rehype-sanitize`.
- Разрешены только `http/https` для `href/src`; `javascript:` и `data:` не должны проходить.
- JSON import валидируется через Zod и нормализуется.
- `npm audit` не нашел известных уязвимостей.

Риски:

- `npm run dev` слушает `0.0.0.0`, что лишнее для обычной локальной разработки.
- Будущий AI/provider слой должен иметь явное согласие пользователя перед отправкой контекста наружу.
- Plugin registry без sandbox/permissions нельзя использовать для сторонних плагинов.
- Лимиты размера есть, но performance DoS через очень широкий документ все еще возможен на board view.

## Что можно удалить, упростить или переосмыслить

- Удалить или переписать конфликтующий root-only тест в `useBoardLayout.test.ts`.
- Удалить недостижимую ветку `separatorRegex` для `puunote-node`.
- Удалить неиспользуемый `@` alias или привести к `src`.
- Разделить `dev` и `dev:lan`.
- Вынести повторяющиеся команды undo/redo/delete/merge в command layer.
- Разделить большой `useFileSystem.ts` на persistence subscription, document actions, title derivation, dirty backup.
- Переименовать `editorMode` в `timelineMode`, если режим не станет настоящим глобальным editor mode.
- Перенести hardcoded UI strings в i18n.
- Перенести `@tailwindcss/typography` в `devDependencies`, если он нужен только на build-time.

## Итоговый чеклист проблем

- [ ] Исправить TypeScript build error в `AutoSizeTextarea`.
- [ ] Исправить конфликтующий тест `useBoardLayout.test.ts`.
- [ ] Убедиться, что `npm run build` проходит.
- [ ] Убедиться, что `npm run test` проходит.
- [ ] Починить сохранение пустого документа.
- [ ] Починить flush последних textarea изменений перед unload/pagehide.
- [ ] Не отменять pending IndexedDB save при `visibilitychange:hidden` без надежной замены.
- [ ] Обновлять `updatedAt` при любом content save.
- [ ] Починить tutorial detection через metadata, а не title.
- [ ] Исправить mobile header overflow.
- [ ] Синхронизировать shortcuts/help с реальными hotkeys.
- [ ] Реализовать или переименовать `editorMode`.
- [ ] Разделить selection/editing в TimelineView.
- [ ] Ограничить память history или перейти на операции/diffs.
- [ ] Добавить virtualization/оптимизацию board для больших деревьев.
- [ ] Пересмотреть silent repair глубины больше 200.
- [ ] Сделать `TreeIndex` immutable по контракту.
- [ ] Разделить `dev` и `dev:lan`.
- [ ] Завершить i18n для всех UI/toast/aria strings.
- [ ] Улучшить accessibility карточек и DnD.
- [ ] Не позиционировать plugin foundation как готовый plugin API.
- [ ] Удалить/исправить неиспользуемый `@` alias.
- [ ] Удалить dead code в markdown parser.
- [ ] Заменить clipboard HTML regex на DOMParser.
- [ ] Пересчитать DnD drop zone в `onDrop`.
- [ ] Убрать дублирование command logic.
- [ ] Решить, должен ли snapshot restore эмитить plugin events/history.
- [ ] Добавить favicon.
- [ ] Синхронизировать README/package version.
- [ ] Добавить CI для lint/test/build.
- [ ] Обновлять зависимости отдельными контролируемыми PR.

## Как я вижу дальнейшее развитие

### Этап 1. Стабилизация

Сначала нужно вернуть базовую инженерную надежность: build green, tests green, Render deploy green. Параллельно закрыть data-loss риски автосохранения, потому что для local-first редактора надежность сохранения важнее новых функций.

Приоритет:

1. TypeScript build fix.
2. Test contract fix.
3. Autosave/empty document fixes.
4. Mobile header fix.
5. CI.

### Этап 2. Продуктовая чистота

После стабилизации стоит выровнять UX-контракты: hotkeys, settings naming, timeline editing behavior, i18n, snapshot texts, accessibility. Это даст ощущение цельного инструмента, а не набора хороших, но местами несогласованных функций.

### Этап 3. Масштабирование документов

Если PuuNote должен работать с большими структурами, board view нужно готовить к большим деревьям: virtualization, operation-based history, immutable tree index, индексы для selection/range operations, performance budgets.

### Этап 4. Настоящий local-first слой

Хороший следующий шаг - сделать экспорт/backup/sync понятными:

- явный backup reminder;
- import conflict handling;
- optional OPFS/File System Access API;
- PWA/offline install;
- возможно CRDT/sync позже, но только после стабилизации локального persistence.

### Этап 5. AI/plugin слой

AI/plugin foundation лучше развивать только после продуктовой стабилизации. Нужны:

- provider abstraction с явным user consent;
- безопасное хранение ключей или backend proxy;
- permission model для плагинов;
- sandbox;
- manifest/versioning;
- audit log операций;
- обязательный snapshot перед destructive AI action.

## Общая оценка

Проект имеет сильную идею и достаточно хорошее ядро для прототипа. Лучшие части - доменная модель дерева, local-first подход, Markdown sanitation, JSON backup, snapshots и начальные тесты. Главные проблемы сейчас не в концепции, а в надежности: проект не собирается, тесты не зеленые, автосохранение имеет реальные edge cases, а мобильный toolbar ломает доступ к настройкам.

Если закрыть P0/P1 пункты, PuuNote станет хорошей базой для дальнейшего развития. До этого добавлять AI/plugin функциональность рано: она увеличит blast radius вокруг данных пользователя, которые пока сохраняются не идеально надежно.
