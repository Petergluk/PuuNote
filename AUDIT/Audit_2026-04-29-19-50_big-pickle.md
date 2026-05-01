# PuuNote. Аудит проекту (2)

**Дата аудита:** 29.04.2026 19:50  
**Версия проекту:** 0.0.0  
**Модель аудиту:** Big Pickle (opencode)

---

## 1. Що це за проект?

**PuuNote** — це безсерверний веб-застосунок для структурованих нотаток у форматі горизонтального дерева (horizontal-tree). Проект значно еволюціонував з минулого аудиту:

### Архітектура (сучасна)

- **Фронтенд:** React 19 + TypeScript + Zustand
- **Збереження:** Dexie.js (IndexedDB) + snapshots
- **Plugin System:** PluginRegistry + CardActionHook
- **Job Runner:** Черга завдань для AI-операцій
- **Tests:** Vitest + tree.test.ts + documentTree.test.ts
- **UI:** TailwindCSS v4, Sonner (toasts), Fuse.js (пошук)

### ️Нові фічи з минулого аудиту:

✅ **Document Tree API** — винесено у `domain/documentTree.ts` (212 рядків)  
✅ **Snapshots** — повні версії документів (`db/snapshots.ts`)  
✅ **Job Runner** — черга завдань (`domain/jobRunner.ts`)  
✅ **Plugin Registry** — система плагінів (`plugins/registry.ts`)  
✅ **Context Extraction** — для AI (`domain/contextExtraction.ts`)  
✅ **Multi-select** — `selectedIds` + merge nodes  
✅ **Два стору:** `useAppStore` + `useJobStore`  
✅ **Fuse.js** — швидкий пошук  
✅ **Sonner** — toast notifications  
✅ **Tests** — є тести!  

---

## 2. Як це працює?

### 2.1. Store Structure

```typescript
// useAppStore — основний стор
documents, nodes, past[], future[], 
activeId, selectedIds[], editingId, draggedId, fullScreenId,
uiMode, theme, colWidth, timelineOpen...

// useJobStore — AI jobs  
jobs: Job[] // {id, name, status, progress, message}
```

### 2.2. Document Operations

Всі операції над вузлами тепер у `documentApi`:
- `updateContent`, `addChild`, `addSibling`, `deleteNode`
- `splitNode`, `moveNode`, **mergeNodes** (нова)

### 2.3. Plugin System

```typescript
interface PluginDefinition {
  id, name, version,
  hooks?: { onNodeCreated, onNodeUpdated, onNodeDeleted }
  cardActions?: CardActionHook[]
}
```

### 2.4. Snapshots

```typescript
interface DocumentSnapshot {
  id, documentId, nodes, createdAt, description?
}
```

---

## 3. Вдалі рішення

✅ **Domain separation** — `documentTree.ts` відокремлено від UI  
✅ **Plugin hooks** — можливість розширювати UI  
✅ **Job Runner** — AI-завдання з progress/cancel  
✅ **Snapshots** — версіонування документів  
✅ **Multi-select + merge** — групове редагування  
✅ **Full context extraction** — для LLM prompt building  
✅ **Tests** — є базова тестова coverage  
✅ **Sonner** — кращий toast-user experience  

---

## 4. Проблеми та рекомендації

### 4.1. Architecture / State

#### 🔸 Два стору + domain API = розмиті межі
- `documentApi` у `domain/`, але він **纯粹的** функції без side effects
- Втім, `setNodes` всередині `useAppStore` — це **побічний ефект**
- `JobRunner` напряму пише у `useJobStore`

**Рішення:**
```typescript
// Або domain layer повністю stateless:
// documentApi returns new state
// Або domain layer керує store:
// export const documentStore = { ... }
```

#### ⚠️ JobRunner coupling (jobRunner.ts:13)
```typescript
const jobId = useJobStore.getState().addJob(name);
// Direct store access = tight coupling
```

**Рішення:** Створити абстракцію:
```typescript
const jobService = {
  async run<T>(name: string, fn: JobFunction<T>) { ... }
}
```

#### ⚠️ No persistent job history
- Jobs видаляються через 5 секунд після завершення
- Неможливо переглянути історію AI-операцій

**Рішення:** Зберігати jobs у IndexedDB

---

### 4.2. Performance

#### 🔸 Tree index rebuilds (useBoardLayout.ts)
- `buildTreeIndex` викликається **багаторазово** при кожному рендері
- `computeActivePath`, `computeDescendantIds` — O(n) кожен

