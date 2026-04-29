# PuuNote Multi-Audit Synthesis

- Date/time: 2026-04-29 14:56
- Synthesizer model: gpt-5-codex
- Source audits analyzed:
  - `AUDIT/Audit_2026-04-29-14-15_gpt-5-codex.md`
  - `AUDIT/Audit_2026-04-29-1419_puunote_v2.md`
  - `AUDIT/Audit_2026-04-29-19-50_big-pickle.md`
  - `AUDIT/Audit_2026-04-29_14-17_hy3-preview-free.md`
  - `AUDIT/Audit_2026-04-29_14-19_minimax-m2.5-free.md`
  - `AUDIT/Audit_2026-04-29_14-22_moonshotai-kimi-k2.5.md`
  - `AUDIT/PuuNote_AI_Stage_Audit.md`
  - `AUDIT/PuuNote_Unified_Audit.md`
- Current repo state during synthesis: `main` synced with `origin/main`

## Executive Summary

Across the audits there is strong consensus on the project direction: PuuNote has moved from a compact local-first card editor toward a larger architecture prepared for AI/plugins. The useful additions are real: a domain tree API, first tests, LLM context extraction, job runner, plugin registry, snapshots, Fuse search, Timeline virtualization, and chunk splitting.

The consensus risk is also clear: the latest stage added infrastructure faster than it integrated or stabilized it. Multiple models independently flagged the same pattern: half-features, hidden APIs, missing UI, unbounded storage growth, incomplete multi-selection, weak typing around metadata, large store boundaries, and performance issues around tree traversal/search/virtualization.

The most important difference between the audits is reliability. Some reports contain stale or incorrect claims. This synthesis treats a finding as high confidence only when it is either verified against current code or repeated by multiple independent audits without contradiction.

## Source Audit Reliability Notes

### High-confidence source patterns

The following findings appear in several audits and match current code:

- Plugin registry exists but is not meaningfully integrated.
- Job runner exists but has no visible user-facing job UI / cancellation UX.
- Snapshots exist but have no full UX, no retention policy, and restore consistency risks.
- Multi-selection / Shift-selection is incomplete.
- Metadata uses `any` and lacks a schema.
- Store remains large and still mixes UI, domain wrappers, browser export, history and dialog concerns.
- Context extraction needs budget/caching/privacy controls.
- Command palette search recreates a full search dataset/index too often.
- Tests were added, but coverage is still narrow.
- Timeline virtualization has integration risks with the app scroll container.

### False positives / outdated claims

These claims appear in some audits but do not match current code:

- `sonner` missing from `package.json`: false. `sonner` is in dependencies.
- `fuse.js` unused: false. `CommandPalette` imports and uses Fuse.
- `react-virtuoso` unused: false. `TimelineView` imports and uses `Virtuoso`.
- `usePreferences` unused: false. `App.tsx` calls `usePreferencesInit()`.
- `mergeNodes` unused: mostly false. `Card.tsx` exposes merge selected when `selectedIds.length > 1`.
- "No transaction" for create/delete: partly stale. `createNewFile` and `deleteFile` now use Dexie transactions, but error-state handling after a failed create is still problematic.
- "Split node does not work": not confirmed. Code path exists in `Card.tsx` and `documentApi.splitNode`; tests cover split at domain level. UI may still have UX edge cases, but the blanket claim is too strong.

### Overstated claims

- `README` says Markdown is "Zero XSS risks". This is overstated. Sanitization reduces risk but does not make it mathematically zero, and remote image loads remain a privacy surface.
- `PuuNote_AI_Stage_Audit.md` says the AI-prep stage is "ready to integrate external LLM scripts". This is optimistic. The primitives exist, but the contracts, UI, cancellation, privacy and provider boundaries are not ready enough for a safe integration.

## Project State From Multi-Audit View

PuuNote is currently a local-first React/TypeScript browser app for nonlinear notes. Documents are stored as arrays of tree nodes. The board view renders tree depth as horizontal columns. TimelineView renders the same document as a depth-first linear view.

