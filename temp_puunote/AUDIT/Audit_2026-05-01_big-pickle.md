# PuuNote Audit Report

**Date:** 2026-05-01
**Model:** big-pickle
**Version Audited:** 0.4
**Files Analyzed:** 40+ source files across `src/`

---

## 1. Project Overview

PuuNote is a local-first nonlinear text editor with a horizontal branching tree (card-based) architecture. Data is stored in IndexedDB via Dexie.js. The UI renders cards in horizontal columns, with active-path highlighting and dimming of inactive branches. Key features include markdown support, drag-and-drop, keyboard-first navigation, command palette with fuzzy search, snapshots, undo/redo, export/import (JSON, flat MD, structured MD), and an experimental AI plugin foundation.

### Tech Stack
- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Zustand 5 (sliced store)
- Dexie 4 (IndexedDB)
- Framer Motion (motion)
- Zod 4 (schema validation)
- react-markdown + rehype-sanitize

### Architecture Summary
```
App.tsx (root layout + lazy-loaded modals)
├── Store: useAppStore (4 slices: document, ui, history, selection)
├── Domain: documentTree, documentService, documentExport, contextExtraction, aiProvider, aiOperations, jobRunner
├── Hooks: useFileSystem, usePreferences, useAppHotkeys, useBoardLayout, useFocusTrap, useToggleCheckbox
├── Components: Card, Header, Footer, CommandPalette, SettingsPanel, FileMenu, FloatingCardActions, FullScreenModal, TimelineView, JobPanel, SafeMarkdown, AutoSizeTextarea, ConfirmDialog, SnapshotPanel, ErrorBoundary
├── Utils: tree, markdownParser, schema, id, cn, proseClasses, fullscreen, browserDownload
├── DB: db (Dexie), snapshots
└── Plugins: registry (PluginRegistry)
```

---

## 2. Successful Design Solutions

1. **Flat node array with parentId** — Avoids recursive tree state. Tree is indexed on-the-fly via `buildTreeIndex` (O(n)), making all mutations simple array operations.

2. **Zustand sliced stores** — Clean separation of concerns (documentSlice, uiSlice, historySlice, selectionSlice) with `subscribeWithSelector` for granular subscriptions.

3. **`setNodes` updater pattern** — All mutations go through a single `setNodes` method in historySlice, which automatically tracks past/future for undo/redo. DocumentSlice wraps `documentApi.*` calls inside `setNodes`, ensuring every mutation is undoable.

4. **Schema validation on import/load** — Zod schemas (`PuuNodeSchema`) validate all external data. `validateNodesWithReport` repairs cycles, missing parents, and duplicates — resilient data ingestion.

5. **Dirty save mechanism** — `localStorage` backup on `beforeunload`/`visibilitychange` protects against crashes between IndexedDB debounced saves.

6. **Three-format clipboard** — Custom MIME type (`web application/x-puunote+json`), HTML with encoded payload, and plain markdown fallback. Cross-app paste preserves structure when pasting between PuuNote instances.

7. **`useColumns` + active corridor mode** — Efficiently builds board columns from tree index. "Hide inactive branches" mode shows only the active path + its subtree.

8. **PluginRegistry event system** — `onNodeCreated`, `onNodeUpdated`, `onNodeDeleted` hooks with `CardActionHook` injection points. Clean foundation for future extensions.

9. **JobRunner with AbortController** — Async operations (AI drafts) support cancellation, progress reporting, and UI feedback through a dedicated job store.

10. **Snapshot system** — Pre-AI-operation snapshots protect against destructive mutations. Pruned to 25 per document.

---

## 3. Code Issues & Recommended Fixes

### 3.1 Bugs & Logic Errors

#### BUG-1: `moveNodes` — `withoutMoving` array contamination
**File:** `src/domain/documentTree.ts:321-363`

When moving nodes "before" or "after", the code does `withoutMoving = [...withoutMoving, ...movingNodes]` (line 337 and 359), which appends moved nodes to the end of the array. This means nodes that were already in `withoutMoving` can appear twice if they happen to share the same `parentId` as the destination. The subsequent `normalizeSiblingOrder` calls then fix the order but the array contains duplicates.

**Impact:** Potential duplicate node references in the array (though `uniqueById` in historySlice deduplicates on set).

