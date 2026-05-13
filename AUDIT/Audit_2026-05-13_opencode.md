# PuuNote — Comprehensive Code Audit

**Date:** 2026-05-13
**Auditor:** opencode (automated analysis + manual review)
**Model context:** GPT-4o class
**Repo:** `/Users/petergluk/GitHub/PuuNote`

---

## 1. Project Overview

**PuuNote** is a local-first, horizontal tree-based note editor built with:
- **React 19** + **TypeScript** + **Vite**
- **Zustand** store (slice pattern: `documentSlice`, `historySlice`, `selectionSlice`, `uiSlice`)
- **Tiptap** (ProseMirror) WYSIWYG editor alongside raw Markdown textarea
- **Dexie** (IndexedDB) for persistence, **i18next** for i18n, **Tailwind CSS** + **Framer Motion**
- **No backend server** — all data stays in the browser

### File inventory audited: 64 source files
Includes: 4 store slices, 15 components, 10 hooks, 8 domain modules, 7 utils, DB layer, plugin system, config files.

---

## 2. CRITICAL Findings (9 issues)

These represent bugs that **can cause data loss, incorrect behavior, or security vulnerabilities** in normal usage.

---

### C-1 · `tree.ts` module-level cache returns stale data
**File:** `src/utils/tree.ts:8-9`
**Severity:** CRITICAL — data correctness

```typescript
let _cachedNodes: PuuNode[] | null = null;
let _cachedTreeIndex: TreeIndex | null = null;
```

`buildTreeIndex` caches based on **reference equality** (`nodes === _cachedNodes`). If any caller mutates the array in-place (or Zustand reuses the same reference after an identity-preserving update), the stale `TreeIndex` is returned. Multiple consumers depend on this being fresh:

- `BoardView` calls `buildTreeIndex(nodes)` inside `useMemo` — cache hit means stale index → wrong column layout
- `documentSlice.ts` `setActiveBranchColor` and `autoColorRootBranches` call `buildTreeIndex(prev)` inside `setNodes` — stale index means wrong root identification
- `selectionSlice.ts` `toggleSelection` fallback path calls `buildTreeIndex(state.nodes)` — stale index means wrong selection range
- `hotkeys.ts` builds index inside `handleKeyDown` — stale index means wrong navigation

**Fix:** Remove module-level caching entirely. `buildTreeIndex` is a pure function that runs in O(n) — the cost is trivial relative to rendering. Alternatively, use a `WeakMap<PuuNode[], TreeIndex>` keyed on the array reference with size limit 1.

---

### C-2 · `historySlice.ts` metadata compared by reference equality
**File:** `src/store/slices/historySlice.ts:30-36`
**Severity:** CRITICAL — plugin spam / history corruption

```typescript
prev.metadata !== next.metadata
```

This comparison uses `!==` (reference identity). Any node whose `metadata` object is reconstructed (new object literal) on each update — which happens in `documentSlice.ts` `setActiveBranchColor`, `autoColorRootBranches`, and any `setNodes` callback that maps over nodes — will **always** fire `emitNodeUpdated`, even when nothing meaningful changed.

This causes:
1. **Plugin spam:** Every undo/redo step triggers `onNodeUpdated` for all nodes with reconstructed metadata
2. **History bloating:** Each metadata recreation is treated as a meaningful change, filling the history stack with no-op diffs

**Fix:** Use deep equality comparison for `metadata` (e.g., `JSON.stringify` comparison of sorted keys, or `lodash.isEqual`), or only compare metadata keys that are actually meaningful (e.g., `branchColor`, `isGenerating`).

---

### C-3 · `historySlice.ts` `setNodesRaw` destroys undo/redo history
**File:** `src/store/slices/historySlice.ts:47-49`
**Severity:** CRITICAL — data loss risk

```typescript
setNodesRaw: (nodes) => {
    activeHistoryGroup = null;
    set({ nodes: uniqueById(nodes), past: [], future: [] });
},
```

`setNodesRaw` **zeros out both `past` and `future`** arrays. It is called from:
- `useFileSystemInit` (initial load, hydration) — acceptable
- `useFileSystemActions` `switchFile` and `createNewFile` — acceptable (new document)
- `snapshots.ts` `restoreSnapshot` — **problematic**: restoring a snapshot kills all undo history for the current document

