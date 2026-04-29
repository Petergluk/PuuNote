# PuuNote Project Audit - Iteration 2

**Date:** 2026-04-29 14:22  
**Auditor:** moonshotai/kimi-k2.5  
**Project Version:** 0.4+ (post-AI-integration-prep)  
**Git Status:** Already up to date  
**Files Analyzed:** 42 TypeScript/TSX files

---

## 1. Executive Summary

За прошедшую итерацию проект значительно эволюционировал в сторону AI-интеграции. Внедрены:
- ✅ Plugin Architecture (registry.ts)
- ✅ Job Runner для async операций
- ✅ Snapshots/Versioning система
- ✅ Multi-selection и Merge функционал
- ✅ Virtual scrolling (react-virtuoso)
- ✅ Fuzzy search (Fuse.js)
- ✅ Toast notifications (sonner)
- ✅ Extracted domain layer (documentTree.ts)
- ✅ Fullscreen utils abstraction

### Общая оценка: **9.0/10** ⭐ (was 8.5/10)

---

## 2. Project Overview

### 2.1 Текущая архитектура

```
src/
├── components/          # UI components (15 files)
├── hooks/              # React hooks (5 files, +1 new)
├── store/              # Zustand stores (2 files, +1 new)
│   ├── useAppStore.ts  # Main store (refactored, -76 lines)
│   └── useJobStore.ts  # NEW: Job management
├── domain/             # NEW: Business logic layer (4 files)
│   ├── documentTree.ts       # Extracted from store
│   ├── documentTree.test.ts  # Unit tests
│   ├── jobRunner.ts          # NEW: Async job executor
│   └── contextExtraction.ts  # NEW: LLM context builder
├── plugins/            # NEW: Plugin system
│   └── registry.ts     # Plugin registry
├── db/                 # Database layer (2 files)
│   ├── db.ts          # +Snapshots table
│   └── snapshots.ts    # NEW: Snapshot operations
├── utils/              # Utilities (5 files, +1 new)
│   ├── fullscreen.ts   # NEW: Abstracted fullscreen API
│   └── ...
└── types.ts           # +metadata field
```

### 2.2 Добавленные возможности

| Feature | Implementation | Quality |
|---------|----------------|---------|
| **Multi-selection** | Ctrl/Cmd+Click, Shift+Click | ✅ Good |
| **Merge nodes** | Combine selected into one | ✅ Good |
| **Snapshots** | Manual + auto with toasts | ✅ Excellent |
| **Virtual scrolling** | react-virtuoso in Timeline | ✅ Excellent |
| **Fuzzy search** | Fuse.js in Command Palette | ✅ Good |
| **Job runner** | Async job queue with progress | ✅ Good |
| **Plugin system** | Hooks + CardActions registry | ⚠️ Basic |
| **Context extraction** | LLM-ready tree traversal | ✅ Good |

---

## 3. Issues Found in This Iteration 🔍

### 3.1 Critical Issues (New)

#### Issue #C1: Race Condition в Multi-selection
**Location:** `src/store/useAppStore.ts:116-129`

```typescript
toggleSelection: (id, isShift) => set((state) => {
  const { selectedIds, activeId } = state;
  if (isShift && activeId) {
    // TODO: Not implemented! Range selection stub
  }
  // ...
})
```

**Problem:** Shift+Click для range selection не реализован, но UI даёт понять, что работает.

**Fix:**
```typescript
if (isShift && activeId && activeId !== id) {
  const allNodes = getDepthFirstNodes(state.nodes);
  const idx1 = allNodes.findIndex(n => n.id === activeId);
  const idx2 = allNodes.findIndex(n => n.id === id);
  const range = allNodes.slice(Math.min(idx1, idx2), Math.max(idx1, idx2) + 1);
  return { selectedIds: range.map(n => n.id) };
}
```

#### Issue #C2: Plugin Registry Singleton Problem
**Location:** `src/plugins/registry.ts:25-58`

```typescript
class PluginRegistryClass {
  private plugins: Map<string, PluginDefinition> = new Map();
  // ...
}
export const PluginRegistry = new PluginRegistryClass(); // Singleton
```