Current major layers:

- UI: `App`, `Card`, `TimelineView`, `CommandPalette`, `Header`, `Footer`, modals.
- State: `useAppStore`, `useJobStore`.
- Domain: `documentTree`, `contextExtraction`, `jobRunner`.
- Persistence: Dexie `db`, filesystem hook, snapshots.
- Markdown: `markdownParser`, `SafeMarkdown`.
- Extensibility: `PluginRegistry`.
- Layout/performance: `useBoardLayout`, `react-virtuoso` in Timeline only.

The architecture is in a transition state: the old all-in-one store model is being decomposed, but the new service boundaries are not fully established.

## Consensus Positives

1. Domain extraction is a real improvement.
   - `documentTree.ts` makes core tree operations easier to test and reuse.

2. Tests now exist.
   - `documentTree.test.ts` and `tree.test.ts` are a meaningful start.

3. Timeline virtualization is directionally right.
   - It reduces DOM pressure in the linear view.

4. Snapshots are the right concept for AI safety.
   - Macro-undo is important before destructive AI operations.

5. Job runner and job store are useful foundations.
   - Long-running AI/network operations need progress, status and cancellation.

6. Plugin registry points toward a reasonable extension architecture.
   - The idea is good, but integration is missing.

7. Manual chunks improved build output.
   - Main bundle is smaller than before, though still above warning threshold.

8. Toast/error UX improved.
   - Some storage errors now surface through `sonner`.

## Highest-Priority Confirmed Problems

### P0/P1. Quality gates are red

Confirmed current status from the latest verification:

- `npm run lint` fails.
- `npm run format:check` fails.

Specific lint error:

- `src/utils/id.ts` has an empty `catch(e) {}`.

Why this matters:

- It blocks CI/release hygiene.
- It indicates the feature wave was not stabilized.
- Prettier failures make all later refactoring noisier.

Fix:

- Replace `catch(e) {}` with `catch { /* fallback below */ }`.
- Run `npm run format`.
- Keep `AUDIT/` ignored by formatting as intended.

### P1. Tracked garbage file

Confirmed:

- `untitled.tsx` is tracked and empty.

Fix:

- Delete it.

### P1. README and code API are out of sync

README describes:

- `documentApi.addNode`
- `documentApi.updateNode`
- `documentApi.moveNode(nodes, nodeId, newParentId, insertAfterId?)`

Actual code exposes:

- `addChild`
- `addSibling`
- `updateContent`
- `moveNode(nodes, sourceId, targetId, position)`

Impact:

- Developers and future agents will integrate against non-existent contracts.
- The AI/plugin platform appears more finished than it is.

Fix:

- Either update README to match current API or implement the documented API as stable wrappers.
- Add tests for the public API names.

### P1. Plugin registry is infrastructure without application

Consensus across audits:

- `PluginRegistry` exists.
- No actual plugins are registered.
- Hooks are not called from document mutation paths.
- There is no plugin UI, lifecycle, permission model or persistence.

Fix:

- Decide whether plugins are public API now or experimental.
- Add a first internal plugin/action to prove the lifecycle.
- Call hooks from one mutation service, not scattered UI handlers.
- Wrap plugin code in error boundaries/try-catch.

### P1. Job runner is not user-facing enough

Consensus:

- Jobs can be added and updated in store.
- There is no visible job panel/status/cancel UI.
- Cancellation is cooperative only and uses `checkCancelled`.
- Cancelled jobs become `"failed"` instead of a separate cancelled state.

Fix:

- Add `JobPanel` / footer job indicator.
- Use `AbortController` in job API.
- Add `cancelled` status.
- Cap job history.
- Persist job history only if product needs it.

### P1. Snapshots are unbounded and UI-incomplete

Consensus:

- Snapshots store full `nodes`.
- No retention policy.
- No clear UI for browsing/restoring.
- Restore can overwrite active document state unless document identity is checked.