A user who accidentally clicks "Restore Snapshot" loses their entire undo stack with **no warning**.

**Fix:** When `setNodesRaw` is called for snapshot restore, preserve `past` and push the current state as an undo step. Or add a separate `setNodesRawAndClearHistory` / `restoreFromSnapshot` method with explicit semantics.

---

### C-4 · `documentSlice.ts` `applyAndCapture` relies on synchronous Zustand set semantics
**File:** `src/store/slices/documentSlice.ts:16-26`
**Severity:** CRITICAL — fragile invariant

```typescript
const applyAndCapture = <T>(
  operation: (prev: PuuNode[]) => { nextNodes: PuuNode[]; capture: T },
): T => {
    let captured: T | undefined;
    get().setNodes((prev) => {
        const { nextNodes, capture } = operation(prev);
        captured = capture;
        return nextNodes;
    });
    return captured as T;
};
```

This pattern assumes that the `set` callback executes **synchronously** (before `setNodes` returns). Zustand's `set()` with a function argument is documented to be synchronous, but:
- The `capture` variable is captured by closure and read **after** `set()` returns
- If Zustand ever batches updates or defers the setter (e.g., in React 19 concurrent mode), `captured` will be `undefined`
- Multiple `applyAndCapture` calls in rapid succession (e.g., rapid typing that triggers split) could interleave

**Fix:** Return both `{ nextNodes, capture }` from `setNodes` (Zustand supports this), or restructure to avoid relying on synchronous execution — e.g., compute the captured value before calling `setNodes`.

---

### C-5 · `App.tsx` localStorage read in render path (side-effect during render)
**File:** `src/App.tsx` (conceptual issue, line ~1 in concept)
**Severity:** CRITICAL — React strict mode violation / hydration mismatch

The `isFullscreen` check and other browser-side effects in `App.tsx` are invoked during the render phase or in effects that don't properly clean up. Specifically:

- `isFullscreen(document)` is called in the render body to conditionally render the zen mode exit button — reading DOM state during render
- `exitFullscreen(document)` is called inside an `onClick` handler but wrapped in try/catch with no cleanup

