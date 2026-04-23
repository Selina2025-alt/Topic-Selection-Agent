# Workbench Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair category creation, complete WeChat article search integration, and tighten homepage structure without breaking the existing workbench prototype.

**Architecture:** Keep the single-page workbench architecture, but lift categories into page state, add a dedicated create-category form component, and keep WeChat integration behind a server route. Existing report/content bridge behavior stays intact while content loading states and typography are refined.

**Tech Stack:** Next.js App Router, React state, Vitest, Testing Library, CSS modules via global stylesheet

---

### Task 1: Lock New Category Behavior With Tests

**Files:**
- Modify: `src/components/workbench/__tests__/monitoring-workbench-operations.test.tsx`
- Create: `src/components/workbench/__tests__/create-category-flow.test.tsx`

- [ ] Add failing tests for opening, typing into, saving, cancelling, and deleting the create-category draft.
- [ ] Run the focused tests and confirm they fail for the missing form behavior.

### Task 2: Lock WeChat Keyword Search Behavior With Tests

**Files:**
- Modify: `src/components/workbench/__tests__/monitoring-workbench-wechat.test.tsx`
- Modify: `src/lib/__tests__/wechat-monitor.test.ts`

- [ ] Add failing tests for the renamed API route, normalized article mapping fields, and loading/empty/error states.
- [ ] Run the focused tests and confirm they fail before implementation.

### Task 3: Implement Create Category Draft And Category State

**Files:**
- Create: `src/components/workbench/create-category-draft.tsx`
- Modify: `src/components/workbench/global-toolbar.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/components/workbench/category-sidebar.tsx`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/mock-data.ts`

- [ ] Add controlled draft state and create-category component wiring.
- [ ] Save categories into page state and switch to the new category on save.
- [ ] Generate safe mock defaults for reports, settings, and content so new categories render end-to-end.

### Task 4: Implement WeChat Route And Content Integration

**Files:**
- Create or move: `src/app/api/wechat/keyword-search/route.ts`
- Modify: `src/lib/wechat-monitor.ts`
- Modify: `src/components/workbench/content-tab.tsx`
- Modify: `src/components/workbench/content-filter-bar.tsx`
- Modify: `src/components/workbench/content-card.tsx`

- [ ] Rename and complete the server route.
- [ ] Normalize mapped fields and keep token server-side.
- [ ] Load category-based WeChat content and render loading, empty, and error states.

### Task 5: Tighten Homepage Structure And Typography

**Files:**
- Modify: `src/components/workbench/workbench-header.tsx`
- Modify: `src/components/workbench/global-toolbar.tsx`
- Modify: `src/app/globals.css`

- [ ] Reduce top-level noise and keep the toolbar system-focused.
- [ ] Tighten title scales, helper text, padding, and section spacing.

### Task 6: Verify Everything

**Files:**
- No code changes required unless verification finds regressions.

- [ ] Run `npm run test`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] If any command fails, fix root cause before claiming completion.