Impact:

- IndexedDB can grow rapidly.
- AI workflows may create large backups.
- Snapshot restore can become a data-loss footgun.

Fix:

- Keep max N snapshots per document.
- Add snapshot list/restore UI.
- Check `snapshot.documentId === activeFileId` or switch document intentionally.
- Snapshot before restore/destructive AI actions.

### P1. Multi-selection is incomplete

Consensus:

- `toggleSelection(id, isShift)` receives Shift info.
- Shift range behavior is not implemented.
- UI suggests multi-selection/merge capability.
- Merge behavior edge cases are underdefined.

Fix:

- Define selection semantics: additive toggle, range selection, sibling-only vs depth-first range.
- Sort selected IDs by visual/depth-first order before merge.
- Add `canMergeNodes` with reason codes.
- Test ancestor/descendant, different parent, missing ID and ordering cases.

### P1. Metadata typing is too loose

Consensus:

- `metadata?: Record<string, any>` creates warnings and weak contracts.
- AI/plugin metadata will become a dumping ground.

Fix:

Use explicit metadata:

```ts
interface PuuNodeMetadata {
  isGenerating?: boolean;
  ai?: {
    provider?: string;
    jobId?: string;
    generatedAt?: string;
  };
  plugin?: Record<string, unknown>;
}
```

And change arbitrary values from `any` to `unknown`.

### P1. Persistence normalization remains inconsistent

Confirmed:

- Initial active document load validates nodes.
- `switchFile` still reads saved nodes and manually dedupes without full `validateNodes`.

Fix:

- Create `normalizeNodes(raw: unknown): PuuNode[]`.
- Use it in initial load, switch file, import, dirty save restore and snapshot restore.

### P1. Failed create can still update UI state

Confirmed:

- `createNewFile` catches DB transaction failure and shows toast.
- After catch, it still updates Zustand state to the new document.

Fix:

- Return after failed transaction.
- Or create explicit unsaved/pending state with retry.

## Performance Findings

### Board view is not virtualized

Consensus:

- Timeline has virtualization.
- Main board view still renders all nodes in all columns.

This is a bigger issue than Timeline virtualization because the board is the primary UI.

Fix options:

- Column virtualization.
- Active-corridor rendering.
- Practical import limits until board virtualization is ready.

### Timeline virtualization is wired incorrectly

Confirmed current issue:

- `TimelineView` uses `useWindowScroll`.
- The app scrolls inside `#main-scroller`, not window.
- Outline navigation uses `document.getElementById` for virtualized items that may not exist in DOM.
- `useActivePathScroll` still searches for `card-*` even in Timeline, while Timeline nodes are `tl-node-*`.

Fix:

- Replace `useWindowScroll` with `customScrollParent` or a Virtuoso-owned container.
- Use `VirtuosoHandle.scrollToIndex`.
- Add `computeItemKey={(_, node) => node.id}`.
- Separate board active-scroll from timeline active-scroll.

### Tree index and traversal work is repeated

Consensus:

- `buildTreeIndex`, `getDepthFirstNodes`, context extraction and layout computations are repeated often.
- `contextExtraction` calls depth-first traversal more than needed.
- Search and outline rebuild whole document structures.

Fix:

- Build a document-level memoized tree index.
- Pass indexes into domain functions when running batches.
- Cache outline/search indexes per document version.

### Command palette search is still too expensive

Consensus:

- Fuse is useful, but current implementation rebuilds docs/Fuse on query.
- All files are read from IndexedDB per search debounce.

Fix:

- Load/index on palette open.
- Memoize Fuse instance.
- Add query sequence guard to prevent stale async results.
- Consider IndexedDB search index later.

### Undo/history stores full snapshots

Not a blocker now, but multiple audits flagged that full-array undo can become heavy.

Fix if performance degrades:

- Patch/diff-based history.
- Group typing changes.
- Cap memory by size as well as count.

