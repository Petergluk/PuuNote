# PuuNote - Consolidated Multi-Audit Report

**Date:** 2026-04-30 02:30  
**Synthesizer:** moonshotai/kimi-k2.5  
**Source Audits Analyzed:** 8 reports from multiple AI models  
**Lines of Code:** ~7,062 (+45% since first audit)  
**Current Version:** 0.6+ (AI-ready architecture)

---

## Executive Summary

### Overall Progress Rating: 8.5/10 ⭐

**Major Achievements Since First Audit:**
- ✅ Store sliced into modular architecture (UiSlice, DocumentSlice, HistorySlice, SelectionSlice)
- ✅ Domain layer extracted with pure functions and tests
- ✅ Plugin system with emit hooks (onNodeCreated, onNodeUpdated, onNodeDeleted)
- ✅ AI infrastructure ready (AiProvider, JobRunner, Context Extraction)
- ✅ New UI components: FloatingCardActions, JobPanel, SnapshotPanel, SettingsPanel
- ✅ Virtual scrolling in TimelineView (react-virtuoso)
- ✅ Multi-selection and merge functionality
- ✅ Export to JSON with metadata
- ✅ 5+ test files covering critical paths

**Consensus Risk:** Infrastructure added faster than integration/stabilization. Multiple half-features need completion.

---

## Consolidated Issues by Severity

### 🔴 Critical Issues (Fix Immediately)

| ID | Issue | Source | File | Fix Priority |
|----|-------|--------|------|--------------|
| C1 | Memory leak in FloatingCardActions (createPortal) | moonshotai-k2.5 | FloatingCardActions.tsx:186 | **Immediate** |
| C2 | Event listener leak on rapid activeId change | moonshotai-k2.5 | FloatingCardActions.tsx:129-155 | **Immediate** |
| C3 | Range selection (Shift+click) not implemented | gpt-5-codex | selectionSlice.ts:18-20 | **Immediate** |
| C4 | Plugin registry exists but no plugins registered | big-pickle, hy3, gpt-5-codex | registry.ts | **Immediate** |
| C5 | Empty catch block in id.ts causes lint failure | gpt-5-codex | utils/id.ts | **Immediate** |
| C6 | Snapshot storage unbounded (no retention limit) | hy3, minimax-m2.5 | db/snapshots.ts | **High** |
| C7 | Failed createNewFile still updates UI state | gpt-5-codex | useFileSystem.ts | **High** |
| C8 | Real AI provider missing (only mock) | big-pickle, puunote_v3 | aiProvider.ts | **High** |
| C9 | Metadata typed as Record<string, any> | big-pickle, hy3, minimax-m2.5 | types.ts:6 | **High** |
| C10 | SettingsPanel mixed Russian/English | multiple | SettingsPanel.tsx | **High** |

### 🟠 High Priority Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| H1 | Race condition in SnapshotPanel (fileId capture) | moonshotai-k2.5 | SnapshotPanel.tsx:23-34 |
| H2 | Zustand selector optimization needed (useShallow) | moonshotai-k2.5 | Card.tsx:18-39 |
| H3 | Impure normalizeSiblingOrder mutates input | moonshotai-k2.5 | documentTree.ts:15-22 |
| H4 | Unsafe DOM access without SSR check | moonshotai-k2.5 | FloatingCardActions.tsx:80-109 |
| H5 | Tree index rebuilt O(n) on every shift+click | minimax-m2.7 | selectionSlice.ts:18-20 |
| H6 | Merge validation recalculates on every keystroke | minimax-m2.7 | FloatingCardActions.tsx:52-57 |
| H7 | Job runner not user-facing enough | gpt-5-codex | jobRunner.ts, JobPanel.tsx |
| H8 | No storage limit for snapshots | minimax-m2.5 | db/snapshots.ts |
| H9 | Search index rebuilds on every CommandPalette open | gpt-oss-120b | CommandPalette.tsx:71-81 |
| H10 | No undo for AI operations | puunote_v3, minimax-m2.5 | aiOperations.ts |

### 🟡 Medium Priority Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| M1 | i18n incomplete in SettingsPanel | moonshotai-k2.5, hy3 | SettingsPanel.tsx |
| M2 | Magic numbers throughout codebase | moonshotai-k2.5 | Multiple files |
| M3 | Missing loading state for snapshot restore | moonshotai-k2.5 | SnapshotPanel.tsx |
| M4 | Accessibility missing for SettingsPanel tabs | moonshotai-k2.5 | SettingsPanel.tsx:88-101 |
| M5 | Export dropdown lacks keyboard navigation | moonshotai-k2.5 | Header.tsx:204-240 |
| M6 | FullScreenModal cycle check O(n×depth) | minimax-m2.7 | FullScreenModal.tsx:50-61 |
| M7 | CommandPalette duplicate debounce logic | minimax-m2.5 | CommandPalette.tsx:84-99 |
| M8 | AutoSizeTextarea unused import (toggleCheckboxContent) | minimax-m2.7 | AutoSizeTextarea.tsx |
| M9 | FloatingCardActions missing keyboard triggers | minimax-m2.5 | FloatingCardActions.tsx |
| M10 | Merge confirmation missing | minimax-m2.5 | FloatingCardActions.tsx:287-293 |
| M11 | No visual feedback for multi-select count | minimax-m2.5 | Footer.tsx |

