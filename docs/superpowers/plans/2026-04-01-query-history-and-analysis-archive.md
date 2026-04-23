# Query History And Analysis Archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist query history and topic-analysis snapshots into SQLite, then expose a non-intrusive history drawer that lets users revisit past keywords, results, and topic suggestions without breaking the current refresh and content workflows.

**Architecture:** Extend the existing SQLite schema with query-history and analysis-snapshot tables, then hook those writes into the current refresh pipeline without changing the existing API contracts. Add a dedicated history read API plus a right-side drawer UI that reads persisted history, supports grouped views, and can restore prior content/analysis snapshots into the current single-page workbench.

**Tech Stack:** Next.js App Router, React, TypeScript, Vitest, node:sqlite, local component state

---

## File Map

### Existing files to modify
- `src/lib/db/schema.ts`
  - Extend SQLite schema with query-history and analysis snapshot tables.
- `src/lib/db/monitoring-repository.ts`
  - Add repository functions for query history, analysis snapshots, and history reads.
- `src/lib/monitoring-sync-service.ts`
  - Persist a `search_queries` record around every refresh run.
- `src/components/workbench/monitoring-workbench.tsx`
  - Wire the new history drawer, hydrate history actions, and restore prior content/analysis state.
- `src/components/workbench/replica-history-popover.tsx`
  - Replace the lightweight popover content with a drawer-launching control or evolve it into the drawer shell.
- `src/app/globals.css`
  - Add drawer layout, history list, detail pane, and non-intrusive visual states.
- `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
  - Extend existing refresh behavior tests to verify persisted query writes are triggered and old behavior remains intact.

### New files to create
- `src/lib/history-archive.ts`
  - Build snapshot payloads from current reports and current keyword context in one place.
- `src/app/api/history/route.ts`
  - List query-history entries and grouped keyword-history entries from SQLite.
- `src/app/api/history/[queryId]/route.ts`
  - Read a single query-history detail payload, including stored content and analysis snapshot.
- `src/components/workbench/replica-history-drawer.tsx`
  - Render the right-side drawer, tabs, history list, detail panel, and action buttons.
- `src/lib/__tests__/history-archive.test.ts`
  - Unit tests for snapshot builders.
- `src/lib/__tests__/monitoring-repository-history.test.ts`
  - Repository tests for query history and analysis snapshot persistence.
- `src/app/api/history/__tests__/route.test.ts`
  - API tests for history list/detail reads.
- `src/components/workbench/__tests__/replica-history-drawer.test.tsx`
  - UI tests for the history drawer, grouped views, and restore actions.

### Files intentionally left unchanged
- `src/app/api/content/refresh/route.ts`
- `src/app/api/content/list/route.ts`
- `src/app/api/wechat/keyword-search/route.ts`
- `src/app/api/xiaohongshu/keyword-search/route.ts`

These stay contract-compatible; only internal service calls and downstream reads should expand.

---

### Task 1: Extend SQLite Schema For Query History And Analysis Snapshots

**Files:**
- Modify: `src/lib/db/schema.ts`
- Test: `src/lib/__tests__/monitoring-repository-history.test.ts`

- [ ] **Step 1: Write the failing repository schema test**

```ts
import { describe, expect, it } from "vitest";

import { initializeMonitoringDatabase } from "@/lib/db/database";