**Рішення:**
```typescript
const treeIndex = useMemo(() => buildTreeIndex(nodes), [nodes]);
// Поширити treeIndex через context
```

#### 🔸 Undo — повні копії
- `.slice(-50)` — 50 повних копій вузлів

**Рішення:** Diff-based history (якщо є performance issues)

#### 🔸 Context extraction O(n) — повторюється
- `buildContextForLLM` у `contextExtraction.ts:19` будує tree index **знову**
- Можливо кешувати

**Рішення:** Передавати tree index parameter

---

### 4.3. UX/UI

#### 🔸 Split node — не працює
- Функція `handleSplitNode` є, але **кнопка є, а обробник призначено**
- Card.tsx:161: `onMouseDown={handleSplitNode}` ✅ Працює!

#### ⚠️ Merge confirmation
- `mergeNodes` одразу видаляє вузли **без підтвердження**
- Можливість випадкового видалення

**Рішення:**
```typescript
if (nodeIdsToMerge.length > 1) {
  openConfirm(`Merge ${nodeIdsToMerge.length} nodes?`, () => merge...)
}
```

#### 🔸 Selection range не реалізовано
- `toggleSelection` з `isShift` parameter, але **логіка range відсутня**
- useAppStore.ts:120: порожня гілка (comments only)

**Рішення:** Додати range selection:
```typescript
toggleSelection: (id, isShift) => set((state) => {
  if (isShift && state.activeId) {
    // Select all nodes between activeId and id
  }
})
```

#### 🔸 Delete confirmation — вже є
- Card.tsx:233-243 — ✅ Перевіряє children, підтверджує
- але тільки для вузлів з descendants

---

### 4.4. Plugin System Issues

#### ⚠️ Plugin hooks — не імплементовано
- `PluginHooks` визначено, але **ніде не викликається**
- Немає `onNodeCreated` triggering

**Рішення:** Hook у store:
```typescript
setNodes: (updater) => {
  const nextNodes = typeof updater === "function" ? updater(current) : updater;
  const newNodes = nextNodes.filter(n => !current.find(c => c.id === n.id));
  newNodes.forEach(n => invokeHooks("onNodeCreated", n));
  // ...
}
```

#### ⚠️ No plugin persistence
- Plugins реєструються в runtime, не зберігаються
- Немає enabled/disabled state

---

### 4.5. Snapshots Issues

#### ⚠️ No auto-snapshots
- Тільки manual `takeDocumentSnapshot()`
- Немає auto-save при змінах

**Рішення:** Auto-snapshot кожні N змін або по таймеру

#### ⚠️ No snapshot limit
- IndexedDB може заповнитись
- Немає cleanup policy

**Рішення:** Maximum N snapshots per document

---

### 4.6. Security

#### 🔸 SafeMarkdown — все ще mailto дозволено
- Попередня проблема не вирішена

**Ріше��ня:** Прибрати `mailto` з SafeMarkdown.tsx

---

### 4.7. Code Quality

#### ⚠️ Duplicated types
- `DocumentSnapshot` у db.ts та db/snapshots.ts — дубль

#### 🔸 No error boundaries для async
- JobRunner errors логуються, але UI не показує користувачу

**Рішення:** Додати Job UI panel з errors

#### 🔸 Constants — розкидані
- HOTKEY_DOM_WAIT_MS у constants.ts ✅
- COPY_SUCCESS_TIMEOUT_MS — у constants.ts
- MAX_FILE_SIZE_BYTES — у constants.ts

---

### 4.8. Potential Bugs

#### ⚠️ Race condition delete + snapshot (snapshots.ts:43)
- Якщо snapshot видалено іншим вкладом — restore не знайде його

**Рішення:** Перевірка існування snapshot перед restore

#### 🔸 setNodes Raw mutation (useAppStore.ts:137)
- `setNodesRaw` одразу очищує history — ок, але може бути unexpected

---

### 4.9. Unused / Dead Code

#### ⚠️ fuse.js — не використовується
- В package.json є `fuse.js`, але пошук досі naive (CommandPalette.tsx)
- Коли плануєте використовувати?

#### 🔸 react-virtuoso — not used
- В package.json є, але TimelineView рендерить усі вузлі
- Плануєте virtual scroll?

#### 🔸 metadata.json — порожній
- Продовжує бути порожнім

---

### 4.10. Missing Features (після минулого аудиту)

- ❌ CSP headers — не додано
- ❌ Export formats (PDF, DOCX) — немає
- ❌ Collaboration — немає
- ❌ Cloud sync — немає

---

## 5. Чеклист знайдених проблем

