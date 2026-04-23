# ContentPulse Xiaohongshu Monitoring Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the monitoring workbench so keyword targets can bind multiple platforms, Xiaohongshu keyword results can be fetched and persisted to SQLite, and the content tab can quickly refresh the current platform plus current keyword.

**Architecture:** Keep the current screenshot-style workbench shell, but upgrade the underlying category model from plain keyword strings to keyword target objects. Add a lightweight server-side persistence layer using Node's built-in `node:sqlite`, route platform fetches through a unified sync service, and keep the content tab reading the latest results from SQLite instead of only in-memory mock data.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Node `node:sqlite`, server-side API routes, existing Wechat proxy logic, new Xiaohongshu proxy logic

---

### Task 1: Introduce Persistent Monitoring Models And SQLite Schema

**Files:**
- Create: `src/lib/db/database.ts`
- Create: `src/lib/db/schema.ts`
- Create: `src/lib/db/monitoring-repository.ts`
- Modify: `src/lib/replica-workbench-data.ts`
- Modify: `src/lib/replica-workbench.ts`
- Modify: `src/lib/types.ts`
- Test: `src/lib/__tests__/monitoring-repository.test.ts`
- Test: `src/lib/__tests__/replica-workbench.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
import { beforeEach, expect, test } from "vitest";

import {
  createInMemoryDatabase,
  ensureMonitoringSchema
} from "@/lib/db/database";
import {
  createKeywordTargetRecord,
  listKeywordTargetRecords,
  upsertCollectedContent,
  listCollectedContentByKeywordAndPlatform
} from "@/lib/db/monitoring-repository";

let db = createInMemoryDatabase();

beforeEach(() => {
  db = createInMemoryDatabase();
  ensureMonitoringSchema(db);
});

test("stores keyword targets with multiple bound platforms", () => {
  createKeywordTargetRecord(db, {
    id: "kw-openclaw",
    categoryId: "claude",
    keyword: "openclaw",
    enabledPlatformIds: ["wechat", "xiaohongshu"],
    createdAt: "2026-03-31T09:00:00.000Z"
  });

  expect(listKeywordTargetRecords(db, "claude")).toEqual([
    expect.objectContaining({
      id: "kw-openclaw",
      keyword: "openclaw",
      enabledPlatformIds: ["wechat", "xiaohongshu"]
    })
  ]);
});

test("upserts collected content by platform plus content id", () => {
  upsertCollectedContent(db, {
    platformId: "xiaohongshu",
    contentId: "note-1",
    categoryId: "claude",
    keywordTargetId: "kw-openclaw",
    title: "OpenClaw 工作流",
    excerpt: "desc",
    author: "作者A",
    authorId: "user-1",
    publishedAt: "2026-03-31 10:00:00",
    publishTimestamp: 1711850400,
    likes: 12,
    comments: 3,
    readsText: "--",
    articleUrl: "",
    coverUrl: "https://example.com/cover.jpg",
    rawOrderIndex: 0,
    sourceType: "xiaohongshu",
    payloadJson: "{}",
    updatedAt: "2026-03-31T10:05:00.000Z"
  });

  upsertCollectedContent(db, {
    platformId: "xiaohongshu",
    contentId: "note-1",
    categoryId: "claude",
    keywordTargetId: "kw-openclaw",
    title: "OpenClaw 工作流更新",
    excerpt: "desc-new",
    author: "作者A",
    authorId: "user-1",
    publishedAt: "2026-03-31 10:00:00",
    publishTimestamp: 1711850400,
    likes: 20,
    comments: 5,
    readsText: "--",
    articleUrl: "",
    coverUrl: "https://example.com/cover.jpg",
    rawOrderIndex: 0,
    sourceType: "xiaohongshu",
    payloadJson: "{}",
    updatedAt: "2026-03-31T10:10:00.000Z"
  });

  expect(listCollectedContentByKeywordAndPlatform(db, {
    categoryId: "claude",
    keywordTargetId: "kw-openclaw",
    platformId: "xiaohongshu"
  })).toEqual([
    expect.objectContaining({
      contentId: "note-1",
      title: "OpenClaw 工作流更新",
      likes: 20
    })
  ]);
});
```

- [ ] **Step 2: Run the targeted repository tests and confirm they fail**

Run:

```bash
npm run test -- src/lib/__tests__/monitoring-repository.test.ts src/lib/__tests__/replica-workbench.test.ts
```

Expected: failures for missing database helpers and missing keyword target model updates.

- [ ] **Step 3: Implement the SQLite bootstrap and schema**

```ts
// src/lib/db/database.ts
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const databasePath = join(process.cwd(), ".codex-data", "contentpulse.sqlite");

export function openMonitoringDatabase() {
  mkdirSync(dirname(databasePath), { recursive: true });
  return new DatabaseSync(databasePath);
}

export function createInMemoryDatabase() {
  return new DatabaseSync(":memory:");
}

export function ensureMonitoringSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS keyword_targets (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword TEXT NOT NULL,
      enabled_platform_ids_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_run_at TEXT,
      last_run_status TEXT,
      last_result_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT NOT NULL,
      platform_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      result_count INTEGER DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS collected_contents (
      id TEXT PRIMARY KEY,
      platform_id TEXT NOT NULL,
      content_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      keyword_target_id TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      author TEXT NOT NULL,
      author_id TEXT,
      published_at TEXT NOT NULL,
      publish_timestamp INTEGER NOT NULL,
      likes INTEGER NOT NULL,
      comments INTEGER NOT NULL,
      reads_text TEXT NOT NULL,
      article_url TEXT,
      cover_url TEXT,
      raw_order_index INTEGER,
      source_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(platform_id, content_id)
    );
  `);
}
```

- [ ] **Step 4: Upgrade the replica models to keyword targets**

```ts
// src/lib/replica-workbench-data.ts
export interface ReplicaKeywordTarget {
  id: string;
  keyword: string;
  enabledPlatformIds: ReplicaTrackedPlatformId[];
  createdAt: string;
  lastRunAt?: string;
  lastRunStatus?: "idle" | "running" | "success" | "failed";
  lastResultCount?: number;
}

export interface ReplicaCategory {
  // ...
  keywordTargets: ReplicaKeywordTarget[];
  activeKeywordTargetId?: string;
}
```

- [ ] **Step 5: Re-run the targeted tests until they pass**

Run:

```bash
npm run test -- src/lib/__tests__/monitoring-repository.test.ts src/lib/__tests__/replica-workbench.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db src/lib/replica-workbench-data.ts src/lib/replica-workbench.ts src/lib/types.ts src/lib/__tests__/monitoring-repository.test.ts src/lib/__tests__/replica-workbench.test.ts
git commit -m "feat: add sqlite monitoring models"
```

### Task 2: Add Xiaohongshu Fetching And Platform Sync Services

**Files:**
- Create: `src/lib/xiaohongshu-monitor.ts`
- Create: `src/lib/platform-sync.ts`
- Modify: `src/lib/types.ts`
- Test: `src/lib/__tests__/xiaohongshu-monitor.test.ts`
- Test: `src/lib/__tests__/platform-sync.test.ts`

- [ ] **Step 1: Write the failing Xiaohongshu mapping and sorting tests**

```ts
import { expect, test } from "vitest";

import {
  mapXiaohongshuItemToContentItem,
  sortXiaohongshuItemsByTimestampDesc
} from "@/lib/xiaohongshu-monitor";

test("maps xiaohongshu note fields into the shared content model", () => {
  const mapped = mapXiaohongshuItemToContentItem(sampleItem, "openclaw", 0);

  expect(mapped).toEqual(
    expect.objectContaining({
      id: "xhs-openclaw-note-123",
      platformId: "xiaohongshu",
      authorName: "小红书作者",
      title: "OpenClaw 工作流",
      likeCount: 120,
      publishTimestamp: 1711850400,
      articleUrl: ""
    })
  );
});

test("sorts xiaohongshu results by timestamp descending with stable raw order", () => {
  expect(sortXiaohongshuItemsByTimestampDesc([
    mappedOlder,
    mappedNewest,
    mappedSameTimeLaterRaw
  ]).map((item) => item.id)).toEqual([
    mappedNewest.id,
    mappedSameTimeLaterRaw.id,
    mappedOlder.id
  ]);
});
```

- [ ] **Step 2: Run the targeted Xiaohongshu tests and confirm they fail**

Run:

```bash
npm run test -- src/lib/__tests__/xiaohongshu-monitor.test.ts src/lib/__tests__/platform-sync.test.ts
```

Expected: failures because Xiaohongshu monitor and sync service do not exist yet.

- [ ] **Step 3: Implement the Xiaohongshu monitor service**

```ts
// src/lib/xiaohongshu-monitor.ts
const XHS_ENDPOINT = "https://cn8n.com/p2/xhs/search_note_web";

