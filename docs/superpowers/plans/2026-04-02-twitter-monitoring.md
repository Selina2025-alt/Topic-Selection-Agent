# ContentPulse Twitter/X Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Twitter/X keyword monitoring to ContentPulse so users can bind keywords to Twitter/X, refresh live results, persist them to SQLite, and review them from content and search history pages without breaking the existing Wechat/Xiaohongshu flows.

**Architecture:** Keep the current multi-platform monitoring shell intact and extend the existing service-side proxy architecture with a dedicated `twitter-monitor` module backed by X API v2 recent search using a server-side bearer token. Reuse the existing sync service, SQLite persistence, content list route, and search history archive so Twitter/X becomes a third real platform instead of a separate one-off path.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Node `node:sqlite`, server-side fetch, X API v2 recent search, existing SQLite repository and monitoring sync services

---

### Task 1: Add Twitter/X Monitor Service And Mapping Tests

**Files:**
- Create: `src/lib/twitter-monitor.ts`
- Create: `src/lib/__tests__/twitter-monitor.test.ts`
- Modify: `src/lib/replica-workbench-data.ts`
- Modify: `.env.example`

- [ ] **Step 1: Write the failing Twitter monitor tests**

```ts
import { describe, expect, test, vi } from "vitest";

import { searchTwitterPostsSnapshotByKeyword } from "@/lib/twitter-monitor";

const mockPayload = {
  data: [
    {
      id: "1901",
      text: "Claude Code workflow note",
      author_id: "u-1",
      created_at: "2026-04-02T10:00:00.000Z",
      public_metrics: {
        like_count: 21,
        reply_count: 4,
        retweet_count: 2
      }
    },
    {
      id: "1900",
      text: "Older Claude Code discussion",
      author_id: "u-2",
      created_at: "2026-04-01T09:00:00.000Z",
      public_metrics: {
        like_count: 8,
        reply_count: 1,
        retweet_count: 0
      }
    }
  ],
  includes: {
    users: [
      {
        id: "u-1",
        username: "alice_dev",
        name: "Alice",
        profile_image_url: "https://example.com/alice.png"
      },
      {
        id: "u-2",
        username: "bob_ops",
        name: "Bob",
        profile_image_url: "https://example.com/bob.png"
      }
    ]
  }
};

describe("searchTwitterPostsSnapshotByKeyword", () => {
  test("maps recent search results into ContentItem snapshots", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockPayload
      })
    );

    process.env.TWITTER_BEARER_TOKEN = "test-token";

    const snapshot = await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(snapshot.items).toHaveLength(2);
    expect(snapshot.items[0]).toEqual(
      expect.objectContaining({
        platformId: "twitter",
        author: "@alice_dev",
        authorName: "Alice",
        articleUrl: "https://x.com/alice_dev/status/1901",
        likeCount: 21,
        sourceUrl: "https://x.com/alice_dev/status/1901"
      })
    );
  });

  test("sorts mapped items by publish timestamp descending", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          ...mockPayload,
          data: [...mockPayload.data].reverse()
        })
      })
    );

    process.env.TWITTER_BEARER_TOKEN = "test-token";

    const snapshot = await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(snapshot.items.map((item) => item.id)).toEqual([
      "twitter-claude code-1901",
      "twitter-claude code-1900"
    ]);
    expect(snapshot.rawItems[0].rawOrderIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run the targeted tests and verify they fail**

Run:

```bash
npm run test -- src/lib/__tests__/twitter-monitor.test.ts
```

Expected: FAIL because `twitter-monitor.ts` does not exist and `twitter` is not yet a fully supported monitored platform.

- [ ] **Step 3: Implement the Twitter/X monitor module**

```ts
// src/lib/twitter-monitor.ts
import type { ContentItem, TimeOfDay } from "@/lib/types";

const TWITTER_RECENT_SEARCH_ENDPOINT = "https://api.x.com/2/tweets/search/recent";

interface TwitterRecentSearchResponse {
  data?: Array<{
    id: string;
    text: string;
    author_id?: string;
    created_at?: string;
    public_metrics?: {
      like_count?: number;
      reply_count?: number;
      retweet_count?: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      username?: string;
      name?: string;
      profile_image_url?: string;
    }>;
  };
  errors?: Array<{ detail?: string; title?: string }>;
}

export interface TwitterPostsSnapshot {
  rawItems: ContentItem[];
  items: ContentItem[];
}

function inferTimeOfDay(dateText: string): TimeOfDay {
  const hour = new Date(dateText).getHours();
  if (hour < 12) return "涓婂崍" as TimeOfDay;
  if (hour < 18) return "涓嬪崍" as TimeOfDay;
  return "鏅氫笂" as TimeOfDay;
}