### 🟢 Low Priority Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| L1 | Redundant Tailwind classes (gap-0 px-0 py-0) | moonshotai-k2.5 | App.tsx:163 |
| L2 | Test file organization | moonshotai-k2.5 | Domain tests |
| L3 | Job cancellation UI missing | moonshotai-k2.5 | JobPanel.tsx |
| L4 | Unused BOARD_ACTIVE_CORRIDOR_NODE_THRESHOLD | big-pickle | constants.ts:13 |
| L5 | documentService.ts exists but unused | big-pickle | documentService.ts |
| L6 | i18n.ts redundant translations | hy3 | i18n.ts |
| L7 | Icon sizes inconsistent | minimax-m2.5 | Multiple components |
| L8 | ErrorBoundary no "Try Again" button | hy3 | ErrorBoundary.tsx |

### 🎨 UI/UX Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| UX1 | FloatingCardActions only hover - no touch support | moonshotai-k2.5 | FloatingCardActions.tsx |
| UX2 | Settings language mix Russian/English | moonshotai-k2.5, big-pickle | SettingsPanel.tsx |
| UX3 | "Hide" mode hides columns completely - confusing | moonshotai-k2.5 | App.tsx:102-108 |
| UX4 | Active vs Selected visual distinction unclear | moonshotai-k2.5 | Card.tsx:59-65 |
| UX5 | Snapshot names not editable (always "Manual snapshot") | moonshotai-k2.5 | SnapshotPanel.tsx |
| UX6 | Job cancel without confirmation | moonshotai-k2.5 | JobPanel.tsx:70-75 |
| UX7 | Timeline scroll alignment issues | gpt-5-codex | TimelineView.tsx |
| UX8 | Settings hotkey missing (Ctrl+,) | minimax-m2.5 | Header.tsx |
| UX9 | Theme toggle hidden in Palette only | minimax-m2.5 | Header.tsx:49 |
| UX10 | Delete confirmation text too verbose | minimax-m2.5 | FloatingCardActions.tsx:266 |
| UX11 | No onboarding for new users | puunote_v3 | App.tsx |

### 🛡️ Security Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| S1 | Plugin code injection risk if dynamic loading | moonshotai-k2.5 | registry.ts:35-40 |
| S2 | XSS risk from SVG images in markdown | hy3 | SafeMarkdown.tsx |
| S3 | API keys on client need backend proxy | puunote_v3 | aiProvider.ts |
| S4 | No rate limiting for AI calls | puunote_v3 | aiProvider.ts |
| S5 | Metadata not sanitized | puunote_v3 | types.ts |
| S6 | Remote image loads (privacy) | gpt-5-codex | markdownParser.ts |

### ⚡ Performance Issues

| ID | Issue | Source | File |
|----|-------|--------|------|
| P1 | Board view not virtualized (Timeline is) | gpt-5-codex | App.tsx:182-218 |
| P2 | Timeline Virtuoso miswired to window scroll | gpt-5-codex | TimelineView.tsx |
| P3 | Tree index and traversal repeated | gpt-5-codex | tree.ts, contextExtraction.ts |
| P4 | Command palette search rebuilds Fuse index | gpt-5-codex | CommandPalette.tsx |
| P5 | Undo stores full snapshots (not patches) | gpt-5-codex | historySlice.ts:39-41 |
| P6 | FloatingCardActions scroll/resize listeners | puunote_v3 | FloatingCardActions.tsx:166-180 |
| P7 | buildContextForLLM string concatenation | puunote_v3 | contextExtraction.ts:137-186 |

---

## Architecture Consensus

### ✅ Successfully Implemented

1. **Slice-based Store Architecture**
   - Clean separation: uiSlice, documentSlice, historySlice, selectionSlice
   - SRP maintained, easier to test
   - Verification: All green in tests

2. **Domain Layer**
   - Pure functions in documentTree.ts
   - No React dependencies
   - Test coverage for critical paths

3. **Plugin System Foundation**
   - Registry with hooks: emitNodeCreated, emitNodeUpdated, emitNodeDeleted
   - Error boundaries for each hook
   - Card actions API ready

4. **AI Infrastructure**
   - JobRunner with cancellation
   - Context extraction with budget
   - Mock provider implemented

5. **UI Components**
   - FloatingCardActions (intuitive hover UX)
   - SettingsPanel (well-organized)
   - SnapshotPanel (functional)
   - JobPanel (good feedback)

### ⚠️ Partially Implemented

1. **Virtualization**
   - Timeline: ✅ Virtuoso working
   - Board: ❌ Not virtualized (main view)