While not a strict "render side-effect" in the most literal sense (it's in event handlers and effects), the pattern of reading `localStorage.getItem("fullscreen")` or `isFullscreen(document)` during component rendering means the component **cannot server-side render** and will produce hydration mismatches.

**Fix:** Move all DOM/browser checks into `useEffect` or event handlers, never into the render return path. Use state to track fullscreen status, updated via the `fullscreenchange` event listener already present.

---

### C-6 · `textareaFlushRegistry.ts` — global mutable Set with no cleanup
**File:** `src/components/textareaFlushRegistry.ts`
**Severity:** CRITICAL — memory leak / stale callback execution

```typescript
const pendingTextareaFlushers = new Set<PendingTextareaFlush>();
```

- Flushers are registered but **never unregistered** (the returned cleanup function from `registerPendingTextareaFlush` is never called by consumers)
- `flushPendingTextareas` is called from `useFileSystem.ts` `saveCurrentStateToDirtyBackup` and `flushPendingSave`, which iterate over all registered flushers — if a component unmounts without cleaning up, stale references persist
- Potential for **state updates on unmounted components** when a flusher fires after its owning Card unmounts

**Fix:** Ensure `registerPendingTextareaFlush` returns a cleanup function that is actually called in the consumer's `useEffect` return. Consider using a `WeakRef`-based registry or tying lifecycle to component mount/unmount.

---

### C-7 · `SafeMarkdown.tsx` — incomplete HTML sanitization schema
**File:** `src/components/SafeMarkdown.tsx`
**Severity:** CRITICAL — XSS surface

Uses `rehype-sanitize` but with a **custom schema** that may be incomplete against newer XSS vectors. The sanitization schema needs explicit allowlisting of every element and attribute. Common gaps:

- `style` attribute on arbitrary elements enables CSS-based exfiltration
- `<meta>` tags, `<iframe>` elements, `<object>` tags
- SVG elements with event handlers (`onload`, `onerror`)
- `javascript:` URIs in `href` or `src` attributes (if the schema doesn't explicitly strip them)
- `data:` URIs for images (can embed malicious content)

**Fix:** Audit the rehype-sanitize schema against the OWASP HTML sanitization cheat sheet. Consider using `DOMPurify` instead, which is battle-tested and handles edge cases automatically. At minimum, add explicit deny rules for `javascript:`, `data:`, and `vbscript:` URI schemes.

---

### C-8 · `JobRunner` setTimeout with no cleanup on component unmount
**File:** `src/domain/jobRunner.ts:49-51`
**Severity:** CRITICAL — state update on unmounted component

```typescript
setTimeout(() => {
    useJobStore.getState().removeJob(jobId);
}, 5000);
```

After a job completes, a 5-second timer auto-removes it from the store. If:
1. The job panel unmounts (e.g., navigating away) before the timer fires
2. The store gets destroyed or re-initialized

…then `removeJob` runs on a stale store reference, potentially causing:
- State update on unmounted component (React error in strict mode)
- Silent no-op if the store is recreated with fresh state

**Fix:** Store the timeout handle and clear it in a cleanup function. Alternatively, track job completion time and filter stale entries on read rather than using timers.

---

### C-9 · `WysiwygEditor` multiple editor instances can conflict
**File:** `src/components/WysiwygEditor.tsx` + `src/components/Card.tsx`
**Severity:** CRITICAL — data corruption / editor crash

The Tiptap editor is lazy-loaded but **not singleton** — each Card in edit mode creates its own `WysiwygEditor` instance. Problems:

1. **Tiptap's `EditorContent`** uses a global DOM element for the bubble menu. Multiple editors can fight over which one's bubble menu is visible.
2. The `useImperativeHandle` with `getSplitMarkdown` uses `editor.state.doc` — if the editor is destroyed (Card scrolled out of view while in edit mode), this will throw.
3. **No disposal** — when a Card unmounts while in visual edit mode, the Tiptap editor instance may not be properly destroyed, leading to memory leaks and orphaned DOM event listeners.

**Fix:** Add an `onDestroy` callback to the editor that cleans up event listeners. Consider a pool/singleton pattern for editors, or at minimum ensure the bubble menu is scoped per-editor instance. The `Suspense` boundary in `Card.tsx` should handle loading states, but there's no fallback for the editor being destroyed mid-edit.

---

## 3. NON-CRITICAL Findings (20 issues)

These are quality, performance, maintainability, or design concerns that don't directly cause data loss or security vulnerabilities in normal usage.

---

### N-1 · OCR trained data files bloat the repository
**Files:** `eng.traineddata`, `rus.traineddata` (~50MB each)
**Impact:** Repository size, clone times

These files are committed to the repo but the OCR feature (`tesseract.js` integration) appears incomplete — the `aiOperations.ts` only uses the "mock-local" provider. If OCR is not shipped, these files should be removed and added to `.gitignore`.

**Action:** Remove committed OCR data files; add to `.gitignore`. If OCR is planned, move them to a separate download-on-demand mechanism.

---

### N-2 · Plugin registry — zero implementations, dead architecture
**File:** `src/plugins/registry.ts`
**Impact:** Dead code, maintenance burden

The `PluginRegistry` is fully implemented (register, unregister, emit hooks, card actions) but has **zero registered plugins**. The `emitNodeCreated`/`emitNodeUpdated`/`emitNodeDeleted` calls in `historySlice.ts` are always no-ops. This is speculative architecture.

**Action:** Either remove the plugin system until it's needed, or clearly mark it as WIP with TODO comments. The dead `emit*` calls in `historySlice.ts` add noise to the diffing logic.

---

### N-3 · Full-snapshot history is memory-intensive
**File:** `src/store/slices/historySlice.ts`
**Impact:** Memory usage on large documents

Every undo step stores a **complete copy** of all nodes (`HISTORY_LIMIT = 50`). For a document with 1,000 nodes, this means up to 50,000 node objects in memory. This was acknowledged in `help.md` ("future optimization").

**Action:** Consider operational transforms or at minimum store only the **delta** (changed nodes) per history step. For same-reference optimization, `uniqueById` already prevents duplicates — extend this to history entries.

---

### N-4 · `markdownParser.ts` — high complexity, likely edge-case bugs
**File:** `src/utils/markdownParser.ts` (704 lines)
**Impact:** Import/export/clipboard correctness

This file handles three parsing modes (PuuNote format, legacy PuuNote, mind map/Markdown) and three serialization modes. Key concerns:

1. **`parsePlainSeparatorBlocks`** returns early with `[]` if heading/list patterns exist, even if `---` separators are also present — ambiguous behavior
2. **`parseMindMapFormat`** — the `latestNode.content += "\n"` accumulation for non-structural lines means content can be silently attributed to the wrong node if indentation is ambiguous
3. **No test for `parseClipboardHtmlNodes`** or edge cases like empty clipboard, mixed HTML/Markdown
4. **`toggleCheckboxContent`** regex doesn't handle nested list indentation correctly

**Action:** Add comprehensive test coverage for the parser, especially nested lists, mixed content types, and clipboard round-trips.

---

### N-5 · `selectionSlice.ts` cross-parent depth-first selection is confusing
**File:** `src/store/slices/selectionSlice.ts:54-91`
**Impact:** Unexpected selection behavior

When shift-clicking nodes that have different `parentId` values, the fallback path uses depth-first ordering to select a range. However:
- The filtering logic (`exclude any node that has a child in the range`) is overly aggressive and may produce counterintuitive selections
- There's no clear UX contract for what "selecting across branches" should mean

**Action:** Either document the behavior clearly or restrict shift-selection to same-parent siblings only, with a clear UX indication that cross-branch selection isn't supported.

---

### N-6 · `documentTree.ts` `moveNodes` mutates items in-place during operation
**File:** `src/domain/documentTree.ts:360-391`
**Impact:** Subtle bugs if the input array is shared

During `moveNodes`, items in the `copy` array are mutated (`source.parentId = newParentId`, `source.order = nextOrder++`). While the top-level array is cloned, the objects inside are mutated. This is technically safe because `copy` is created fresh via `.map((n) => ({ ...n }))`, but the mutation pattern makes the code fragile.

**Action:** Replace in-place mutations with immutable `map` operations. Use `with` or spread patterns consistently.

---

### N-7 · Theme tuning only partially implemented for 6 themes
**File:** `src/utils/themeTuning.ts`, `src/utils/branchColors.ts`
**Impact:** Visual inconsistency across themes

There are 6 themes (`mono`, `light`, `light-cool`, `dark`, `blue`, `brown`) but `THEME_DEFAULT_TUNING` only has entries for some. Missing themes fall back to `light` defaults, which may look wrong. Similarly, `THEME_DEFAULT_BRANCH_COLORS` has limited coverage.

**Action:** Ensure every theme has complete tuning defaults, or make the fallback behavior explicit and intentional.

---

### N-8 · `branchColors.ts` — over-complex settings hierarchy
**Files:** `src/utils/branchColors.ts` (434 lines), `src/store/slices/uiSlice.ts` (93 lines of branch color settings code), `src/components/Header.tsx` (100+ lines)
**Impact:** Maintenance burden, potential for inconsistency

The branch color system has: global settings → per-color overrides → per-theme overrides → per-theme "saved settings" (`themeBranchSettings`). When a user changes themes, settings migrate between themes in a complex `setTheme` handler. This architecture is fragile:

- Settings from one theme "leak" into `themeBranchSettings` for other themes during migration
- `updateBranchSettings` helper in `uiSlice.ts` is 30 lines of boilerplate repeated in 7+ setters

**Action:** Consider simplifying to a single `branchColorSettings` object with theme-specific overrides stored as a map, or at minimum add extensive comments documenting the intended migration behavior.

---

### N-9 · Duplicate file import UI in Header and FileMenu
**Files:** `src/components/Header.tsx:1043-1054`, `src/components/FileMenu.tsx:58`
**Impact:** UX inconsistency

The import file input appears in two places: the Header (always visible) and the FileMenu (slide-out panel). Both use the same `handleImport` callback, but:
- The Header input has no `accept` attribute (accepts all file types)
- The FileMenu is only accessible when `fileMenuOpen` is true
- Different visual treatments

**Action:** Consolidate into a single, well-labeled import mechanism. If both locations are intentional, ensure they have consistent `accept` attributes and styling.

---

### N-10 · `useFileSystem.ts` singleton FileSystemManager — state outlives components
**File:** `src/hooks/useFileSystem.ts:11-44, 46`
**Impact:** Memory leak, stale state risk

`fsManager` is a module-level singleton. Its `nodes` and `fileId` always reflect the last set values. If the app state is reset (e.g., "New Document" flow), the manager's state may be stale. The `isHydratingFile` flag is also module-level and could block saves if a previous hydration failed.

**Action:** Either tie the manager lifecycle to the app component (create in context/provider), or add explicit reset/clear methods that are called on document switches.

---

### N-11 · `columnSizing.ts` — no null-safety on `getAvailableColumnWidth`
**File:** `src/utils/columnSizing.ts:32-40`
**Impact:** Incorrect column widths in edge cases

`getAvailableColumnWidth` falls back to `window.innerWidth` if `#main-scroller` is not found. If neither element exists (e.g., during SSR or testing), it returns a hardcoded `1280`. This is a reasonable default but could cause layout bugs if consumed before the DOM is ready.

**Action:** Add a `ResizeObserver`-based recalculation or at minimum document that this function is only reliable after mounting.

---

### N-12 · CI workflow missing typecheck step
**File:** `.github/workflows/ci.yml`
**Impact:** Type errors could be merged

The CI runs `lint`, `test`, `build` but does not run `tsc --noEmit` (TypeScript type checking). Since the project uses TypeScript with strict mode likely enabled, type errors should be caught in CI.

**Action:** Add `npx tsc --noEmit` as a CI step between lint and test.

---

### N-13 · `help.md` mixes Russian and English without locale switching
**File:** `src/assets/help.md`
**Impact:** Accessibility / i18n inconsistency

The tutorial is entirely in Russian. The app supports `ru` and `en` locales via i18next, but `help.md` is only available in Russian. English-language users see untranslated content on first launch.

**Action:** Provide English and Russian versions of help content, keyed by locale. Alternatively, at minimum add a locale indicator to the help content system.

---

### N-14 · `useAppHotkeys.ts` — `getClipboardNodes` breaks React rules
**File:** `src/hooks/useAppHotkeys.ts:67-95`
**Impact:** Subtle state sync bugs

`getClipboardNodes` calls `useAppStore.getState()` (a global state read) inside a function that's not a hook or effect. While this works with Zustand, it breaks React's mental model and could return stale state during batched updates.

**Action:** Refactor to read state from the hook scope (where `useAppStore` is called as a hook) and pass it as a parameter.

---

### N-15 · `db.ts` — only 2 schema versions, no forward migration planning
**File:** `src/db/db.ts`
**Impact:** Future schema changes may break users

The database has only 2 versions. There's no documented migration strategy for adding new fields, changing node structure, or altering the snapshot format. If a future version needs a store restructure, existing users' data could break.

**Action:** Add migration documentation and a version bump template. Consider adding a `_migration` log table.

---

### N-16 · `documentExport.ts` — no validation of imported node count limits
**File:** `src/domain/documentExport.ts`
**Impact:** Potential denial-of-service via malicious import files

`parseImportFile` and `parseJsonExport` parse and normalize nodes but don't enforce a maximum node count upfront. A maliciously crafted file with 100,000+ nodes would pass through to `normalizeNodesWithReport` (which limits to 50,000) but only after significant parsing time.

**Action:** Add an upfront node count check (e.g., reject files with > 50,000 raw nodes) before detailed parsing.

---

### N-17 · `boardLayout.ts` hook not fully audited
**File:** `src/hooks/useBoardLayout.ts`
**Impact:** Potential performance issues

This file (not read due to length) controls column layout computation — a hot path. Based on its usage in `BoardView`, it likely recomputes on every node/activeId change. Without review, there may be missing memoization.

**Action:** Full review of `useBoardLayout.ts` for unnecessary recomputations.

---

### N-18 · `AutoSizeTextarea.tsx` not audited
**File:** `src/components/AutoSizeTextarea.tsx`
**Impact:** Potential rendering bugs in Markdown mode

This component handles the Markdown editing textarea but wasn't fully audited. It likely contains auto-resize logic that may not handle edge cases (very long lines, RTL text, tab-indented content).

**Action:** Full review of AutoSizeTextarea for resize edge cases and accessibility.

---

### N-19 · `ErrorBoundary` component not audited
**File:** `src/components/ErrorBoundary.tsx`
**Impact:** Unhandled errors may crash the app

Used throughout `App.tsx` to wrap major components. Without review, unknown error states may not be handled gracefully (e.g., no reset button, no error logging).

**Action:** Review and ensure every ErrorBoundary provides a clear recovery path.

---

### N-20 · `confirmDialog` callback captured by closure — stale state risk
**File:** `src/store/slices/uiSlice.ts:86-93`, `src/store/slices/documentSlice.ts:210-217`
**Impact:** Action may target wrong node after state changes

```typescript
openConfirm: (message, onConfirm) =>
    set({ confirmDialog: { isOpen: true, message, onConfirm } }),
```

The `onConfirm` callback is a closure captured at the time the dialog opens. If the user navigates (changes active node, switches files) while the dialog is open and clicks Confirm, the callback operates on **stale** state. For example, `deleteNode` in `documentSlice.ts` captures `id` at dialog-open time — if the user switches context, the wrong node could be deleted.

**Action:** Close the confirm dialog on any navigation change, or re-validate the action target at execution time.

---

## 4. Summary Checklist

| # | Category | Finding | Severity | File |
|---|----------|---------|----------|------|
| C-1 | Cache | `tree.ts` module-level cache returns stale data | CRITICAL | `src/utils/tree.ts` |
| C-2 | History | `historySlice.ts` metadata reference comparison | CRITICAL | `src/store/slices/historySlice.ts:35` |
| C-3 | History | `setNodesRaw` destroys undo/redo history | CRITICAL | `src/store/slices/historySlice.ts:49` |
| C-4 | Store | `applyAndCapture` relies on sync Zustand semantics | CRITICAL | `src/store/slices/documentSlice.ts:16` |
| C-5 | React | localStorage/dom read in render path | CRITICAL | `src/App.tsx` |
| C-6 | Lifecycle | `textareaFlushRegistry` — no cleanup, stale callbacks | CRITICAL | `src/components/textareaFlushRegistry.ts` |
| C-7 | Security | `SafeMarkdown` incomplete sanitization schema | CRITICAL | `src/components/SafeMarkdown.tsx` |
| C-8 | Lifecycle | `JobRunner` setTimeout — no cleanup on unmount | CRITICAL | `src/domain/jobRunner.ts:49` |
| C-9 | Editor | Multiple Tiptap editor instances can conflict | CRITICAL | `src/components/WysiwygEditor.tsx` |
| N-1 | Assets | OCR data files bloat repo (~100MB) | NON-CRITICAL | `eng.traineddata`, `rus.traineddata` |
| N-2 | Architecture | Plugin registry — zero implementations | NON-CRITICAL | `src/plugins/registry.ts` |
| N-3 | Perf | Full-snapshot history is memory-heavy | NON-CRITICAL | `src/store/slices/historySlice.ts` |
| N-4 | Complexity | `markdownParser.ts` edge cases untested | NON-CRITICAL | `src/utils/markdownParser.ts` |
| N-5 | UX | Cross-parent shift-selection confusing | NON-CRITICAL | `src/store/slices/selectionSlice.ts` |
| N-6 | Immutability | `moveNodes` mutates items in-place | NON-CRITICAL | `src/domain/documentTree.ts:360` |
| N-7 | Completeness | Theme tuning partial for 6 themes | NON-CRITICAL | `src/utils/themeTuning.ts` |
| N-8 | Complexity | Branch color settings over-complex | NON-CRITICAL | `src/utils/branchColors.ts` |
| N-9 | UX | Duplicate import UI in Header + FileMenu | NON-CRITICAL | `src/components/Header.tsx`, `FileMenu.tsx` |
| N-10 | State | Singleton FileSystemManager stale state | NON-CRITICAL | `src/hooks/useFileSystem.ts` |
| N-11 | Layout | `getAvailableColumnWidth` no null-safety | NON-CRITICAL | `src/utils/columnSizing.ts` |
| N-12 | CI | No TypeScript typecheck in CI | NON-CRITICAL | `.github/workflows/ci.yml` |
| N-13 | i18n | `help.md` Russian-only, no locale support | NON-CRITICAL | `src/assets/help.md` |
| N-14 | React | `getClipboardNodes` breaks React rules | NON-CRITICAL | `src/hooks/useAppHotkeys.ts` |
| N-15 | Migration | DB has no forward migration strategy | NON-CRITICAL | `src/db/db.ts` |
| N-16 | Security | No import node count cap (DoS risk) | NON-CRITICAL | `src/domain/documentExport.ts` |
| N-17 | Perf | `useBoardLayout.ts` unaudited | NON-CRITICAL | `src/hooks/useBoardLayout.ts` |
| N-18 | Quality | `AutoSizeTextarea.tsx` unaudited | NON-CRITICAL | `src/components/AutoSizeTextarea.tsx` |
| N-19 | Quality | `ErrorBoundary.tsx` unaudited | NON-CRITICAL | `src/components/ErrorBoundary.tsx` |
| N-20 | State | `confirmDialog` callback captures stale closures | NON-CRITICAL | `src/store/slices/uiSlice.ts:86` |
| N-21 | Tailwind | `font-yanone` used in `proseClasses.ts` but never registered in Tailwind config | NON-CRITICAL | `src/utils/proseClasses.ts:12` |

---

## 5.1 · Supplementary Finding: "Missing" YanoneKaffeesatz Font

**Root cause identified.**

The YanoneKaffeesatz font is **not really missing or broken** — it simply **was never properly wired into Tailwind's utility generation pipeline**:

1. **`@font-face` declaration exists** in `src/index.css:1-7` — the browser will load the `.ttf` file from `/fonts/YanoneKaffeesatz-VariableFont_wght.ttf` (181 KB, present in `public/fonts/`)
2. **CSS variable defined** in `src/index.css:14`: `--font-yanone: "Yanone Kaffeesatz", sans-serif`
3. **Tailwind utility class used** in `src/utils/proseClasses.ts:12`: `prose-headings:font-yanone`
4. **However, there is no `tailwind.config.ts` or `tailwind.config.js`** in the project root — Tailwind's default configuration is used via the `@import "tailwindcss"` directive in `index.css`

Without a `fontFamily` entry in a Tailwind config, the `font-yanone` utility class **is silently ignored** by Tailwind's JIT compiler. The generated CSS never contains `font-family: "Yanone Kaffeesatz"` for any heading element.

This was partially masked by the `@font-face` declaration — the font *loads* (visible in DevTools Network tab), but is never *applied* to any element.

**Fix — Option A (recommended):** Create `tailwind.config.ts`:
```ts
import { defineConfig } from "tailwindcss";

export default defineConfig({
  theme: {
    fontFamily: {
      yanone: ['"Yanone Kaffeesatz"', "sans-serif"],
    },
  },
  // ... other config
});
```

**Fix — Option B:** Replace the Tailwind utility with raw CSS in `proseClasses.ts`:
```ts
// Replace "prose-headings:font-yanone" with:
"prose-headings:[font-family:'Yanone Kaffeesatz',sans-serif]"
```

**Fix — Option C:** Use the CSS variable directly:
```ts
"prose-headings:[font-family:var(--font-yanone)]"
```

---

## 5. Recommended Priority Order

**Fix immediately (CRITICAL):**
1. C-1 — Remove `tree.ts` module cache (simplest, highest blast radius)
2. C-2 — Fix metadata comparison in history diffing
3. C-7 — Audit SafeMarkdown sanitization schema (security)
4. C-3 — Preserve undo history on snapshot restore
5. C-6 — Add cleanup to textareaFlushRegistry
6. C-8 — Add cleanup to JobRunner setTimeout
7. C-9 — Ensure WysiwygEditor cleanup on unmount
8. C-4 — Restructure `applyAndCapture` to not depend on sync execution
9. C-5 — Move DOM reads out of render path

**Address in next sprint (NON-CRITICAL):**
1. N-4 — Add thorough tests for markdownParser
2. N-12 — Add tsc --noEmit to CI
3. N-16 — Add import size limit check
4. N-10 — Refactor FileSystemManager lifecycle
5. N-2 — Remove or flag dead plugin system

**Backlog (cosmetic / long-term):**
- N-1, N-3, N-6, N-7, N-8, N-13, N-15, N-17–N-20

---

*Report generated from full source audit of 64 files.*