**Fix:** Remove moved nodes from `withoutMoving` before splicing them in, and avoid the `=[...withoutMoving, ...movingNodes]` pattern. The moved nodes should only exist in their new position in the destSiblings array.

```typescript
// After splice, rebuild the full array properly:
const keptNodes = withoutMoving.filter(n => !idsToMove.includes(n.id));
// Then insert movingNodes at the correct position among keptNodes with same parentId
```

#### BUG-2: `deleteFile` race with `createNewFile`
**File:** `src/hooks/useFileSystem.ts:414-424`

When deleting the last document, `createNewFile()` is called, then `setState` filters out the deleted doc. But `createNewFile` itself does `setState` to add the new doc. The subsequent filter setState could remove the newly created doc if IDs collide.

**Fix:** Use a single atomic state update:

```typescript
if (newDocs.length === 0) {
  const newDoc = await createNewFileAndGetDoc(...);
  useAppStore.setState({ documents: [newDoc], activeFileId: newDoc.id, ... });
}
```

#### BUG-3: `deleteNodesPromoteChildren` — orderKey floating point precision
**File:** `src/domain/documentTree.ts:188-189`

The orderKey calculation uses `key += (pathOrders[index] + 1) / Math.pow(1000, index)`. With deeply nested removed parent chains (3+ levels), floating point precision can cause incorrect ordering.

**Fix:** Use a stable sort with tuple comparison instead of floating-point encoding:

```typescript
// Compare [order0, order1, order2, ...] arrays lexicographically
const compareOrders = (a: number[], b: number[]) => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};
```

#### BUG-4: Clipboard paste — `setNodes` doesn't set activeId
**File:** `src/hooks/useAppHotkeys.ts:246-264`

When pasting nodes, `setNodes` is called but `activeId` and `selectedIds` are not updated to reflect the newly created nodes. The pasted cards are invisible to keyboard navigation until the user manually clicks one.

**Fix:** After `setNodes`, set `activeId` to the first newly created node.

#### BUG-5: `handleGlobalPaste` editable target guard is incomplete
**File:** `src/hooks/useAppHotkeys.ts:203-208`

The paste handler checks `target.tagName === "TEXTAREA" || target.tagName === "INPUT"` AFTER already reading clipboard data. But `editingId` check on line 192 already guards against editing mode. The redundant check is fine but the early `if (!text) return;` on line 201 means HTML-only pastes (with no plain text) are silently ignored.

**Fix:** Move the editable target check before the text check.

### 3.2 Performance Issues

#### PERF-1: `useAppHotkeys` — `computeDescendantIds` recalculates on every keydown
**File:** `src/hooks/useAppHotkeys.ts:451`

`computeDescendantIds(nodes, activeId)` is called synchronously on every Delete/Backspace keypress. For large documents (1000+ nodes), this does a full tree index build + BFS traversal.

**Fix:** The `treeIndex` is already computed in `App.tsx`. Pass descendant IDs as a prop or derive from the existing memoized computation.

#### PERF-2: `App.tsx` — `activeAncestorPath.includes(node.id)` is O(n) per card
**File:** `src/App.tsx:199`

`activeAncestorPath.includes(node.id)` runs for every card render. `activeAncestorPath` is an array; `.includes()` is O(k) where k is path length. With N cards, this is O(N * k).

**Fix:** Convert `activeAncestorPath` to a `Set` in `App.tsx` and pass it down:

```tsx
const activeAncestorSet = useMemo(() => new Set(activeAncestorPath), [activeAncestorPath]);
// Then: isInPath={activeAncestorSet.has(node.id)}
```

#### PERF-3: `Card.tsx` — 11 store selectors per card
**File:** `src/components/Card.tsx:81-96`

Each Card component subscribes to 11 store values via `useShallow`. Every state change triggers a shallow equality check across all 11 values. With 100+ cards, this is significant.

**Fix:** Split into two selectors: one for visual state (`isActive`, `isSelected`, `isEditing`, `isDragged`, `isBright`) and one for action callbacks (which rarely change). Or use a single derived selector object.

#### PERF-4: `buildTreeIndex` called multiple times per render cycle
**File:** `src/App.tsx:89`, `src/hooks/useBoardLayout.ts:95`

`buildTreeIndex(nodes)` is called in `App.tsx` (memoized), then `useColumns` is called which may call it again if `treeIndex` is not passed. Currently `App.tsx` does NOT pass `treeIndex` to `useColumns`.