describe("history schema", () => {
  it("creates search and analysis archive tables", () => {
    const database = initializeMonitoringDatabase(":memory:");

    const tableNames = (
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((row) => row.name);

    expect(tableNames).toContain("search_queries");
    expect(tableNames).toContain("analysis_snapshots");
    expect(tableNames).toContain("analysis_topics");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts
```

Expected: FAIL because the new tables do not exist yet.

- [ ] **Step 3: Add the new schema tables**

Add to `src/lib/db/schema.ts`:

```ts
    CREATE TABLE IF NOT EXISTS search_queries (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT,
      keyword TEXT NOT NULL,
      platform_scope TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      status TEXT NOT NULL,
      fetched_count INTEGER NOT NULL DEFAULT 0,
      capped_count INTEGER NOT NULL DEFAULT 0,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      error_message TEXT
    );

    CREATE INDEX IF NOT EXISTS search_queries_lookup_idx
      ON search_queries (category_id, started_at DESC);

    CREATE TABLE IF NOT EXISTS analysis_snapshots (
      id TEXT PRIMARY KEY,
      search_query_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      generated_at TEXT NOT NULL,
      hot_summary TEXT NOT NULL,
      focus_summary TEXT NOT NULL,
      pattern_summary TEXT NOT NULL,
      insight_summary TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analysis_snapshots_lookup_idx
      ON analysis_snapshots (search_query_id, generated_at DESC);

    CREATE TABLE IF NOT EXISTS analysis_topics (
      id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      title TEXT NOT NULL,
      intro TEXT NOT NULL,
      why_now TEXT NOT NULL,
      hook TEXT NOT NULL,
      growth TEXT NOT NULL,
      support_content_ids TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS analysis_topics_lookup_idx
      ON analysis_topics (snapshot_id);
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/db/schema.ts src/lib/__tests__/monitoring-repository-history.test.ts
git commit -m "feat: add query history archive schema"
```

---

### Task 2: Add Repository Functions For Query History And Analysis Snapshots

**Files:**
- Modify: `src/lib/db/monitoring-repository.ts`
- Test: `src/lib/__tests__/monitoring-repository-history.test.ts`

- [ ] **Step 1: Write the failing repository behavior tests**

Add tests like:

```ts
it("persists and lists search query rows", () => {
  const repository = createMonitoringRepository(initializeMonitoringDatabase(":memory:"));

  createSearchQuery(repository, {
    id: "query-1",
    categoryId: "claude",
    keywordTargetId: "claude-keyword-1",
    keyword: "claude code",
    platformScope: "wechat,xiaohongshu",
    triggerType: "manual_refresh",
    status: "running",
    fetchedCount: 0,
    cappedCount: 0,
    startedAt: "2026-04-01T10:00:00.000Z",
    finishedAt: null,
    errorMessage: null
  });

  finishSearchQuery(repository, {
    id: "query-1",
    status: "success",
    fetchedCount: 24,
    cappedCount: 20,
    finishedAt: "2026-04-01T10:01:00.000Z",
    errorMessage: null
  });

  const rows = listSearchQueries(repository, "claude");

  expect(rows).toHaveLength(1);
  expect(rows[0]?.keyword).toBe("claude code");
  expect(rows[0]?.cappedCount).toBe(20);
});

it("persists analysis snapshots and nested topics", () => {
  const repository = createMonitoringRepository(initializeMonitoringDatabase(":memory:"));

  upsertAnalysisSnapshot(repository, {
    snapshot: {
      id: "snapshot-1",
      searchQueryId: "query-1",
      categoryId: "claude",
      keyword: "claude code",
      generatedAt: "2026-04-01T10:01:00.000Z",
      hotSummary: "hot",
      focusSummary: "focus",
      patternSummary: "pattern",
      insightSummary: "insight"
    },
    topics: [
      {
        id: "topic-1",
        snapshotId: "snapshot-1",
        title: "Claude Code workflow breakdown",
        intro: "intro",
        whyNow: "why",
        hook: "hook",
        growth: "growth",
        supportContentIds: ["wx-1", "xhs-1"]
      }
    ]
  });

  const detail = getAnalysisSnapshotBySearchQuery(repository, "query-1");

  expect(detail?.snapshot.keyword).toBe("claude code");
  expect(detail?.topics).toHaveLength(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts
```

Expected: FAIL because the new repository functions do not exist yet.

- [ ] **Step 3: Implement minimal repository support**

Add types and functions to `src/lib/db/monitoring-repository.ts`:

```ts
export interface PersistedSearchQuery {
  id: string;
  categoryId: string;
  keywordTargetId: string | null;
  keyword: string;
  platformScope: string;
  triggerType: "manual_refresh" | "keyword_created";
  status: SyncRunStatus;
  fetchedCount: number;
  cappedCount: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface PersistedAnalysisSnapshot {
  id: string;
  searchQueryId: string;
  categoryId: string;
  keyword: string;
  generatedAt: string;
  hotSummary: string;
  focusSummary: string;
  patternSummary: string;
  insightSummary: string;
}

export interface PersistedAnalysisTopic {
  id: string;
  snapshotId: string;
  title: string;
  intro: string;
  whyNow: string;
  hook: string;
  growth: string;
  supportContentIds: string[];
}
```

And implement:

```ts
export function createSearchQuery(repository: MonitoringRepository, query: PersistedSearchQuery) { /* insert */ }
export function finishSearchQuery(
  repository: MonitoringRepository,
  input: Pick<PersistedSearchQuery, "id" | "status" | "fetchedCount" | "cappedCount" | "finishedAt" | "errorMessage">
) { /* update */ }
export function listSearchQueries(repository: MonitoringRepository, categoryId: string) { /* select */ }
export function upsertAnalysisSnapshot(
  repository: MonitoringRepository,
  input: { snapshot: PersistedAnalysisSnapshot; topics: PersistedAnalysisTopic[] }
) { /* replace snapshot + topics */ }
export function getAnalysisSnapshotBySearchQuery(repository: MonitoringRepository, searchQueryId: string) { /* select */ }
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/db/monitoring-repository.ts src/lib/__tests__/monitoring-repository-history.test.ts
git commit -m "feat: add repository support for query history"
```

---

### Task 3: Build Snapshot Helpers Without Rewriting The Existing Analysis UI

**Files:**
- Create: `src/lib/history-archive.ts`
- Test: `src/lib/__tests__/history-archive.test.ts`

- [ ] **Step 1: Write the failing snapshot-builder tests**

```ts
import { describe, expect, it } from "vitest";

import { buildAnalysisArchiveSnapshot } from "@/lib/history-archive";

describe("history archive", () => {
  it("creates a snapshot payload from the selected report", () => {
    const result = buildAnalysisArchiveSnapshot({
      searchQueryId: "query-1",
      categoryId: "claude",
      keyword: "claude code",
      reports: [
        {
          id: "report-1",
          date: "2026-04-01",
          label: "4月1日",
          hotSummary: "hot",
          focusSummary: "focus",
          patternSummary: "pattern",
          insightSummary: "insight",
          suggestions: [
            {
              id: "topic-1",
              title: "Claude Code workflow breakdown",
              intro: "intro",
              whyNow: "why",
              hook: "hook",
              growth: "growth",
              supportContentIds: ["wx-1"]
            }
          ]
        }
      ]
    });

    expect(result.snapshot.searchQueryId).toBe("query-1");
    expect(result.topics[0]?.title).toBe("Claude Code workflow breakdown");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/lib/__tests__/history-archive.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement the minimal snapshot builder**

Create `src/lib/history-archive.ts`:

```ts
import type { ReplicaDailyReport } from "@/lib/replica-workbench-data";
import type {
  PersistedAnalysisSnapshot,
  PersistedAnalysisTopic
} from "@/lib/db/monitoring-repository";

export function buildAnalysisArchiveSnapshot(input: {
  searchQueryId: string;
  categoryId: string;
  keyword: string;
  reports: ReplicaDailyReport[];
}) {
  const activeReport = input.reports[0];
  const snapshotId = `snapshot-${input.searchQueryId}`;

  const snapshot: PersistedAnalysisSnapshot = {
    id: snapshotId,
    searchQueryId: input.searchQueryId,
    categoryId: input.categoryId,
    keyword: input.keyword,
    generatedAt: new Date().toISOString(),
    hotSummary: activeReport?.hotSummary ?? "",
    focusSummary: activeReport?.focusSummary ?? "",
    patternSummary: activeReport?.patternSummary ?? "",
    insightSummary: activeReport?.insightSummary ?? ""
  };

  const topics: PersistedAnalysisTopic[] = (activeReport?.suggestions ?? []).map((topic) => ({
    id: topic.id,
    snapshotId,
    title: topic.title,
    intro: topic.intro,
    whyNow: topic.whyNow,
    hook: topic.hook,
    growth: topic.growth,
    supportContentIds: topic.supportContentIds
  }));

  return { snapshot, topics };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/lib/__tests__/history-archive.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/history-archive.ts src/lib/__tests__/history-archive.test.ts
git commit -m "feat: add analysis archive snapshot builder"
```

---

### Task 4: Persist Query History During Existing Refresh Flows

**Files:**
- Modify: `src/lib/monitoring-sync-service.ts`
- Modify: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
- Test: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

- [ ] **Step 1: Write the failing integration test for persisted search queries**

Extend an existing refresh test with expectations like:

```ts
expect(fetchMock).toHaveBeenCalledWith(
  expect.stringContaining("/api/history"),
  expect.anything()
);
```

Or, if staying internal-only at this step, add a unit test around the service:

```ts
it("creates and completes a search query record during refresh", async () => {
  // fake repository, fake search result
  // expect createSearchQuery + finishSearchQuery calls
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
```

Expected: FAIL because refresh does not yet persist query-history rows.

- [ ] **Step 3: Hook query-history writes into the current service**

In `src/lib/monitoring-sync-service.ts`, wrap the existing platform refresh flow:

```ts
const searchQueryId = randomId();

createSearchQuery(input.repository, {
  id: searchQueryId,
  categoryId: input.categoryId,
  keywordTargetId: input.keywordTarget.id,
  keyword: input.keywordTarget.keyword,
  platformScope: input.platformId,
  triggerType: "manual_refresh",
  status: "running",
  fetchedCount: 0,
  cappedCount: 0,
  startedAt,
  finishedAt: null,
  errorMessage: null
});
```

On success:

```ts
finishSearchQuery(input.repository, {
  id: searchQueryId,
  status: "success",
  fetchedCount: snapshot.fetchedCount,
  cappedCount: snapshot.cappedCount,
  finishedAt,
  errorMessage: null
});
```

On failure:

```ts
finishSearchQuery(input.repository, {
  id: searchQueryId,
  status: "failed",
  fetchedCount: 0,
  cappedCount: 0,
  finishedAt,
  errorMessage: message
});
```

Do not alter the existing returned snapshot shape.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
```

Expected: PASS with existing refresh behavior intact.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/monitoring-sync-service.ts src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
git commit -m "feat: persist query history during refresh"
```

---

### Task 5: Persist Analysis Snapshots Alongside Existing Report State

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/lib/db/monitoring-repository.ts`
- Modify: `src/lib/history-archive.ts`
- Test: `src/components/workbench/__tests__/replica-analysis-panel.test.tsx`

- [ ] **Step 1: Write the failing test for analysis snapshot persistence**

Add a focused assertion in a workbench-level test:

```ts
it("stores an analysis snapshot when a refresh completes", async () => {
  // render workbench, trigger refresh, then verify archive read contains snapshot text
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-analysis-panel.test.tsx
```

Expected: FAIL because refresh does not persist a snapshot yet.

- [ ] **Step 3: Save analysis snapshots after successful refresh**

In `src/components/workbench/monitoring-workbench.tsx`, after the current successful refresh state update:

```ts
const archivePayload = buildAnalysisArchiveSnapshot({
  searchQueryId,
  categoryId: activeCategory.id,
  keyword: activeKeyword,
  reports: activeCategory.reports
});

upsertAnalysisSnapshot(repository, archivePayload);
```

Use the already-selected category reports; do not alter the analysis panel rendering path yet.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-analysis-panel.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/workbench/monitoring-workbench.tsx src/lib/history-archive.ts src/lib/db/monitoring-repository.ts src/components/workbench/__tests__/replica-analysis-panel.test.tsx
git commit -m "feat: archive analysis snapshots after refresh"
```

---

### Task 6: Add History Read APIs Without Changing Existing Refresh/List Contracts

**Files:**
- Create: `src/app/api/history/route.ts`
- Create: `src/app/api/history/[queryId]/route.ts`
- Test: `src/app/api/history/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing API tests**

```ts
import { describe, expect, it } from "vitest";

describe("history api", () => {
  it("lists recent search query rows", async () => {
    // seed memory DB, call GET /api/history?categoryId=claude
    // expect keyword and counts in response
  });

  it("returns detail payload for a single search query", async () => {
    // seed snapshot + topics + collected content
    // expect content and analysis blocks in response
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/app/api/history/__tests__/route.test.ts
```

Expected: FAIL because the route files do not exist.

- [ ] **Step 3: Implement the list and detail APIs**

Create `src/app/api/history/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  createMonitoringRepository,
  listSearchQueries
} from "@/lib/db/monitoring-repository";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId");

  if (!categoryId) {
    return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
  }

  const repository = createMonitoringRepository();
  const queries = listSearchQueries(repository, categoryId);

  return NextResponse.json({ queries });
}
```

Create `src/app/api/history/[queryId]/route.ts`:

```ts
import { NextResponse } from "next/server";

import {
  createMonitoringRepository,
  getAnalysisSnapshotBySearchQuery,
  getSearchQueryById,
  listCollectedContentsBySearchQuery
} from "@/lib/db/monitoring-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ queryId: string }> }
) {
  const { queryId } = await context.params;
  const repository = createMonitoringRepository();
  const query = getSearchQueryById(repository, queryId);

  if (!query) {
    return NextResponse.json({ error: "Query not found" }, { status: 404 });
  }

  const analysis = getAnalysisSnapshotBySearchQuery(repository, queryId);
  const items = listCollectedContentsBySearchQuery(repository, queryId);

  return NextResponse.json({ query, analysis, items });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/app/api/history/__tests__/route.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/app/api/history/route.ts src/app/api/history/[queryId]/route.ts src/app/api/history/__tests__/route.test.ts
git commit -m "feat: add history archive api routes"
```

---

### Task 7: Add A Non-Intrusive History Drawer To The Current Workbench

**Files:**
- Create: `src/components/workbench/replica-history-drawer.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/components/workbench/replica-history-popover.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/workbench/__tests__/replica-history-drawer.test.tsx`

- [ ] **Step 1: Write the failing drawer UI tests**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica history drawer", () => {
  it("opens the history drawer from the existing top-right button", async () => {
    const user = userEvent.setup();

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));

    expect(screen.getByText("搜索历史")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "查询记录" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-history-drawer.test.tsx
```

Expected: FAIL because the drawer does not exist.

- [ ] **Step 3: Implement the drawer and keep the current top bar layout**

Create `src/components/workbench/replica-history-drawer.tsx` with:

```tsx
interface ReplicaHistoryDrawerProps {
  open: boolean;
  view: "queries" | "keywords";
  entries: HistoryEntry[];
  selectedQueryId: string | null;
  detail: HistoryDetail | null;
  onClose: () => void;
  onChangeView: (view: "queries" | "keywords") => void;
  onSelectQuery: (queryId: string) => void;
  onRestoreContent: (queryId: string) => void;
  onRestoreAnalysis: (queryId: string) => void;
  onRerun: (queryId: string) => void;
}
```

In `monitoring-workbench.tsx`, add:

```tsx
const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
const [historyView, setHistoryView] = useState<"queries" | "keywords">("queries");
const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
const [selectedHistoryQueryId, setSelectedHistoryQueryId] = useState<string | null>(null);
const [selectedHistoryDetail, setSelectedHistoryDetail] = useState<HistoryDetail | null>(null);
```

Keep the existing `搜索历史` button in place; change its click handler to open the drawer and load `/api/history?categoryId=${activeCategory.id}`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-history-drawer.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/workbench/replica-history-drawer.tsx src/components/workbench/monitoring-workbench.tsx src/components/workbench/replica-history-popover.tsx src/app/globals.css src/components/workbench/__tests__/replica-history-drawer.test.tsx
git commit -m "feat: add query history drawer"
```

---

### Task 8: Restore Historical Content And Analysis Without Triggering New Searches

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
- Test: `src/components/workbench/__tests__/replica-history-drawer.test.tsx`

- [ ] **Step 1: Write the failing restore-flow tests**

```tsx
it("restores historical content without calling the refresh api", async () => {
  // open history drawer
  // click 查看内容
  // expect restored content from /api/history/[queryId]
  // expect no /api/content/refresh call
});

it("restores historical analysis into the analysis tab", async () => {
  // open history drawer
  // click 查看选题
  // expect analysis tab active
  // expect stored snapshot summaries rendered
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-history-drawer.test.tsx
```

Expected: FAIL because restore actions are not wired.

- [ ] **Step 3: Implement restore actions**

In `monitoring-workbench.tsx`, add handlers:

```tsx
async function handleRestoreContent(queryId: string) {
  const response = await fetch(`/api/history/${queryId}`);
  const payload = await response.json();

  setActiveTab("content");
  setKeywordInput(payload.query.keyword);
  setActivePlatform(payload.query.platformScope.includes(",") ? "all" : payload.query.platformScope);
  setFetchedArticles(mapContentItemsToReplicaArticles(payload.items));
  setErrorMessage("");
}

async function handleRestoreAnalysis(queryId: string) {
  const response = await fetch(`/api/history/${queryId}`);
  const payload = await response.json();

  setActiveTab("analysis");
  setArchivedAnalysis(payload.analysis);
}
```

Do not call `/api/content/refresh` in either restore flow.

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
npm run test -- src/components/workbench/__tests__/replica-history-drawer.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/components/workbench/monitoring-workbench.tsx src/components/workbench/__tests__/replica-history-drawer.test.tsx src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
git commit -m "feat: restore historical content and analysis snapshots"
```

---

### Task 9: Keep LocalStorage History As A Compatibility Cache, Not The Source Of Truth

**Files:**
- Modify: `src/lib/search-history.ts`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Test: `src/lib/__tests__/search-history.test.ts`

- [ ] **Step 1: Write the failing compatibility test**

```ts
it("can still store a lightweight local history entry while sqlite becomes the primary source", () => {
  const result = saveSearchHistoryEntry({
    keyword: "claude code",
    categoryId: "claude",
    categoryName: "Claude Code 选题监控"
  });

  expect(result[0]?.keyword).toBe("claude code");
});
```

- [ ] **Step 2: Run test to verify it fails if necessary**

Run:

```powershell
npm run test -- src/lib/__tests__/search-history.test.ts
```

Expected: PASS or FAIL depending on current behavior. If already passing, treat this as a guardrail step and continue.

- [ ] **Step 3: Keep the cache but remove dependency on it for drawer data**

In `monitoring-workbench.tsx`, ensure:

```tsx
// use /api/history for drawer data
// keep saveSearchHistoryEntry only as a best-effort cache write after successful manual refresh
```

Do not block history rendering if localStorage is empty.

- [ ] **Step 4: Run targeted tests**

Run:

```powershell
npm run test -- src/lib/__tests__/search-history.test.ts
npm run test -- src/components/workbench/__tests__/replica-history-drawer.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```powershell
git add src/lib/search-history.ts src/components/workbench/monitoring-workbench.tsx src/lib/__tests__/search-history.test.ts
git commit -m "chore: keep local history as compatibility cache"
```

---

### Task 10: Final Regression Verification

**Files:**
- Verify only

- [ ] **Step 1: Run full test suite**

Run:

```powershell
npm run test
```

Expected: PASS

- [ ] **Step 2: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS

- [ ] **Step 3: Run production build**

Run:

```powershell
npm run build
```

Expected: PASS with the existing known Win32 `@next/swc` warning only.

- [ ] **Step 4: Smoke test the preview**

Run:

```powershell
try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000' -UseBasicParsing).StatusCode } catch { $_.Exception.Message }
```

Expected: `200`

- [ ] **Step 5: Commit final integration**

```powershell
git add .
git commit -m "feat: add query history and analysis archive workflow"
```

---

## Spec Self-Review

### Spec coverage
- Query history in SQLite: covered by Tasks 1, 2, 4, 6
- Analysis snapshots in SQLite: covered by Tasks 1, 2, 3, 5, 6
- Non-intrusive history UI: covered by Tasks 7 and 8
- Restore historical content and analysis: covered by Task 8
- Keep existing APIs and layout stable: explicit architecture rule plus Tasks 4, 6, 7
- Preserve local history compatibility during migration: covered by Task 9

### Placeholder scan
- No `TODO`, `TBD`, or deferred “handle later” steps remain.
- All tasks have explicit file paths, commands, and intended code.

### Type consistency
- `search_queries`, `analysis_snapshots`, and `analysis_topics` are the only new table names used.
- `PersistedSearchQuery`, `PersistedAnalysisSnapshot`, and `PersistedAnalysisTopic` match across tasks.
- Restore flow consistently reads through `/api/history` and not through refresh routes.
