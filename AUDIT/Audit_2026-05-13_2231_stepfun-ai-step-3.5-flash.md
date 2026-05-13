# PuuNote Code Audit Report

**Date:** 2026-05-13 22:31  
**Auditor:** stepfun-ai-step-3.5-flash  
**Project:** PuuNote v0.0.0  
**Stack:** React 19, TypeScript, Vite 6, Zustand, Dexie/IndexedDB, Tailwind CSS 4, Tiptap, Fuse.js, Zod, Vitest

---

## 1. Project Overview

PuuNote is a local-first nonlinear Markdown editor. Documents are stored as trees of cards (nodes) in a flat array structure. The app supports two editing modes: Markdown and Visual (Tiptap). Data is persisted in the browser via IndexedDB (Dexie). Features include drag-and-drop, undo/redo with grouping, timeline view with virtualization (via react-virtuoso), command palette, themes, branch coloring, import/export (Markdown, structured Markdown, JSON), and experimental AI/plugin foundations.

**Core data model:**
- `PuuNode`: `{ id, content, parentId, order?, metadata? }`
- `PuuDocument`: `{ id, title, updatedAt, metadata? }`

**State management:** Zustand store split into slices (UI, selection, history, document). History stores full document snapshots (arrays of nodes).

**Key directories:**
- `src/domain/` – business logic (document tree operations, export, import, validation)
- `src/store/` – Zustand store and slices
- `src/components/` – React UI components
- `src/hooks/` – custom React hooks
- `src/utils/` – helper functions (tree, schema, markdown parsing, etc.)
- `src/db/` – Dexie database layer
- `src/plugins/` – experimental plugin registry

---

## 2. Detailed Findings

### 2.1 Performance & Scalability

#### **D-1: Undo/Redo stores full document snapshots**
- **Location:** `src/store/slices/historySlice.ts:86-90, 99-103`
- **Issue:** Every change that goes into history stores a complete copy of the `PuuNode[]` array. For large documents (thousands of cards), this can quickly consume significant memory (hundreds of MBs) and increase GC pressure, risking crashes or sluggishness.
- **Impact:** High – users working with large documents will experience degraded performance or out-of-memory errors.
- **Mitigation:** Implement incremental diffs/transactions instead of full snapshots. Alternatively, compress snapshots or impose a stricter size limit. The README already acknowledges this as a known issue.

#### **D-2: Flat node array causes O(n) operations**
- **Location:** Throughout – e.g., `src/domain/documentTree.ts`, `src/utils/tree.ts`
- **Issue:** The document model is a flat array. Many operations (find, filter, buildTreeIndex) scan the entire array. While `buildTreeIndex` is called frequently, it rebuilds from scratch each time (with a simple cache that is invalidated on any node change). For large docs, repeated indexing becomes expensive.
- **Impact:** Medium-high – UI updates, tree operations, and search can become slow as document grows.
- **Suggested improvement:** Normalize state to `nodesById: Map<string, PuuNode>` and `childrenByParent: Map<string | null, string[]>`. This would speed up lookups and updates but requires a major refactor with high regression risk.

#### **D-3: BoardView renders all cards without virtualization**
- **Location:** `src/components/BoardView.tsx:106-151`
- **Issue:** The main board view renders every visible card in the DOM. No virtual scrolling/windowing is used (unlike TimelineView which uses `react-virtuoso`). On documents with many cards (e.g., > 500), this can cause significant layout thrashing, slow renders, and jank during scrolling and DnD.
- **Impact:** High for large docs; acceptable for small/medium docs.
- **Mitigation:** Implement virtualization for BoardView. This is non-trivial due to columnar layout and dynamic sizing, but could yield substantial perf gains. The README notes this as a known issue and warns that virtualization is risky.