export async function searchXiaohongshuNotesSnapshotByKeyword(
  keyword: string,
  page = 1,
  noteTime = "day"
) {
  const token = process.env.XIAOHONGSHU_MONITOR_TOKEN;

  if (!token) {
    throw new Error("Missing XIAOHONGSHU_MONITOR_TOKEN");
  }

  const response = await fetch(XHS_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: 9,
      keyword,
      page: String(page),
      sort: "comment_descending",
      note_type: "note",
      note_time: noteTime,
      searchId: "",
      sessionId: ""
    }),
    cache: "no-store"
  });

  const payload = await response.json();
  const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
  const rawItems = items.map((item, index) => mapXiaohongshuItemToContentItem(item, keyword, index));

  return {
    rawItems,
    items: sortContentItemsByPublishTimeDesc(rawItems)
  };
}
```

- [ ] **Step 4: Implement the platform sync dispatcher**

```ts
// src/lib/platform-sync.ts
export async function fetchPlatformSnapshot(platformId: ReplicaTrackedPlatformId, keyword: string) {
  if (platformId === "wechat") {
    return searchWechatArticlesSnapshotByKeyword(keyword);
  }

  if (platformId === "xiaohongshu") {
    return searchXiaohongshuNotesSnapshotByKeyword(keyword);
  }

  return { rawItems: [], items: [] };
}
```

- [ ] **Step 5: Re-run the targeted tests until they pass**

Run:

```bash
npm run test -- src/lib/__tests__/xiaohongshu-monitor.test.ts src/lib/__tests__/platform-sync.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/xiaohongshu-monitor.ts src/lib/platform-sync.ts src/lib/__tests__/xiaohongshu-monitor.test.ts src/lib/__tests__/platform-sync.test.ts src/lib/types.ts
git commit -m "feat: add xiaohongshu sync service"
```

### Task 3: Persist Sync Runs And Add Content Refresh APIs

**Files:**
- Create: `src/lib/monitoring-sync-service.ts`
- Create: `src/app/api/xiaohongshu/keyword-search/route.ts`
- Create: `src/app/api/content/refresh/route.ts`
- Create: `src/app/api/content/list/route.ts`
- Test: `src/app/api/xiaohongshu/keyword-search/route.test.ts`
- Test: `src/app/api/content/refresh/route.test.ts`
- Test: `src/app/api/content/list/route.test.ts`

- [ ] **Step 1: Write the failing API tests**

```ts
test("refresh route persists xiaohongshu content for a keyword target", async () => {
  const response = await POST(buildRefreshRequest({
    categoryId: "claude",
    keywordTargetId: "kw-openclaw",
    platformId: "xiaohongshu"
  }));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({
      platformId: "xiaohongshu",
      resultCount: expect.any(Number),
      items: expect.arrayContaining([
        expect.objectContaining({ platformId: "xiaohongshu" })
      ])
    })
  );
});