**Problem:** Глобальный singleton делает тестирование сложным и может привести к утечкам состояния между тестами.

**Fix:**
```typescript
export const createPluginRegistry = () => new PluginRegistryClass();
export const defaultRegistry = createPluginRegistry();
```

### 3.2 High Priority Issues (New)

#### Issue #H1: JobRunner Memory Leak
**Location:** `src/domain/jobRunner.ts:39-41`

```typescript
setTimeout(() => {
  useJobStore.getState().removeJob(jobId);
}, 5000); // Job остаётся в памяти 5 секунд
```

**Problem:** Job хранится в store минимум 5 секунд даже после completion. При массовых операциях — накопление.

**Fix:** Ограничить размер истории или удалять сразу.

#### Issue #H2: Unbounded Snapshot Growth
**Location:** `src/db/snapshots.ts:6-28`

```typescript
export async function takeDocumentSnapshot(description: string = "Manual Snapshot") {
  // ... no limit on number of snapshots
  await db.snapshots.put({...});
}
```

**Problem:** Нет ограничения на количество snapshots. IndexedDB переполнится.

**Fix:**
```typescript
const MAX_SNAPSHOTS = 50;
const existing = await db.snapshots.where("documentId").equals(documentId).count();
if (existing >= MAX_SNAPSHOTS) {
  const oldest = await db.snapshots.where("documentId").equals(documentId).sortBy("createdAt");
  await db.snapshots.delete(oldest[0].id);
}
```

#### Issue #H3: Context Extraction O(n²) Complexity
**Location:** `src/domain/contextExtraction.ts:14-93`

```typescript
// Called for EACH node when building LLM context
const targetDepthInfo = getDepthFirstNodes(nodes).find(n => n.id === targetNodeId);
const allDfNodes = getDepthFirstNodes(nodes).filter(df => descSet.has(df.id));
// getDepthFirstNodes вызывается 2 раза — O(n) каждый
```

**Problem:** Множественные проходы по дереву при построении контекста.

**Fix:** Кэшировать результат `getDepthFirstNodes`.

#### Issue #H4: Missing Error Handling in Transaction
**Location:** `src/hooks/useFileSystem.ts:385-391`

```typescript
try {
  await db.transaction('rw', db.files, db.documents, async () => {
    await db.documents.put({...});
    await db.files.put({ id: newId, nodes: nodesToUse });
  });
} catch (err) {
  // ... handled below
}
```

**Problem:** Если transaction падает midway — partial state. Dexie aborts автоматически, но UI может быть в inconsistent state.

#### Issue #H5: ToggleCheckbox Hook Dependencies
**Location:** `src/hooks/useToggleCheckbox.ts:6-14`

```typescript
export function useToggleCheckbox() {
  const updateContent = useAppStore((s) => s.updateContent);
  return useCallback((nodeId: string, content: string, index: number, newValue: boolean) => {
    // ...
  }, [updateContent]); // updateContent всегда новая функция?
}
```

**Problem:** `updateContent` из Zustand — стабильна, но если store пересоздаётся — лишние ре-рендеры.

### 3.3 Medium Priority Issues

#### Issue #M1: Unused isShift Parameter Logic
**Location:** `src/components/Card.tsx:134-138`

```typescript
if (e.metaKey || e.ctrlKey || e.shiftKey) {
  toggleSelection(node.id, e.shiftKey);
} else {
  if (!isActive) setActiveId(node.id);
}
```