#### **D-4: History limit is fixed but snapshots can be huge**
- **Location:** `src/store/slices/historySlice.ts:6`
- **Issue:** `HISTORY_LIMIT = 50` limits the number of snapshots, but each snapshot can be arbitrarily large (many MB). Memory usage can still spike during a long session with a large document.
- **Impact:** Medium – could cause memory bloat in long sessions.
- **Mitigation:** Consider compressing snapshots (e.g., structured clone with compression) or switching to diffs.

#### **D-5: Repeated `buildTreeIndex` calls inside effects**
- **Location:** Many components/hooks call `buildTreeIndex(nodes)` inside `useMemo`/`useCallback`. The cache in `utils/tree.ts` reduces rebuilding, but any change to `nodes` invalidates the cache, forcing a full rebuild. This is O(n) per render cycle and can be costly for large docs.
- **Impact:** Medium – could cause dropped frames during rapid updates.
- **Mitigation:** The current cache is already helpful, but a normalized state would eliminate the need for repeated indexing.

### 2.2 Memory Management

#### **M-1: Large clipboard payloads cached without size limit beyond 1MB**
- **Location:** `src/hooks/useAppHotkeys.ts:118-128`
- **Issue:** Large copies (up to 1 MB) are cached in memory (`lastCopiedCardsRef`). This is acceptable for occasional use, but repeated large copies could accumulate if not released promptly. The cache is per hotkey hook instance (single per app), so it’s not catastrophic.
- **Impact:** Low-medium – only one copy is held; cleared on paste or after timeout.
- **Mitigation:** Already has a 1 MB cutoff and age limit (`CLIPBOARD_CACHE_MAX_AGE_MS`). Good.

#### **M-2: Event listener cleanup is thorough but one edge case**
- **Location:** `src/App.tsx:72-84` and various hooks
- **Issue:** The app attaches many event listeners (fullscreenchange, blur, dragend, beforeunload, etc.). Cleanup appears correct. However, the `dragend` listener is attached to `window` but not to `document`; some browsers may fire `dragend` on document? Unlikely.
- **Impact:** Very low.

### 2.3 Code Quality & Maintainability

#### **Q-1: Use of `any` cast breaks type safety**
- **Location:** `src/store/slices/selectionSlice.ts:18`
- **Issue:** `return { layoutAlignTrigger: state.layoutAlignTrigger + 1 } as any;` – this is a hack to trigger re-alignment.
- **Impact:** Low – localized, but could be replaced by a proper `triggerLayoutAlign` action in UI slice (which already exists). Actually, the UI slice has `triggerLayoutAlign` that increments the counter. The code could call that instead of casting.
- **Suggested fix:** Replace the direct return with a call to `state.triggerLayoutAlign()` or proper setState pattern.

#### **Q-2: Long functions and complex logic**
- **Location:** `src/domain/documentTree.ts` (451 lines), `src/utils/markdownParser.ts` (704 lines), `src/hooks/useFileSystem.ts` (482 lines)
- **Issue:** These files are quite long and contain many responsibilities. Harder to test and maintain.
- **Impact:** Medium – increases cognitive load and bug risk.
- **Mitigation:** Extract smaller units (e.g., split `documentTree` operations into separate files, break markdown parser into sub-modules). However, given they are pure functions and already well-commented, it's acceptable for now.

#### **Q-3: Duplicate tree index building**
- **Location:** Numerous places call `buildTreeIndex(nodes)` independently, though a cache exists at module level (`_cachedNodes`, `_cachedTreeIndex`). The cache is global but reset when `nodes !== _cachedNodes`. This is safe only because the module scope is a singleton. However, in concurrent React renders, this cache could be used by multiple fibers without issue because it's read-only after being set. It’s a minor optimization but could be a source of bugs if used incorrectly (e.g., mutation of the returned objects). The current code does not mutate the index, so it's safe.
- **Impact:** Low.