## Security / Privacy Findings

### Markdown security is better than README claims

`SafeMarkdown` uses sanitization and protocol restrictions. Good.

But README's "Zero XSS risks" is overstated.

Fix:

- Say "XSS risk is reduced by sanitization and protocol restrictions".

### Remote resource privacy remains

Markdown images over `http`/`https` can trigger external requests.

Fix:

- Keep README privacy caveat.
- Consider image proxy/block toggle if privacy is core.

### Plugins are a future security boundary

If plugins become dynamic/external, they can become code injection/XSS surfaces.

Fix:

- Do not support arbitrary remote code without sandboxing.
- Use capability-based plugin contracts.
- Validate plugin definitions.
- Prefer internal/static plugins first.

### LLM context needs privacy controls

Consensus:

- `buildContextForLLM` can include large descendant context.
- No token/char budget.
- No preview/redaction.

Fix:

- `maxChars`, `maxTokens`, `includeAncestors`, `includeDescendants`, `includeSiblings`.
- Return warnings when truncated.
- User preview before sending data to an external provider.

## Architecture Findings

### Store boundaries are still blurred

Consensus:

- `useAppStore` is smaller conceptually but still central.
- It includes UI flags, history, selection, mutation wrappers, export/download and confirm dialog.

Fix:

- Split into `documentSlice`, `selectionSlice`, `historySlice`, `uiSlice`.
- Move export/download to browser service.
- Use a `DocumentService` for mutation orchestration.

### `documentApi` is useful but not a complete service

Current domain API:

- Pure-ish mutation functions.
- Still generates IDs internally, which some audits correctly call "not pure" from a deterministic testing perspective.

Fix:

- Either accept ID generation in API and test by behavior, or inject `createId`.
- Add public service wrapper that handles validation, snapshots, history grouping and plugin hooks.

### AI stage needs contracts before features

Consensus:

- Infrastructure exists.
- Real AI feature API is not ready.

Needed contracts:

- `AiProvider`
- `AiOperation`
- `AiContextOptions`
- `GeneratedNodeDraft`
- `AiRunResult`
- cancellation via `AbortSignal`
- snapshot policy
- preview/accept/reject flow

## Model Disagreements And Resolution

### Is Plugin Registry good or bad?

Resolution:

- Good direction, incomplete implementation.
- Treat as experimental until hooks, lifecycle and at least one plugin exist.

### Are snapshots good or dangerous?

Resolution:

- Good concept, dangerous without limits/UI/restore checks.

### Is Timeline virtualization a solved performance issue?

Resolution:

- No. It solves only part of Timeline DOM cost and is currently miswired to scroll. Board virtualization is still missing.

### Is the AI stage ready?

Resolution:

- Ready as a sketch, not ready as a stable extension platform.

### Are new dependencies unused?

Resolution:

- `fuse.js`, `react-virtuoso`, `sonner` are used/present.
- Some audit claims here are stale or incorrect.

## Deduplicated Priority Plan

### Phase 0: Stabilize repo health

1. Fix `src/utils/id.ts` lint error.
2. Run Prettier.
3. Delete `untitled.tsx`.
4. Correct README API mismatch and security wording.
5. Verify `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`.

### Phase 1: Protect data integrity

1. Add shared `normalizeNodes`.
2. Use it in all storage/import/restore paths.
3. Stop UI state update after failed `createNewFile`.
4. Check snapshot document ID on restore.
5. Add snapshot retention limit.
6. Define empty-document invariant.

### Phase 2: Finish or hide half-features

1. Complete multi-selection semantics or remove Shift behavior.
2. Add `canMergeNodes` and merge tests.
3. Add snapshot UI or stop advertising snapshots as user feature.
4. Add job status/cancel UI or keep JobRunner internal.
5. Add first internal plugin or mark registry experimental.

### Phase 3: Performance