**Fix:** Pass the memoized `treeIndex` from App.tsx to `useColumns`:
```tsx
const columns = useColumns(nodes, treeIndex, activeAncestorPath, activeId, useActiveCorridor);
```

#### PERF-5: `getSearchNodes` loads ALL files into memory
**File:** `src/domain/documentService.ts:289-307`

Every time the command palette opens, `getSearchNodes` loads every file from IndexedDB, normalizes all nodes, and builds a search index. For a user with many large documents, this is a memory spike.

**Fix:** Add incremental indexing — only re-index documents whose `updatedAt` changed since last index. Or paginate/load on demand.

### 3.3 Structural Issues

#### STRUCT-1: Module-level mutable state
**Files:** `src/hooks/useFileSystem.ts:9-15`, `src/domain/aiProvider.ts:98-100`, `src/domain/jobRunner.ts:10-12`, `src/hooks/useAppHotkeys.ts:107`

Several modules use module-level mutable variables (`pendingSave`, `isHydratingFile`, `providers` Map, `activeJobs` Set, `lastCopiedCards`). These are singletons that persist across hot module replacement and can cause stale state in development.

**Impact:** Hot reload issues, test isolation problems, potential memory leaks.

**Fix:** Wrap in classes/objects that can be instantiated, or use Zustand stores for shared mutable state.

#### STRUCT-2: `useFileSystemInit` effect has no cleanup for async init
**File:** `src/hooks/useFileSystem.ts:95-164`

The `init()` function inside `useEffect` is async but the effect has no cancellation mechanism. If the component unmounts during `init()`, `setNodesRaw` will be called on an unmounted component.

**Fix:** Add a cancelled flag:
```typescript
let cancelled = false;
async function init() {
  // ...
  if (!cancelled) setNodesRaw(newNodes);
}
return () => { cancelled = true; };
```

#### STRUCT-3: `App.tsx` is too large (277 lines) and handles too many concerns
**File:** `src/App.tsx`

The App component handles: fullscreen listeners, tree indexing, column building, scroll management, file import, zen mode, and renders the entire component tree.

**Fix:** Extract `BoardView` component (columns rendering), `AppLayout` (zen mode toggle), and `ImportHandler` into separate components.

#### STRUCT-4: Direct store access inside domain functions
**Files:** `src/domain/aiOperations.ts:44`, `src/domain/contextExtraction.ts`, `src/db/snapshots.ts:27`

`useAppStore.getState()` is called inside domain-layer functions, coupling them to the store. This makes testing harder and breaks the layer boundary.

**Fix:** Pass `nodes` as a parameter instead of reading from store. The caller (`aiOperations.ts:44`) already has access to `useAppStore.getState().nodes` — just pass it through.

### 3.4 Vulnerabilities & Security

#### SEC-1: `metadata` catchall schema allows arbitrary data
**File:** `src/utils/schema.ts:16`

`PuuNodeMetadataSchema` uses `.catchall(z.unknown())`, allowing any key-value pair in metadata. While not directly exploitable, this means malicious imported files could store arbitrarily large data in metadata.

**Fix:** Add size limits or restrict allowed keys.

#### SEC-2: `eval`-like patterns in plugin system
**File:** `src/plugins/registry.ts`

The plugin registry has no sandboxing. If a plugin is loaded from an untrusted source, its `hooks` and `cardActions` run with full access to the DOM, store, and all JavaScript APIs.

**Impact:** This is by design for the current internal plugin system, but if a marketplace is added later, this needs a sandbox (Web Workers with limited APIs, or iframe-based isolation).

#### SEC-3: `MAX_FILE_SIZE_BYTES` only checked on import, not on save
**File:** `src/hooks/useFileSystem.ts`, `src/domain/documentService.ts`

The 5MB limit is enforced during file import but not during IndexedDB saves. A user could theoretically store very large documents through the editor.

**Fix:** Add a size check in `DocumentService.saveNodes`.

### 3.5 UX Issues

#### UX-1: No visual feedback when undo/redo clears selection
**File:** `src/hooks/useAppHotkeys.ts:304-314`

After undo/redo, `clearSelection()` and `setActiveId(null)` are called, leaving the user with no active card. The board appears "deselected" and keyboard navigation stops working until the user clicks a card.