test("content list route returns persisted content for category, keyword target, and platform", async () => {
  const response = await GET(buildListRequest({
    categoryId: "claude",
    keywordTargetId: "kw-openclaw",
    platformId: "wechat"
  }));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(
    expect.objectContaining({
      items: expect.any(Array)
    })
  );
});
```

- [ ] **Step 2: Run the targeted API tests and confirm they fail**

Run:

```bash
npm run test -- src/app/api/xiaohongshu/keyword-search/route.test.ts src/app/api/content/refresh/route.test.ts src/app/api/content/list/route.test.ts
```

Expected: failures because the routes do not exist yet.

- [ ] **Step 3: Implement the monitoring sync service**

```ts
// src/lib/monitoring-sync-service.ts
export async function runPlatformKeywordSync(input: {
  categoryId: string;
  keywordTarget: ReplicaKeywordTarget;
  platformId: ReplicaTrackedPlatformId;
}) {
  const db = openMonitoringDatabase();
  ensureMonitoringSchema(db);

  const runId = `sync-${crypto.randomUUID()}`;
  const startedAt = new Date().toISOString();
  createSyncRunRecord(db, {
    id: runId,
    categoryId: input.categoryId,
    keywordTargetId: input.keywordTarget.id,
    platformId: input.platformId,
    status: "running",
    startedAt
  });

  try {
    const snapshot = await fetchPlatformSnapshot(input.platformId, input.keywordTarget.keyword);
    for (const item of snapshot.items) {
      upsertCollectedContent(db, mapContentItemToCollectedRecord(item, input.categoryId, input.keywordTarget.id));
    }

    finalizeSyncRunRecord(db, {
      id: runId,
      status: "success",
      finishedAt: new Date().toISOString(),
      resultCount: snapshot.items.length
    });
    updateKeywordTargetRunState(db, input.keywordTarget.id, {
      lastRunAt: new Date().toISOString(),
      lastRunStatus: "success",
      lastResultCount: snapshot.items.length
    });

    return snapshot.items;
  } catch (error) {
    finalizeSyncRunRecord(db, {
      id: runId,
      status: "failed",
      finishedAt: new Date().toISOString(),
      resultCount: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown error"
    });
    throw error;
  }
}
```

- [ ] **Step 4: Implement the API routes**

```ts
// src/app/api/content/refresh/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const keywordTarget = await getKeywordTargetById(body.keywordTargetId);
  const items = await runPlatformKeywordSync({
    categoryId: body.categoryId,
    keywordTarget,
    platformId: body.platformId
  });

  return NextResponse.json({
    categoryId: body.categoryId,
    keywordTargetId: body.keywordTargetId,
    platformId: body.platformId,
    resultCount: items.length,
    items
  });
}
```

- [ ] **Step 5: Re-run the targeted API tests until they pass**

Run:

```bash
npm run test -- src/app/api/xiaohongshu/keyword-search/route.test.ts src/app/api/content/refresh/route.test.ts src/app/api/content/list/route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitoring-sync-service.ts src/app/api/xiaohongshu src/app/api/content src/app/api/**/*.test.ts
git commit -m "feat: persist platform sync runs"
```

### Task 4: Upgrade Settings UI To Multi-Platform Keyword Targets

**Files:**
- Modify: `src/components/workbench/replica-settings-panel.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/lib/replica-workbench-data.ts`
- Modify: `src/lib/replica-workbench.ts`
- Test: `src/components/workbench/__tests__/replica-settings-panel.test.tsx`
- Test: `src/components/workbench/__tests__/monitoring-workbench-keyword-targets.test.tsx`

- [ ] **Step 1: Write the failing settings UI tests**

```ts
test("creates a keyword target with multiple bound platforms", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("tab", { name: /监控设置/i }));
  await user.type(screen.getByPlaceholderText(/输入新关键词/i), "openclaw");
  await user.click(screen.getByRole("button", { name: /小红书/i }));
  await user.click(screen.getByRole("button", { name: /公众号/i }));
  await user.click(screen.getByRole("button", { name: /新增关键词/i }));

  expect(await screen.findByText("openclaw")).toBeInTheDocument();
  expect(screen.getAllByText("小红书").length).toBeGreaterThan(0);
  expect(screen.getAllByText("公众号").length).toBeGreaterThan(0);
});