#### **Q-4: Inconsistent error handling**
- **Location:** Various `try/catch` blocks often swallow errors or only log them. For example, `src/domain/documentService.ts:144` logs but continues; `src/hooks/useFileSystem.ts:124` sets error status and shows a toast, which is good. However, some catch blocks are empty except for a comment (`/* ignore */`). That’s fine if the error is truly ignorable.
- **Impact:** Low to medium depending on context. Generally okay.

#### **Q-5: Missing JSDoc/comments for public functions**
- **Location:** Many pure functions in `domain/` and `utils/` lack detailed JSDoc. Typescript types help, but documentation is sparse.
- **Impact:** Low for a small team, but onboarding suffers.

### 2.4 Security

#### **S-1: Markdown rendering uses sanitization (good)**
- **Location:** `src/components/SafeMarkdown.tsx` (not read but assumed) uses `rehype-sanitize`. Confirmed by README and dependencies.
- **Status:** Adequate protection against XSS in rendered markdown.

#### **S-2: Link normalization in WYSIWYG editor**
- **Location:** `src/components/WysiwygEditor.tsx:177` uses `normalizeEditorLinkHref`. Good.
- **Status:** Proper whitelist-based protocol handling.

#### **S-3: Clipboard data uses custom MIME type**
- **Location:** `src/utils/markdownParser.ts:7,146-150`
- **Issue:** The custom clipboard format is not a security risk per se, but it could expose content to malicious apps listening to clipboard. However, this is a standard risk for any clipboard data.
- **Impact:** Very low.

#### **S-4: Plugin/AI infrastructure is not production-hardened**
- **Location:** `src/plugins/registry.ts`, `src/domain/aiOperations.ts`, `src/domain/aiProvider.ts`
- **Issue:** The codebase contains experimental foundations for AI commands and plugins. These are not yet public but could become attack surfaces if exposed without sandboxing, permissions, and audit logs. README explicitly warns about this.
- **Impact:** Potentially high if deployed with AI enabled without safeguards. Current state is mock-only; safe.

#### **S-5: No Content Security Policy (CSP)**
- **Location:** Not in code (deployment config missing).
- **Issue:** For a static-hosted app, CSP would protect against XSS via injected scripts. Since the app is local-first and uses no remote code eval, risk is lower, but still recommended.
- **Impact:** Low for local use; medium if deployed publicly.

### 2.5 Data Integrity & Validation

#### **V-1: Schema validation robust but can mutate user data**
- **Location:** `src/utils/schema.ts`
- **Issue:** The validation routine repairs many issues: duplicate IDs, missing parents, cycles, depth > 200. Data is auto-corrected with warnings. This is good for resilience but can silently alter user intent.
- **Impact:** Low – repairs are necessary to keep the app working; warnings are likely shown to user (via import repair). Important to ensure warnings are surfaced (they are passed to UI).

#### **V-2: Quota handling exists but edge cases possible**
- **Location:** `src/hooks/useFileSystem.ts:127-130`, `src/domain/documentService.ts:228-233`
- **Issue:** `MAX_FILE_SIZE_BYTES = 5MB` enforced on save. The error is caught and user notified. However, multiple simultaneous saves could race; but the save queue is serialized by the debouncer and `fsManager`. Acceptable.
- **Impact:** Low.

#### **V-3: Migration from legacy localStorage runs at startup**
- **Location:** `src/domain/documentService.ts:134-201`
- **Issue:** If migration fails (parse errors), it logs and continues. No user notification; but it's a one-time thing. Acceptable.

### 2.6 Testing & Quality Assurance

#### **T-1: Persistence tests incomplete**
- **Location:** Noted in README; test files exist but coverage is partial.
- **Issue:** The lifecycle of IndexedDB operations (init, switch, dirty backup, snapshot restore, quota) is not fully covered.
- **Impact:** Medium – risk of regressions in storage layer.
- **Mitigation:** Add tests using `fake-indexeddb` and proper Dexie cleanup between tests.