**Fix:** After undo/redo, set `activeId` to the first node of the restored state, or to the node that was most recently interacted with.

#### UX-2: Export menu has no "close on Escape" handler
**File:** `src/components/Header.tsx`

The export dropdown only closes on outside click (pointerdown). It should also close on Escape key.

#### UX-3: Settings panel has no keyboard navigation between toggles
**File:** `src/components/SettingsPanel.tsx`

The settings toggle buttons are not focusable in a logical tab order. Users relying on keyboard cannot efficiently navigate between settings.

**Fix:** Wrap each setting row in a focusable container and add `tabIndex` + keyboard handlers.

#### UX-4: `FloatingCardActions` uses `document.getElementById` in render loop
**File:** `src/components/FloatingCardActions.tsx:96`

`updateCardRect` calls `document.getElementById(\`card-${activeId}\`)` on every scroll/resize event (via rAF). If the card is not yet in the DOM (e.g., virtualization in the future), this silently fails.

**Fix:** Use a ref-based approach — have Card expose its rect via a callback ref.

#### UX-5: Command palette search has 300ms debounce but no loading indicator
**File:** `src/components/CommandPalette.tsx:103-118`

When typing, there's a 300ms delay with no visual feedback. Users may think the search is broken.

**Fix:** Show a subtle "Searching..." indicator during the debounce period.

### 3.6 Dead Code & Leftovers

#### DEAD-1: `focusModeScope` state is never used
**File:** `src/store/slices/uiSlice.ts:8`, `src/store/appStoreTypes.ts`

`focusModeScope` has values `single`, `branchLevel`, `column` but is only displayed in Settings. No component reads or acts on this value.

#### DEAD-2: `editorMode` state is never used
**File:** `src/store/slices/uiSlice.ts:9`

`editorMode` has `markdown` and `visual` options but the app only renders a markdown textarea. The "visual" mode is unimplemented.

#### DEAD-3: `computeAncestorPath` (non-index version) is unused
**File:** `src/utils/tree.ts:49-54`

`computeAncestorPath` calls `buildTreeIndex` internally but `App.tsx` uses `computeAncestorPathFromIndex` with the pre-built index. The non-index version is dead code.

#### DEAD-4: `computeDescendantIds` (non-index version) is used only in hotkeys
**File:** `src/utils/tree.ts:84-86`, `src/hooks/useAppHotkeys.ts:451`

This rebuilds the tree index for a single call. Should use the index-based version.

#### DEAD-5: `getOrderedChildren` is unused
**File:** `src/utils/tree.ts:88-93`

Exported but never imported anywhere.

#### DEAD-6: `PUUNOTE_JSON_FORMAT` export is not used outside documentExport
**File:** `src/domain/documentExport.ts:10-11`

These constants are exported but not imported by any other module.

---

## 4. UI/UX Problems Summary

| Issue | Severity | File |
|-------|----------|------|
| Undo/redo leaves no active card | Medium | useAppHotkeys.ts |
| Export menu no Escape close | Low | Header.tsx |
| Settings no keyboard nav | Low | SettingsPanel.tsx |
| FloatingCardActions DOM lookup in rAF | Medium | FloatingCardActions.tsx |
| Command palette no loading indicator | Low | CommandPalette.tsx |
| Pasted cards not auto-selected | Medium | useAppHotkeys.ts |
| Settings `focusModeScope` unused | Low | uiSlice.ts |
| Settings `editorMode` unused | Low | uiSlice.ts |
| No virtualization for large documents | High | App.tsx (board rendering) |
| No search result highlighting | Low | CommandPalette.tsx |
| Zen mode exit button is small/hard to find | Low | App.tsx |

---

## 5. Checklist

### Completed
- [x] Project overview and architecture mapping
- [x] Core data model analysis (PuuNode tree)
- [x] State management review (Zustand slices)
- [x] Domain logic audit (documentTree, documentService, documentExport)
- [x] AI provider foundation review
- [x] Plugin registry review
- [x] Hook analysis (useFileSystem, useAppHotkeys, useBoardLayout)
- [x] Component audit (Card, Header, CommandPalette, Settings, FloatingCardActions)
- [x] Utility audit (tree, markdownParser, schema, id)
- [x] Database schema review (Dexie)
- [x] Snapshot system review
- [x] Security review (XSS, schema validation, import sanitization)
- [x] Performance hotspots identified
- [x] Dead code cataloged
- [x] UX issues documented
- [x] Test coverage verified (6 test files)