function buildHeatScore(likes: number, replies: number, reposts: number) {
  return Math.max(55, Math.min(99, Math.round(likes / 4 + replies * 2 + reposts * 3)));
}

export async function searchTwitterPostsSnapshotByKeyword(keyword: string): Promise<TwitterPostsSnapshot> {
  const token = process.env.TWITTER_BEARER_TOKEN;
  if (!token) {
    throw new Error("Missing TWITTER_BEARER_TOKEN");
  }

  const url = new URL(TWITTER_RECENT_SEARCH_ENDPOINT);
  url.searchParams.set("query", keyword);
  url.searchParams.set("max_results", "20");
  url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "username,name,profile_image_url");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  const payload = (await response.json()) as TwitterRecentSearchResponse;
  if (!response.ok) {
    const detail = payload.errors?.[0]?.detail || payload.errors?.[0]?.title || "Twitter request failed";
    throw new Error(`Twitter monitor request failed with status ${response.status}: ${detail}`);
  }

  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  const rawItems = (payload.data ?? []).map((tweet, index) => {
    const user = tweet.author_id ? users.get(tweet.author_id) : undefined;
    const likeCount = tweet.public_metrics?.like_count ?? 0;
    const replyCount = tweet.public_metrics?.reply_count ?? 0;
    const repostCount = tweet.public_metrics?.retweet_count ?? 0;
    const articleUrl = user?.username ? `https://x.com/${user.username}/status/${tweet.id}` : "";
    const publishedAt = tweet.created_at ?? "";
    const publishTimestamp = publishedAt ? Date.parse(publishedAt) : 0;

    return {
      id: `twitter-${keyword}-${tweet.id}`,
      date: publishedAt.slice(0, 10),
      timeOfDay: inferTimeOfDay(publishedAt),
      platformId: "twitter",
      title: tweet.text.slice(0, 80),
      summary: tweet.text,
      author: user?.username ? `@${user.username}` : "@unknown",
      authorName: user?.name ?? user?.username ?? "Unknown",
      authorId: tweet.author_id,
      publishedAt,
      publishTime: publishedAt,
      publishTimestamp,
      heatScore: buildHeatScore(likeCount, replyCount, repostCount),
      metrics: {
        likes: `${likeCount}`,
        comments: `${replyCount}`,
        saves: `${repostCount}`
      },
      likeCount,
      matchedTargets: [keyword],
      aiSummary: tweet.text,
      keyword,
      avatar: user?.profile_image_url,
      linkedTopicIds: [],
      includedInDailyReport: false,
      inTopicPool: false,
      articleUrl,
      sourceUrl: articleUrl,
      rawOrderIndex: index
    } satisfies ContentItem;
  });

  const items = [...rawItems].sort((left, right) => (right.publishTimestamp ?? 0) - (left.publishTimestamp ?? 0));
  return { rawItems, items };
}
```

- [ ] **Step 4: Extend platform definitions and environment docs**

```ts
// src/lib/replica-workbench-data.ts
export type ReplicaPlatformId =
  | "all"
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "bilibili"
  | "twitter"
  | "wechat"
  | "zhihu";

// .env.example
WECHAT_MONITOR_TOKEN=replace-with-your-token
XIAOHONGSHU_MONITOR_TOKEN=replace-with-your-token
TWITTER_BEARER_TOKEN=replace-with-your-token
```

- [ ] **Step 5: Re-run the targeted tests until they pass**

Run:

```bash
npm run test -- src/lib/__tests__/twitter-monitor.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/twitter-monitor.ts src/lib/__tests__/twitter-monitor.test.ts src/lib/replica-workbench-data.ts .env.example
git commit -m "feat: add twitter monitor service"
```

### Task 2: Extend Unified Sync And Content API Support For Twitter/X

**Files:**
- Modify: `src/lib/monitoring-sync-service.ts`
- Modify: `src/app/api/content/refresh/route.ts`
- Modify: `src/app/api/content/list/route.ts`
- Create: `src/app/api/twitter/keyword-search/route.ts`
- Create: `src/app/api/twitter/keyword-search/__tests__/route.test.ts`
- Modify: `src/lib/__tests__/monitoring-sync-service.test.ts`
- Modify: `src/app/api/content/refresh/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing sync and route tests**