test("blocks keyword creation when no platform is selected", async () => {
  render(<ReplicaSettingsPanel {...props} />);
  await user.type(screen.getByPlaceholderText(/输入新关键词/i), "openclaw");
  await user.click(screen.getByRole("button", { name: /新增关键词/i }));

  expect(screen.getByText(/请至少选择一个平台/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted settings tests and confirm they fail**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-settings-panel.test.tsx src/components/workbench/__tests__/monitoring-workbench-keyword-targets.test.tsx
```

Expected: failures because settings still use string keywords.

- [ ] **Step 3: Implement keyword target creation and platform multi-select chips**

```tsx
// inside ReplicaSettingsPanel
const [keywordDraft, setKeywordDraft] = useState("");
const [selectedPlatforms, setSelectedPlatforms] = useState<ReplicaTrackedPlatformId[]>(["wechat"]);

<div className="replica-shell__platform-chip-list">
  {category.platforms
    .filter((platform) => platform.enabled)
    .map((platform) => (
      <button
        key={platform.id}
        type="button"
        className={selectedPlatforms.includes(platform.id) ? "is-active" : ""}
        onClick={() => toggleSelectedPlatform(platform.id)}
      >
        {platform.label}
      </button>
    ))}
</div>
```

- [ ] **Step 4: Wire save behavior to create the keyword target and immediately request refresh for the enabled platforms**

Run these side effects from `MonitoringWorkbench`:

```ts
for (const platformId of keywordTarget.enabledPlatformIds) {
  await refreshKeywordTargetForPlatform({
    categoryId: activeCategory.id,
    keywordTargetId: keywordTarget.id,
    platformId
  });
}
```

- [ ] **Step 5: Re-run the targeted settings tests until they pass**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-settings-panel.test.tsx src/components/workbench/__tests__/monitoring-workbench-keyword-targets.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/workbench/replica-settings-panel.tsx src/components/workbench/monitoring-workbench.tsx src/lib/replica-workbench-data.ts src/lib/replica-workbench.ts src/components/workbench/__tests__/replica-settings-panel.test.tsx src/components/workbench/__tests__/monitoring-workbench-keyword-targets.test.tsx
git commit -m "feat: add multi-platform keyword targets"
```

### Task 5: Wire Content Tab Quick Refresh To Current Platform Plus Keyword

**Files:**
- Modify: `src/components/workbench/replica-keyword-bar.tsx`
- Modify: `src/components/workbench/replica-platform-row.tsx`
- Modify: `src/components/workbench/replica-content-list.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Test: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
- Test: `src/components/workbench/__tests__/replica-content-list.test.tsx`

- [ ] **Step 1: Write the failing content refresh tests**

```ts
test("quick refresh updates the current platform and current keyword target only", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("button", { name: /小红书/i }));
  await user.click(screen.getByRole("button", { name: /openclaw/i }));
  await user.click(screen.getByRole("button", { name: /一键更新/i }));

  expect(fetchMock).toHaveBeenCalledWith(
    expect.stringContaining("/api/content/refresh"),
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("\"platformId\":\"xiaohongshu\"")
    })
  );
});

test("content tab prefers persisted results for the selected platform and keyword target", async () => {
  render(<MonitoringWorkbench />);

  expect(await screen.findByText(/小红书/i)).toBeInTheDocument();
  expect(screen.getByText(/OpenClaw 工作流/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the targeted content tests and confirm they fail**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-content-list.test.tsx
```

Expected: failures because refresh still targets only the old wechat keyword flow.

- [ ] **Step 3: Implement current keyword target selection and quick refresh**

```ts
const [activeKeywordTargetId, setActiveKeywordTargetId] = useState(activeCategory.keywordTargets[0]?.id ?? "");

async function handleQuickRefresh() {
  if (!activeKeywordTargetId || activePlatformId === "all") return;

  const response = await fetch("/api/content/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoryId: activeCategory.id,
      keywordTargetId: activeKeywordTargetId,
      platformId: activePlatformId
    })
  });

  const payload = await response.json();
  syncPersistedResultsIntoState(payload.items);
}
```

- [ ] **Step 4: Read persisted content when switching category, platform, or keyword target**

Use a dedicated loader:

```ts
useEffect(() => {
  if (!activeKeywordTargetId) return;
  if (activePlatformId === "all") return;
  void loadPersistedContent({
    categoryId: activeCategory.id,
    keywordTargetId: activeKeywordTargetId,
    platformId: activePlatformId
  });
}, [activeCategory.id, activeKeywordTargetId, activePlatformId]);
```

- [ ] **Step 5: Re-run the targeted content tests until they pass**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-content-list.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/workbench/replica-keyword-bar.tsx src/components/workbench/replica-platform-row.tsx src/components/workbench/replica-content-list.tsx src/components/workbench/monitoring-workbench.tsx src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-content-list.test.tsx
git commit -m "feat: refresh current platform keyword content"
```

### Task 6: Full Verification, Environment Notes, And Preview

**Files:**
- Verify current modified files only

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm run test
```

Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no lint errors.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: PASS. The known `@next/swc-win32-x64-msvc` warning may still appear on Windows and should be documented if it does not block the build.

- [ ] **Step 4: Restart local preview**

Run:

```bash
npm run start -- --hostname 127.0.0.1 --port 3000
```

Expected: local preview responds at `http://127.0.0.1:3000`.

- [ ] **Step 5: Commit the completed feature**

```bash
git add .
git commit -m "feat: persist xiaohongshu keyword monitoring"
```