### Recommended Next Actions
- [ ] Fix BUG-1: `moveNodes` array contamination
- [ ] Fix BUG-2: `deleteFile` race condition
- [ ] Fix BUG-3: `orderKey` floating point precision
- [ ] Fix BUG-4: paste doesn't set activeId
- [ ] Fix PERF-2: O(N*k) `.includes()` per card → Set lookup
- [ ] Fix PERF-4: duplicate `buildTreeIndex` calls
- [ ] Fix STRUCT-2: async init cancellation
- [ ] Fix STRUCT-4: decouple domain from store
- [ ] Remove DEAD-1 through DEAD-6
- [ ] Add size limit to `saveNodes` (SEC-3)
- [ ] Implement card virtualization for 500+ node documents
- [ ] Add loading indicator to command palette search
- [ ] Fix undo/redo activeId behavior

---

## 6. Future AI Plugin Architecture

### Current State
The codebase has a solid foundation:
- `AiProvider` interface with `run()` method
- `AiProviderRegistry` for provider registration
- `mockAiProvider` with local draft generation
- `contextExtraction.ts` for LLM context building with token estimation and budget truncation
- `JobRunner` for async operation tracking
- `metadata.ai` field on nodes for provenance tracking
- `takeDocumentSnapshot` before AI operations

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Plugin Manifest                      │
│  { id, name, version, permissions, providers[], hooks[] }│
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Plugin Sandbox                         │
│  - Web Worker isolation                                  │
│  - Capability-based permissions (read/write nodes, fs)   │
│  - Memory/CPU limits                                     │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ AI Providers  │  │ UI Plugins   │  │ Automation Plugins   │
│ (LLM API)     │  │ (card actions│  │ (hooks, cron-like)   │
│ - OpenAI      │  │  injections) │  │                      │
│ - Anthropic   │  │              │  │                      │
│ - Ollama      │  │              │  │                      │
│ - Local       │  │              │  │                      │
└──────────────┘  └──────────────┘  └──────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Core Integration Layer                  │
│  - PluginRegistry (existing, enhanced)                   │
│  - AiProviderRegistry (existing, enhanced)               │
│  - Secret storage (encrypted API keys)                   │
│  - Audit log (all plugin actions)                        │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Plugin Format**: JavaScript modules loaded via dynamic `import()` with a manifest.json. No npm dependencies — plugins must use only browser APIs and PuuNote's exposed API.

2. **Sandbox**: Web Workers with a restricted global. No direct DOM access. Communication via `postMessage` with a typed API:
   ```typescript
   interface PluginAPI {
     getNodes(): PuuNode[];
     updateNode(id: string, content: string): void;
     addNode(parentId: string, content: string): string;
     deleteNode(id: string): void;
     getContext(targetNodeId: string, options: LLMContextOptions): ContextExtractionResult;
     toast(message: string, type: 'info' | 'warning' | 'error'): void;
   }
   ```

3. **AI Provider Configuration**: Store API keys in IndexedDB (encrypted with a user passphrase). Support multiple providers with per-operation routing.

4. **Operation Types**:
   - `expand-card`: Generate child cards (existing)
   - `summarize`: Collapse a branch into a summary card
   - `rewrite`: Rewrite card content with a style prompt
   - `translate`: Translate card content
   - `tag`: Auto-tag cards based on content
   - `search`: Semantic search across all documents

5. **Audit Trail**: Every plugin action is logged with timestamp, plugin ID, operation, and before/after snapshots. Visible in a new "Activity Log" panel.

6. **Backward Compatibility**: The current `mockAiProvider` and `AiProviderRegistry` interface should remain stable. New providers implement the same interface.

### Migration Path

1. **Phase 1** (current codebase + fixes): Stabilize the existing mock provider, fix identified bugs, add real OpenAI/Anthropic providers.
2. **Phase 2**: Add API key storage UI, provider selection in settings, and operation-specific prompts.
3. **Phase 3**: Implement Web Worker sandbox, plugin manifest format, and marketplace.
4. **Phase 4**: Add automation plugins (hooks triggered by node events) and audit log UI.