| # | Категорія | Проблема | Пріоритет |
|---|----------|---------:|----------:|
| 1 | Arch | JobRunner tight coupling до store | Середній |
| 2 | Arch | No job persistence | Низький |
| 3 | Perf | Tree index rebuilds | Середній |
| 4 | Perf | Context extraction O(n) | Низький |
| 5 | UX | Merge without confirm | Середній |
| 6 | UX | Selection range not implemented | Середній |
| 7 | Plugins | Hooks not triggered | Високий |
| 8 | Plugins | No persistence | Низький |
| 9 | Snapshots | No auto-snapshot | Середній |
| 10 | Snapshots | No limit/cleanup | Низький |
| 11 | Security | mailto still allowed | Середній |
| 12 | Code | Duplicated DocumentSnapshot type | Низький |
| 13 | Code | No Job error UI | Низький |
| 14 | Unused | fuse.js not used | Низький |
| 15 | Unused | react-virtuoso not used | Низький |
| 16 | Missing | No CSP headers | Середній |

---

## 6. Дальший розвиток

### 6.1. Plugin Architecture — уточнення

Поточний `PluginRegistry` — це foundation. Наступні кроки:

```typescript
// Plugin persistence
interface StoredPlugin {
  id: string;
  enabled: boolean;
  config?: Record<string, any>;
}

// Plugin API
interface PluginAPI {
  registerPlugin(plugin: PluginDefinition): void;
  unregisterPlugin(id: string): void;
  getEnabledPlugins(): Plugin[];
  
  // Storage access
  getDocument(id: string): PuuDocument;
  updateDocument(id: string, nodes: PuuNode[]): void;
  
  // AI access
  runJob(name: string, fn: JobFunction): Promise<any>;
  
  // UI hooks
  renderToolbar(nodeId: string): React.ReactNode;
}
```

### 6.2. Skills System — концепція

```typescript
interface Skill {
  id: string;
  name: string;
  
  // Trigger — коли виконується
  trigger: "on_save" | "on_keyword" | "on_manual";
  keyword?: string;
  
  // Action
  run: (context: SkillContext) => Promise<SkillResult>;
}

interface SkillContext {
  nodes: PuuNode[];
  activeNode: PuuNode;
  selectedNodes: PuuNode[];
  document: PuuDocument;
  jobRunner: JobRunnerAPI;
}
```

### 6.3. Workspace / Meta-Map

```typescript
interface Workspace {
  id: string;
  name: string;
  
  documents: string[]; // document IDs
  metaMap: {
    tags: Record<string, string[]>;
    links: { from: string; to: string; type: string }[];
    categories: string[];
  };
  
  aiContext: {
    activeJob: string | null;
    messages: Message[];
  };
}
```

### 6.4. AI Integration Layer

```typescript
interface AIProvider {
  complete(prompt: string, context?: AIContext): Promise<string>;
  stream(prompt: string, onChunk: (chunk: string) => void): void;
}

// Providers supported:
type AIProviderType = "openai" | "anthropic" | "google" | "custom";

interface AIConfig {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  customEndpoint?: string;
}
```

### 6.5. Suggested Plugins

1. **AI Structurer** — структурує хаос у дерево
2. **Summarizer** — створює summary вузлів
3. **Outliner** — TODO/Roadmap генератор
4. **Expander** — дописує контент за шаблоном
5. **Mover** — переміщує вузли за логікою
6. **Exporter** — PDF/DOCX/HTML експорт

### 6.6. Short-term priorities

1. **Auto-snapshots** — кожні 10 хвилин
2. **Plugin hooks triggering** — onNodeCreated/Updated/Deleted
3. **Job persistence** — зберігати jobs у IndexedDB
4. **Selection range** — реалізувати Shift+Click
5. **Search with Fuse.js** — замінити naive search

### 6.7. Medium-term

1. **Skills registry** — перший прототип
2. **AI provider abstraction** — OpenAI/Anthropic
3. **Workspace мета-карта** — зв'язки між документами

---

## 7. Висновок

Проект зробив величезний крок вперед:
- Domain separation ✅
- Plugin foundation ✅  
- Job Runner ✅
- Snapshots ✅
- Tests ✅
- Multi-select + merge ✅

**Головні gaps:**
- Plugin hooks не працюють (не підключені)
- Lazy search (Fuse.js є, але не використовується)
- No job persistence
- Selection range incomplete

**Наступний етап:** AI plugin platform — спочатку довести до working state Plugin/Skills system, потім додати AI provider abstraction.

---

*Аудит підготовлено: 29.04.2026 19:50, Big Pickle model*