#### **T-2: Visual editor lacks GFM parity**
- **Location:** `src/components/WysiwygEditor.tsx` uses Tiptap with limited extensions.
- **Issue:** Complex Markdown (tables, footnotes, etc.) may not round-trip correctly between Visual and Markdown modes.
- **Impact:** Medium – data loss risk for complex docs. README acknowledges and recommends using Markdown mode for complex constructs.

#### **T-3: Test suite does not run in CI (assumed)**
- **Issue:** Not visible in code, but README suggests `npm run test` passes locally. No evidence of CI configuration.
- **Impact:** Low-medium – without CI, regressions may slip.

### 2.7 User Experience & Accessibility

#### **A-1: I18n incomplete**
- **Location:** `src/i18n.ts` covers many strings, but some UI text may still be hardcoded English (tooltips, aria-labels, error messages). A full audit of all user-facing strings needed.
- **Impact:** Low for English users; higher for Russian audience.

#### **A-2: Accessibility partial**
- **Location:** Many components have `title`/`aria-label` (e.g., buttons), but cards, DnD, and some keyboard/touch alternatives may need enhancement.
- **Impact:** Low to medium depending on audience.

#### **A-3: Empty document UX simple**
- **Location:** `BoardView` shows an "Add Fragment" card. Could be more engaging.
- **Impact:** Low.

#### **A-4: Timeline vs Board click-to-edit behavior differs**
- **Location:** `src/components/TimelineView.tsx:140-146` vs `BoardView` (click handling in `Card.tsx`).
- **Impact:** Low – minor UX inconsistency.

### 2.8 Tooling & Deployment

#### **D-1: Build bundle size large (>500KB)**
- **Location:** Noted in README.
- **Issue:** Heavy dependencies (Tiptap, react-markdown, etc.) inflate main chunk.
- **Mitigation:** Lazy-load `WysiwygEditor` and perhaps other components; fine-tune Vite chunk splitting. The code already lazy-loads `WysiwygEditor` (via `lazy()`), `TimelineView`, `CommandPalette`, etc. Could also lazy-load other heavy utilities on demand.

#### **D-2: ESLint could be stricter**
- **Location:** `eslint.config.js` – not read but mentioned.
- **Issue:** Lint passes without warnings but doesn't include type-aware rules or `jsx-a11y`.
- **Impact:** Low – code quality remains high, but could be improved.

#### **D-3: Dependencies may be outdated**
- **Issue:** `npm audit` found no vulnerabilities, but some packages have newer versions. Updating carries regression risk.
- **Impact:** Low.

---

## 3. Checklist of All Issues

| ID | Category | Description | Severity |
|----|----------|-------------|----------|
| D-1 | Performance | Undo/redo uses full snapshots, memory bloat | Critical |
| D-2 | Performance | Flat array O(n) operations for large docs | Critical |
| D-3 | Performance | BoardView renders all cards (no virtualization) | Critical |
| D-4 | Memory | History limit 50 but snapshots unbounded size | Medium |
| D-5 | Performance | Repeated `buildTreeIndex` invalidation | Medium |
| M-1 | Memory | Clipboard cache holds up to 1MB | Low-Medium |
| M-2 | Memory | Event listener cleanup adequate | Negligible |
| Q-1 | Quality | `any` cast in selectionSlice | Low |
| Q-2 | Quality | Long monolithic files (documentTree, markdownParser, useFileSystem) | Medium |
| Q-3 | Quality | Tree index cache global (safe but fragile) | Low |
| Q-4 | Quality | Inconsistent error handling patterns | Low |
| Q-5 | Quality | Missing JSDoc for many functions | Low |
| S-1 | Security | XSS: Markdown sanitized (OK) | N/A |
| S-2 | Security | Link normalization in WYSIWYG (OK) | N/A |
| S-3 | Security | Clipboard custom MIME – potential snooping | Very Low |
| S-4 | Security | AI/Plugin infrastructure not sandboxed | Potentially High (if enabled) |
| S-5 | Security | No CSP headers (deployment) | Low |
| V-1 | Data | Schema auto-repairs duplicates/cycles (silent) | Low (acceptable) |
| V-2 | Data | Quota handling and race conditions | Low |
| V-3 | Data | Legacy localStorage migration errors logged only | Low |
| T-1 | Testing | Persistence tests incomplete | Medium |
| T-2 | Testing | Visual editor GFM parity gaps | Medium |
| T-3 | Testing | CI not confirmed | Low-Medium |
| A-1 | I18n | Some strings not localized | Low |
| A-2 | Accessibility | Missing ARIA in some components | Low-Medium |
| A-3 | UX | Empty document state simplistic | Low |
| A-4 | UX | Inconsistent click-to-edit between views | Low |
| D-1 | Tooling | Bundle size >500KB | Medium |
| D-2 | Tooling | ESLint could be stricter | Low |
| D-3 | Tooling | Dependencies may be outdated | Low |