```ts
import { expect, test, vi } from "vitest";

import { refreshKeywordTargetPlatform } from "@/lib/monitoring-sync-service";
import { createInMemoryDatabase, ensureMonitoringSchema } from "@/lib/db/database";
import { createMonitoringRepository } from "@/lib/db/monitoring-repository";

test("refreshKeywordTargetPlatform supports twitter and caps to 20 items", async () => {
  const repository = createMonitoringRepository(createInMemoryDatabase());
  ensureMonitoringSchema(repository.database);

  const snapshot = await refreshKeywordTargetPlatform({
    repository,
    categoryId: "claude",
    keywordTarget: {
      id: "kw-twitter",
      categoryId: "claude",
      keyword: "claude code",
      platformIds: ["twitter"],
      createdAt: "2026-04-02T10:00:00.000Z",
      lastRunAt: null,
      lastRunStatus: "idle",
      lastResultCount: 0
    },
    platformId: "twitter",
    twitterSearch: vi.fn().mockResolvedValue({
      rawItems: Array.from({ length: 22 }, (_, index) => ({
        id: `t-${index}`,
        platformId: "twitter",
        date: "2026-04-02",
        timeOfDay: "涓婂崍",
        title: `tweet-${index}`,
        author: "@tester",
        publishedAt: "2026-04-02T10:00:00.000Z",
        heatScore: 60,
        metrics: { likes: "1", comments: "0", saves: "0" },
        matchedTargets: ["claude code"],
        aiSummary: "tweet",
        linkedTopicIds: [],
        includedInDailyReport: false,
        inTopicPool: false,
        publishTimestamp: Date.now() - index,
        rawOrderIndex: index
      })),
      items: []
    })
  });

  expect(snapshot.cappedCount).toBe(20);
  expect(snapshot.items.every((item) => item.platformId === "twitter")).toBe(true);
});
```

- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run:

```bash
npm run test -- src/lib/__tests__/monitoring-sync-service.test.ts src/app/api/content/refresh/__tests__/route.test.ts src/app/api/twitter/keyword-search/__tests__/route.test.ts
```

Expected: FAIL because `twitter` is not supported by the sync service or refresh route.

- [ ] **Step 3: Extend the sync service to support Twitter/X**

```ts
// src/lib/monitoring-sync-service.ts
import {
  searchTwitterPostsSnapshotByKeyword,
  type TwitterPostsSnapshot
} from "@/lib/twitter-monitor";

export type SyncablePlatformId = "wechat" | "xiaohongshu" | "twitter";

interface RefreshKeywordTargetPlatformInput {
  // ...
  twitterSearch?: typeof searchTwitterPostsSnapshotByKeyword;
}

type PlatformSearchSnapshot =
  | WechatArticlesSnapshot
  | XiaohongshuNotesSnapshot
  | TwitterPostsSnapshot;

async function runPlatformSearch(
  platformId: SyncablePlatformId,
  keyword: string,
  services: {
    wechatSearch: typeof searchWechatArticlesSnapshotByKeyword;
    xiaohongshuSearch: typeof searchXiaohongshuNotesSnapshotByKeyword;
    twitterSearch: typeof searchTwitterPostsSnapshotByKeyword;
  }
) {
  if (platformId === "twitter") {
    return services.twitterSearch(keyword);
  }
  // existing wechat/xiaohongshu branches stay unchanged
}
```

- [ ] **Step 4: Extend the API routes without changing existing request contracts**

```ts
// src/app/api/content/refresh/route.ts
if (platformId !== "wechat" && platformId !== "xiaohongshu" && platformId !== "twitter") {
  return NextResponse.json(
    { error: "Only wechat, xiaohongshu, and twitter refresh are supported right now", items: [] },
    { status: 400 }
  );
}

// src/app/api/twitter/keyword-search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchTwitterPostsSnapshotByKeyword } from "@/lib/twitter-monitor";

export async function GET(request: NextRequest) {
  const keyword = new URL(request.url).searchParams.get("keyword")?.trim() ?? "";
  if (!keyword) {
    return NextResponse.json({ error: "keyword is required", items: [] }, { status: 400 });
  }

  try {
    const snapshot = await searchTwitterPostsSnapshotByKeyword(keyword);
    return NextResponse.json({
      items: snapshot.items,
      rawItems: snapshot.rawItems,
      meta: {
        source: "twitter",
        sortedBy: "publish_time_desc",
        persisted: false,
        fetchedCount: snapshot.items.length,
        cappedCount: snapshot.items.length
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message, items: [], rawItems: [], meta: null }, { status: 502 });
  }
}
```

- [ ] **Step 5: Re-run the targeted tests until they pass**

Run:

```bash
npm run test -- src/lib/__tests__/monitoring-sync-service.test.ts src/app/api/content/refresh/__tests__/route.test.ts src/app/api/twitter/keyword-search/__tests__/route.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/monitoring-sync-service.ts src/app/api/content/refresh/route.ts src/app/api/content/list/route.ts src/app/api/twitter/keyword-search/route.ts src/app/api/twitter/keyword-search/__tests__/route.test.ts src/lib/__tests__/monitoring-sync-service.test.ts src/app/api/content/refresh/__tests__/route.test.ts
git commit -m "feat: support twitter sync routes"
```

### Task 3: Wire Twitter/X Into Settings, Content, And Search History UI

