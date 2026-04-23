# Content Monitoring Workbench Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the screenshot-style homepage into a usable monitoring workbench with sortable wechat results, category management, search history, report tab, and settings tab.

**Architecture:** Keep the page shell and screenshot-style layout, but move behavior into smaller focused components and utilities. Fix the data path first so the proxy returns explicit raw-vs-sorted result information, then wire that into content cards, history, category actions, report navigation, and settings management.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, localStorage, server-side API proxy

---

### Task 1: Lock Down Wechat Ordering And Source Mapping

**Files:**
- Modify: `src/lib/wechat-monitor.ts`
- Modify: `src/app/api/wechat/keyword-search/route.ts`
- Modify: `src/lib/types.ts`
- Test: `src/lib/__tests__/wechat-monitor.test.ts`

- [ ] Add failing tests for raw order retention, sorted display order, and source URL fallback.
- [ ] Run the targeted wechat monitor tests and confirm they fail for the expected reason.
- [ ] Implement sorting by publish time descending and include raw order metadata in the route response.
- [ ] Re-run the targeted wechat tests until they pass.

### Task 2: Rebuild Shared Replica Data And View Models

**Files:**
- Modify: `src/lib/replica-workbench-data.ts`
- Modify: `src/lib/replica-workbench.ts`
- Test: `src/lib/__tests__/replica-workbench.test.ts`

- [ ] Add failing tests for new article card fields, report mock data, settings mock data, and category mutations.
- [ ] Run the targeted replica data tests and confirm they fail.
- [ ] Refactor the shared types and helper functions to support categories, reports, settings, and sortable content items.
- [ ] Re-run the targeted replica data tests until they pass.

### Task 3: Add Search History Persistence

**Files:**
- Create: `src/lib/search-history.ts`
- Create or Modify: `src/lib/__tests__/search-history.test.ts`

- [ ] Add failing tests for saving, trimming, and reloading the latest 10 to 20 search history items.
- [ ] Run the targeted search history tests and confirm they fail.
- [ ] Implement localStorage helpers for read, write, upsert, and trim behavior.
- [ ] Re-run the targeted history tests until they pass.

### Task 4: Upgrade Content Tab And Content Cards

**Files:**
- Modify: `src/components/workbench/replica-content-list.tsx`
- Modify: `src/components/workbench/replica-keyword-bar.tsx`
- Modify: `src/components/workbench/replica-topbar.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/workbench/__tests__/replica-workbench-shell.test.tsx`
- Test: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

- [ ] Add failing UI tests for compact content cards, source labels, publish time text, and original article links.
- [ ] Run the targeted content shell/fetch tests and confirm they fail.
- [ ] Implement compact card rendering, top-right search history entry point, and whole-page scrolling behavior.
- [ ] Re-run the targeted UI tests until they pass.

### Task 5: Add Category Management Interactions

**Files:**
- Modify: `src/components/workbench/replica-sidebar.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create or Modify: `src/components/workbench/__tests__/replica-sidebar.test.tsx`

- [ ] Add failing tests for create category, rename category, delete category, hover-more, and right-click menu behavior.
- [ ] Run the targeted sidebar tests and confirm they fail.
- [ ] Implement category creation, rename, delete, custom context menu, and initial fetch on new category creation.
- [ ] Re-run the targeted sidebar tests until they pass.

### Task 6: Add Search History Popover And Re-Run Flow

**Files:**
- Create: `src/components/workbench/replica-history-popover.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create or Modify: `src/components/workbench/__tests__/replica-history-popover.test.tsx`

- [ ] Add failing tests for opening the history popover, showing recent searches, and replaying a prior search.
- [ ] Run the targeted history popover tests and confirm they fail.
- [ ] Implement the popover and wire it to category switching, keyword refill, and re-fetch.
- [ ] Re-run the targeted history tests until they pass.

### Task 7: Build Analysis Tab Prototype

**Files:**
- Create: `src/components/workbench/replica-analysis-panel.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create or Modify: `src/components/workbench/__tests__/replica-analysis-panel.test.tsx`

- [ ] Add failing tests for date card switching, 7/14 day range, daily/summary sub-tabs, and support-content jump action.
- [ ] Run the targeted analysis tests and confirm they fail.
- [ ] Implement the analysis panel with mock reports and content jump callbacks.
- [ ] Re-run the targeted analysis tests until they pass.

### Task 8: Build Settings Tab Prototype

**Files:**
- Create: `src/components/workbench/replica-settings-panel.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create or Modify: `src/components/workbench/__tests__/replica-settings-panel.test.tsx`

- [ ] Add failing tests for platform status display, keyword add/remove, creator add/remove, and delete-category confirmation.
- [ ] Run the targeted settings tests and confirm they fail.
- [ ] Implement the settings panel and wire it to page-level state.
- [ ] Re-run the targeted settings tests until they pass.

### Task 9: Full Verification And Local Preview

**Files:**
- Verify current modified files only

- [ ] Run `npm run test` and confirm the full suite passes.
- [ ] Run `npm run lint` and confirm lint passes.
- [ ] Run `npm run build` and confirm production build passes.
- [ ] Restart the local preview and verify `http://127.0.0.1:3000` serves the updated workbench.