**Problem:** Shift+Click логика не до конца реализована (см. Issue #C1), но UI уже показывает selection.

#### Issue #M2: Conflicting Class Names
**Location:** `src/components/Card.tsx:65-77`

```typescript
if (isActive || isSelected) {
  cardClasses = "bg-app-card-active border ...";
  if (!isActive && isSelected) {
    cardClasses = "bg-app-card border border-app-accent ...";
  }
}
```

**Problem:** `isActive && isSelected` — какой стиль применится? Первая ветка.

#### Issue #M3: Magic Numbers in Fullscreen Utils
**Location:** `src/utils/fullscreen.ts`

```typescript
// No constants for vendor prefixes
webkitRequestFullscreen?: () => Promise<void>;
mozRequestFullScreen?: () => Promise<void>;
msRequestFullscreen?: () => Promise<void>;
```

**Problem:** Vendor-specific API в коде, хотя и абстрагировано.

#### Issue #M4: Incomplete Type Safety
**Location:** `src/types.ts:6,12`

```typescript
metadata?: Record<string, any>; // any — не type-safe
```

**Problem:** `any` ломает type safety для metadata.

**Fix:**
```typescript
interface NodeMetadata {
  isGenerating?: boolean;
  aiOperation?: string;
  // ... extendable
}
metadata?: NodeMetadata;
```

#### Issue #M5: Command Palette Re-creates Fuse Instance
**Location:** `src/components/CommandPalette.tsx:80-84`

```typescript
const fuse = new Fuse(docs, {
  keys: ["content"],
  threshold: 0.4,
  ignoreLocation: true,
});
```

**Problem:** Новый Fuse instance при каждом изменении query.

**Fix:** Использовать `useMemo` или `useRef`.

### 3.4 Low Priority Issues

#### Issue #L1: Spacing Inconsistency
**Location:** `src/App.tsx:163`

```typescript
<div className="flex flex-row items-start gap-0 px-0 py-0 min-h-full h-full w-max relative col-spacer">
```
`gap-0 px-0 py-0` — избыточно, дефолт уже 0.

#### Issue #L2: Test File Location
**Location:** `src/domain/documentTree.test.ts`

Хорошая практика — тесты рядом с кодом, но можно вынести в `__tests__`.

#### Issue #L3: Missing Job Cancellation UI
**Location:** `src/domain/jobRunner.ts:61-65`

Есть `cancelJob`, но нет UI для отмены — orphan functionality.

---

## 4. Code Quality Analysis

### 4.1 Domain Layer Extraction ✅

**Before (in Store):**
```typescript
// useAppStore.ts (old): ~365 lines of mixed concerns
// addChild, addSibling, deleteNode, splitNode, moveNode inline
```

**After (Domain Layer):**
```typescript
// domain/documentTree.ts: 212 lines pure business logic
// store delegates to documentApi.* methods
```

**Verdict:** Отличный рефакторинг! SRP restored.

### 4.2 New Dependencies Review

| Package | Purpose | Risk | Recommendation |
|---------|---------|------|----------------|
| **fuse.js** | Fuzzy search | Low | ✅ Keep |
| **react-virtuoso** | Virtual scrolling | Low | ✅ Keep |
| **sonner** | Toast notifications | Low | ✅ Keep |
| **vitest** | Testing | None | ✅ Keep |

### 4.3 Performance Improvements

| Area | Before | After | Impact |
|------|--------|-------|--------|
| Timeline rendering | All nodes | Virtual scrolling | Massive |
| Command Palette search | Linear scan | Fuse.js index | High |
| Tree operations | In store | Pure functions | Medium |

---

## 5. Security Assessment

### 5.1 Improvements Since Last Audit

| Aspect | Status | Change |
|--------|--------|--------|
| XSS (Markdown) | ⚠️ Medium | No change |
| XSS (SVG images) | ⚠️ Medium | Still vulnerable |
| Data Validation | ✅ Strong | Zod + improved |
| Import Security | ✅ Safe | Size limits, validation |
| Transaction Safety | ✅ Improved | Dexie transactions |

### 5.2 New Security Concerns

#### Issue #S1: Plugin System Injection Risk
**Location:** `src/plugins/registry.ts`

```typescript
register(plugin: PluginDefinition) {
  // No validation of plugin code!
  this.plugins.set(plugin.id, plugin);
}
```

**Risk:** Если плагины будут загружаться dynamically (eval/loadScript), XSS возможен.

**Mitigation:** Sanitize plugin definitions, use sandboxed iframes for 3rd party.

---

## 6. Checklist of Issues

### Critical 🔴 (Fix Immediately)
- [ ] **#C1:** Implement range selection (Shift+Click)
- [ ] **#C2:** Plugin registry singleton → factory

### High Priority 🟠 (Fix This Week)
- [ ] **#H1:** JobRunner memory leak (auto-cleanup)
- [ ] **#H2:** Unbounded snapshot growth
- [ ] **#H3:** Context extraction O(n²) optimization
- [ ] **#H4:** Transaction rollback handling
- [ ] **#H5:** ToggleCheckbox dependencies optimization

### Medium Priority 🟡 (Fix This Sprint)
- [ ] **#M1:** Complete multi-selection UX
- [ ] **#M2:** Fix active+selected styling conflict
- [ ] **#M3:** Extract fullscreen vendor prefixes
- [ ] **#M4:** Type metadata properly (no `any`)
- [ ] **#M5:** Memoize Fuse instance

### Low Priority 🟢 (Nice to Have)
- [ ] **#L1:** Remove redundant Tailwind classes
- [ ] **#L2:** Consider test file organization
- [ ] **#L3:** Add job cancellation UI

### Security 🛡️
- [ ] **#S1:** Plugin validation/sandboxing

---

## 7. Roadmap & Recommendations

### 7.1 Next Phase: AI Integration

Сейчас фундамент готов. Следующие шаги:

```
Phase 2: AI Backend Integration
├── LLM Provider Abstraction
│   ├── OpenAI adapter
│   ├── Claude adapter
│   └── Local (Ollama) adapter
├── AI Operations
│   ├── Expand node
│   ├── Summarize branch
│   ├── Restructure tree
│   └── Generate from prompt
├── Streaming Support
│   ├── SSE for real-time updates
│   └── Cancel mid-generation
└── Cost Tracking
    ├── Token usage per operation
    └── Monthly budget limits

Phase 3: Advanced Features
├── Collaborative editing
│   └── Yjs / CRDT integration
├── Cloud sync
│   └── End-to-end encryption
├── Export formats
│   ├── PDF generation
│   ├── Notion integration
│   └── Obsidian vault sync
└── Mobile app
    └── React Native / PWA
```

### 7.2 Code Health Recommendations

1. **Add Integration Tests** — Тестировать DB operations, import/export
2. **E2E Tests (Playwright)** — Критические user flows
3. **Bundle Analysis** — Отслеживать размер бандла
4. **Error Tracking** — Sentry или подобное для production
5. **Performance Monitoring** — Web Vitals

### 7.3 API Design for AI Plugins

```typescript
// Proposed AI Plugin Interface
interface AIPlugin extends PluginDefinition {
  aiCapabilities: {
    id: string;
    name: string;
    promptBuilder: (context: TreeContext) => string;
    resultParser: (response: string) => NodeChange[];
  }[];
}

// Usage
PluginRegistry.register({
  id: 'ai-expander',
  name: 'AI Node Expander',
  aiCapabilities: [{
    id: 'expand',
    name: 'Expand Idea',
    promptBuilder: (ctx) => `Expand: ${ctx.node.content}`,
    resultParser: (res) => parseToNodes(res),
  }],
});
```

---

## 8. Conclusion

### Summary of Changes Since Last Audit

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| **Total Files** | 31 | 42 | +11 |
| **Lines of Code** | ~3500 | ~4200 | +700 |
| **Test Coverage** | 0% | >0% | ✅ New |
| **Architecture** | Monolithic | Layered | ✅ Improved |
| **AI Readiness** | Planning | Foundation Ready | ✅ Major |

### Final Verdict

Проект продвинулся отлично. Внедрение:
- Domain layer extraction (SRP restored)
- Job Runner (async foundation)
- Plugin system (extensibility)
- Snapshots (versioning)
- Virtual scrolling (performance)

**Готовность к AI Phase 2:** 80%

**Рекомендация:** Перед началом AI Phase 2 исправить Critical (#C1, #C2) и High priority issues (#H1-H3).

---

**Auditor:** moonshotai/kimi-k2.5  
**Date:** 2026-04-29 14:22  
**Next Audit:** After AI Phase 2 completion