1. Fix Timeline Virtuoso scroll container.
2. Replace outline DOM lookup with `scrollToIndex`.
3. Add `computeItemKey`.
4. Add board virtualization or active-corridor rendering.
5. Cache tree indexes/depth-first lists.
6. Memoize Fuse/search data.

### Phase 4: AI/API foundation

1. Type metadata.
2. Add AI provider abstraction.
3. Add context budget/privacy preview.
4. Use snapshots before destructive AI operations.
5. Add mock AI operation end-to-end: expand selected card into draft children.

### Phase 5: Test coverage

1. Markdown import/export roundtrip tests.
2. Validation/normalization tests.
3. Store action tests.
4. Snapshot tests.
5. Context extraction tests.
6. Selection/merge edge tests.
7. Search race/cancellation tests.
8. Basic Playwright smoke test.

## Consolidated Checklist

### Must Fix

- [x] Fix lint error in `src/utils/id.ts`.
- [x] Run Prettier and make `format:check` green.
- [x] Delete empty tracked `untitled.tsx`.
- [x] Fix README documented API mismatch.
- [x] Replace "Zero XSS risks" wording.
- [x] Validate/normalize nodes in `switchFile`.
- [x] Stop state update after failed `createNewFile`.
- [x] Add snapshot restore document check.
- [x] Add snapshot retention limit.
- [x] Type metadata without `any`.

Completed on 2026-04-29 by `gpt-5-codex`. Verification after fixes: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, and `npm audit` all pass. The former Vite chunk-size warning was later resolved by manual vendor/domain chunk splitting.

### Should Fix

- [x] Complete Shift/range selection.
- [x] Define and test merge semantics.
- [x] Add job UI and cancellation UI.
- [x] Add snapshot UI.
- [x] Integrate plugin hooks or mark registry experimental.
- [x] Fix Timeline Virtuoso scroll container.
- [x] Use `VirtuosoHandle.scrollToIndex` for outline.
- [x] Add `computeItemKey` to Virtuoso.
- [x] Separate timeline scroll logic from board scroll logic.
- [x] Memoize Fuse/search index.
- [x] Cache tree indexes/depth-first traversals.

Completed on 2026-04-29 by `gpt-5-codex`. Verification after fixes: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, and `npm audit` all pass. The former Vite chunk-size warning was later resolved by manual vendor/domain chunk splitting.

### Plan Soon

- [x] Board virtualization or active-corridor rendering.
- [x] LLM context budget and privacy controls.
- [x] AI provider abstraction.
- [x] Document service layer.
- [x] Store slices.
- [x] JSON/lossless export.
- [x] More unit/integration/e2e tests.

Completed on 2026-04-29 by `gpt-5-codex`.

Implementation notes:

- Added automatic active-corridor board rendering for large documents while keeping full-column rendering for smaller documents.
- Added explicit LLM context options: character budget, ancestor/descendant inclusion and node-id privacy.
- Added an internal AI provider contract plus a local mock provider and a first end-to-end AI command that snapshots the document, runs through the job runner and appends draft child cards.
- Added `DocumentService` to centralize document persistence, legacy migration, dirty-save restore, search indexing and node normalization.
- Split the Zustand app store into UI, selection, history and document slices without changing the public `useAppStore` API.
- Added lossless `.puunote.json` export/import alongside Markdown import/export.
- Added focused tests for context extraction, board column rendering and JSON export/import.

Verification after Plan Soon fixes: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm run test`, `npm run build`, and `npm audit` all pass. The production build remains split into sub-500 kB chunks.

## Final Multi-Audit Verdict

The project is moving in the right direction, but the last stage should be treated as an unfinished infrastructure spike. The useful pieces are there, yet several are not production-integrated. The next best move is not another feature wave. It is a stabilization pass that makes the new architecture real: green checks, truthful docs, bounded snapshots, real scroll virtualization, validated persistence, typed metadata, and one complete vertical slice for jobs/plugins/AI.

Once that is done, PuuNote will be in a much better position to add actual AI features without turning the app into a pile of half-connected primitives.