**Files:**
- Modify: `src/components/workbench/replica-settings-panel.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/components/workbench/replica-content-list.tsx`
- Modify: `src/components/workbench/replica-history-page.tsx`
- Modify: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
- Modify: `src/components/workbench/__tests__/replica-history-page.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("Twitter/X integration", () => {
  test("allows adding twitter to a keyword target and refreshing twitter content", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn());

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("tab", { name: "监控设置" }));
    await user.click(screen.getByTestId("keyword-platform-twitter"));
    await user.type(screen.getByPlaceholderText("输入新的监控关键词"), "claude code");
    await user.click(screen.getByRole("button", { name: "新增关键词" }));

    await user.click(screen.getByRole("tab", { name: "内容" }));
    await user.click(screen.getByRole("button", { name: "Twitter/X" }));
    await user.click(screen.getByRole("button", { name: "一键更新" }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/content/refresh"),
        expect.any(Object)
      );
    });
  });
});
```

- [ ] **Step 2: Run the targeted UI tests and confirm they fail**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-history-page.test.tsx
```

Expected: FAIL because the settings page and content page do not yet treat Twitter/X as a real refreshable platform.

- [ ] **Step 3: Extend the workbench state and UI bindings**

```tsx
// src/components/workbench/monitoring-workbench.tsx
const REFRESHABLE_PLATFORMS = new Set(["wechat", "xiaohongshu", "twitter"]);

function isRefreshablePlatform(platformId: ReplicaTrackedPlatformId) {
  return REFRESHABLE_PLATFORMS.has(platformId);
}

// in refresh handler
const nextPlatformIds =
  activePlatformId === "all"
    ? keywordTarget.platformIds.filter(isRefreshablePlatform)
    : isRefreshablePlatform(activePlatformId)
      ? [activePlatformId]
      : [];

// in content list source badge / detail rendering
if (item.platformId === "twitter") {
  return {
    label: "Twitter/X",
    actionLabel: "查看推文原文"
  };
}
```

- [ ] **Step 4: Make search history display Twitter/X records with the same archive model**

```tsx
// src/components/workbench/replica-history-page.tsx
const platformLabelMap = {
  wechat: "公众号",
  xiaohongshu: "小红书",
  twitter: "Twitter/X"
};

// keep history collapsed by default, but show twitter records in the top-level list
{queryItems.map((query) => (
  <button key={query.id} type="button" onClick={() => onSelectQuery(query.id)}>
    <span>{platformLabelMap[query.platformScope] ?? query.platformScope}</span>
    <strong>{query.keyword}</strong>
    <span>{query.cappedCount} 条结果</span>
  </button>
))}
```

- [ ] **Step 5: Re-run the targeted UI tests until they pass**

Run:

```bash
npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-history-page.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/workbench/replica-settings-panel.tsx src/components/workbench/monitoring-workbench.tsx src/components/workbench/replica-content-list.tsx src/components/workbench/replica-history-page.tsx src/components/workbench/__tests__/replica-workbench-fetch.test.tsx src/components/workbench/__tests__/replica-history-page.test.tsx
git commit -m "feat: wire twitter into workbench ui"
```

### Task 4: Full Regression Verification And Documentation Refresh

**Files:**
- Modify: `docs/superpowers/specs/2026-04-02-twitter-monitoring-design.md`
- Modify: `项目管理/ContentPulse/Progress Log.md`
- Modify: `项目管理/ContentPulse/Backlog.md`

- [ ] **Step 1: Add the final regression tests if coverage gaps remain**

```ts
// extend any remaining route or monitor tests for:
// - missing TWITTER_BEARER_TOKEN
// - 429 / auth error propagation
// - empty-result twitter history rendering
```

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected:

- all tests pass
- lint passes
- build passes with only the known non-blocking SQLite / Next warnings

- [ ] **Step 3: Refresh docs to reflect the new third platform**

```md
## 2026-04-02

- Added Twitter/X keyword monitoring with server-side bearer token auth
- Wired Twitter/X into SQLite persistence and search history archives
- Kept existing Wechat and Xiaohongshu flows unchanged
```

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-02-twitter-monitoring-design.md 项目管理/ContentPulse/Progress\ Log.md 项目管理/ContentPulse/Backlog.md
git commit -m "docs: record twitter monitoring support"
```

## Self-Review

- Spec coverage: the plan covers X API auth, service-side fetch, unified sync integration, SQLite reuse, content tab refresh, settings-page platform binding, and search history playback. No spec section is left without a concrete task.
- Placeholder scan: the plan avoids `TODO` / `TBD` placeholders and includes concrete file paths, test commands, and code blocks for each implementation step.
- Type consistency: the plan consistently uses `twitter` as the platform id, `TWITTER_BEARER_TOKEN` as the env var, and `searchTwitterPostsSnapshotByKeyword` as the monitor entrypoint across service, route, and UI tasks.