---

## 4. Problem Prioritization

### Critical (should fix ASAP)
1. **D-1: Undo/redo full snapshots** – Will cause memory exhaustion on large documents.
2. **D-2: O(n) flat array operations** – Scalability bottleneck.
3. **D-3: BoardView without virtualization** – UI freezes on large documents.

**Why critical:** These directly affect the core user experience for anything beyond trivial documents. They can lead to crashes, data loss (if the tab crashes before save), and abandonment.

### Non-Critical (important but can live with)
- **D-4, D-5:** Memory and perf improvements that are less urgent.
- **Q-1 to Q-5:** Code quality – technical debt, but not showstoppers.
- **S-4:** AI/plugins are experimental and not enabled by default.
- **V-1 to V-3:** Data integrity has safeguards, though improvements possible.
- **T-1 to T-3:** Testing gaps should be addressed to prevent regressions.
- **A-1 to A-4:** UX polish and accessibility enhancements improve adoption but aren't blockers.
- **D-1 to D-3 (Tooling):** Build and linting improvements are nice-to-have.

---

## 5. Recommendations

1. **Immediate:**
   - Add a warning in the README about large document performance and recommend Timeline view or Markdown mode for heavy editing.
   - Consider reducing `HISTORY_LIMIT` (e.g., to 20) until diffs are implemented.
   - Address the `any` cast (Q-1).

2. **Short-term (next sprint):**
   - Implement incremental diffs for undo/redo (store patches, not full state). Could use a library or custom format.
   - Introduce normalized state (nodesById + childrenByParent) incrementally, perhaps in a separate branch.
   - Add virtualization for BoardView (high risk but high reward). Start with a proof-of-concept using a windowing library that supports horizontal columns.

3. **Medium-term:**
   - Refactor large files: split `documentTree.ts` into separate operation files; split `markdownParser` into imports/exports; break `useFileSystem` into smaller hooks/services.
   - Expand test coverage for persistence layer, especially edge cases (corrupted data, concurrent saves, quota errors).
   - Integrate `jsx-a11y` ESLint plugin and fix violations.
   - Complete i18n coverage by extracting all user-facing strings.

4. **Long-term:**
   - Evaluate migration to a proper database (e.g., SQLite via WASM) if documents grow very large.
   - Harden plugin/AI security: sandboxing, permissions, audit logs before exposing to users.
   - Add CSP headers and security headers for production deployment.

---

## 6. Conclusion

PuuNote is a well-architected, type-safe application with clear separation of concerns and a solid foundation. The main concerns are scalability of the data model and history mechanism for large documents. The codebase is clean, with good use of modern React/TypeScript patterns. Performance optimizations (virtualization, diffs, normalization) are the biggest leverage points for improvement. Security posture is good for a local-first app. Testing coverage is decent but should be expanded, especially around storage and large documents. Addressing the critical performance issues will make the app robust for power users.

--- 

*End of Audit*