2. **i18n**
   - Basic system: ✅
   - Complete coverage: ❌ (SettingsPanel hardcoded Russian)

3. **Tests**
   - Domain tests: ✅
   - Component tests: ❌
   - E2E tests: ❌

4. **Plugin Ecosystem**
   - Registry: ✅
   - Actual plugins: ❌ (none registered)

### ❌ Missing / Incomplete

1. **Real AI Provider**
   - Only mock exists
   - No OpenAI/Anthropic/Ollama
   - No API key UI

2. **Board Virtualization**
   - No react-window/react-virtuoso for board
   - Performance degrades at 1000+ nodes

3. **Mobile Support**
   - No touch-optimized interactions
   - FloatingCardActions hover-only

---

## Fix Priority Roadmap

### Phase 0: Stabilize (This Week)

- [ ] Fix lint error in utils/id.ts (empty catch)
- [ ] Run Prettier, ensure format:check passes
- [ ] Delete empty untitled.tsx
- [ ] Fix README API documentation mismatch
- [ ] Add snapshot retention limit (max 25)
- [ ] Type metadata without `any`

### Phase 1: Critical Fixes (This Week)

- [ ] C1: Memory leak in FloatingCardActions (portal target)
- [ ] C2: Event listener leak on rapid activeId change
- [ ] C3: Implement range selection (Shift+click)
- [ ] C6: Add snapshot retention policy
- [ ] C7: Stop UI update after failed createNewFile
- [ ] C10: Complete i18n (remove Russian from SettingsPanel)

### Phase 2: High Priority (Next 2 Weeks)

- [ ] H1: Race condition in SnapshotPanel
- [ ] H2: Optimize Zustand selectors with useShallow
- [ ] H3: Fix impure normalizeSiblingOrder
- [ ] H5: Cache tree index for selection
- [ ] H8: Add storage limit for snapshots
- [ ] H10: Add AI undo with snapshot

### Phase 3: UX Polish (Next Month)

- [ ] UX1: Touch support for FloatingCardActions
- [ ] UX4: Better visual distinction active vs selected
- [ ] UX5: Editable snapshot names
- [ ] UX6: Job cancel confirmation
- [ ] UX11: Onboarding tour

### Phase 4: Performance (Next Month)

- [ ] P1: Board view virtualization
- [ ] P2: Fix Timeline Virtuoso scroll wiring
- [ ] P4: Memoize Fuse search index
- [ ] P5: Consider patch-based undo

### Phase 5: AI Integration (Next Quarter)

- [ ] C8: Add real AI provider (OpenAI/Anthropic)
- [ ] C4: Register first demo plugin
- [ ] S3: Backend proxy for API keys
- [ ] UX11: AI onboarding

---

## Verification Checklist

After fixes, verify:

```bash
npm run typecheck    # TypeScript strict checks
npm run lint         # ESLint passes
npm run format:check # Prettier passes
npm run test         # All tests pass
npm run build        # Production build succeeds
npm audit            # No security vulnerabilities
```

---

## Future Development Vision

### Phase 6: Advanced Features

1. **Real-time Collaboration**
   - Yjs / CRDT integration
   - WebRTC or WebSocket sync

2. **Plugin Marketplace**
   - Curated plugins
   - One-click install
   - Plugin SDK documentation

3. **Mobile App**
   - React Native or Capacitor
   - Touch-optimized gestures

4. **Extended Formats**
   - PDF export
   - OPML import/export
   - Notion integration

### Phase 7: Enterprise

1. **Cloud Sync**
   - E2E encrypted
   - Conflict resolution

2. **Teams**
   - Workspace organization
   - Permissions

3. **Analytics**
   - Usage tracking (local)
   - AI operation metrics

---

## Final Verdict

### Strengths ⭐

- **Architecture:** Clean, modular, testable
- **Domain Layer:** Pure functions, well-structured
- **Plugin System:** Ready for extension
- **AI Infrastructure:** Foundation complete
- **UI Quality:** Professional components

### Weaknesses ⚠️

- **Completion:** Many half-features need finishing
- **Performance:** Board view needs virtualization
- **Internationalization:** Mixed languages
- **Testing:** Low component/E2E coverage

### Blockers for Production 🚫

1. Critical memory leaks (C1, C2)
2. Unbounded snapshot growth (C6)
3. No real AI provider (C8)
4. Mixed i18n (C10)

### Recommendation

**Current State:** 8.5/10 — Excellent foundation, needs stabilization

**Next Steps:**
1. Fix Phase 0-1 critical issues
2. Complete half-features (plugins, AI, snapshots)
3. Add board virtualization
4. Ship v1.0

**Timeline to Production:** 4-6 weeks with focused effort

---

**Auditor:** moonshotai/kimi-k2.5  
**Date:** 2026-04-30  
**Sources:** 8 independent audits synthesized  
**Next Review:** After Phase 1 completion
