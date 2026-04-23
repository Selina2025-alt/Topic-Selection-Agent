# 内容监控截图复刻版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首页重构成截图式内容监控页面，并把公众号接口安全挂接到“一键更新”流程上，同时保证接口失败时页面仍可用。

**Architecture:** 用一组更聚焦的 replica 组件替换当前复杂工作台首页结构。页面默认依赖本地 mock 数据渲染，点击“一键更新”时再调用现有 Next 服务端代理获取公众号文章，成功则覆盖内容池，失败则保留 mock 并显示状态。

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library, Next API routes

---

### Task 1: 建立截图式首页数据层

**Files:**
- Create: `src/lib/replica-workbench-data.ts`
- Create: `src/lib/replica-workbench.ts`
- Test: `src/lib/__tests__/replica-workbench.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import {
  buildReplicaArticles,
  filterReplicaArticles
} from "@/lib/replica-workbench";
import { replicaCategories } from "@/lib/replica-workbench-data";

describe("replica workbench selectors", () => {
  it("builds screenshot-style articles from the active keyword", () => {
    const articles = buildReplicaArticles(replicaCategories[0], "claude code");
    expect(articles).toHaveLength(18);
    expect(articles[0]?.title).toContain("Claude Code");
  });

  it("filters by platform and date", () => {
    const articles = buildReplicaArticles(replicaCategories[0], "claude code");
    const filtered = filterReplicaArticles(articles, "wechat", "d25");
    expect(filtered.every((item) => item.platformId === "wechat")).toBe(true);
    expect(filtered.every((item) => item.dateSlotId === "d25")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/__tests__/replica-workbench.test.ts`
Expected: FAIL with module not found or exported symbol not found

- [ ] **Step 3: Write minimal implementation**

```ts
export interface ReplicaArticle { /* screenshot article fields */ }
export interface ReplicaCategory { /* sidebar category fields */ }

export const replicaCategories = [/* screenshot categories */];

export function buildReplicaArticles(category: ReplicaCategory, keyword: string) {
  // expand article templates until 18 rows
}

export function filterReplicaArticles(
  articles: ReplicaArticle[],
  platformId: string,
  dateSlotId: string
) {
  return articles.filter((item) => {
    const platformMatches = platformId === "all" || item.platformId === platformId;
    return platformMatches && item.dateSlotId === dateSlotId;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/replica-workbench.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/replica-workbench-data.ts src/lib/replica-workbench.ts src/lib/__tests__/replica-workbench.test.ts
git commit -m "feat: add screenshot workbench data layer"
```

### Task 2: 重建截图式首页组件

**Files:**
- Create: `src/components/workbench/replica-sidebar.tsx`
- Create: `src/components/workbench/replica-topbar.tsx`
- Create: `src/components/workbench/replica-keyword-bar.tsx`
- Create: `src/components/workbench/replica-platform-row.tsx`
- Create: `src/components/workbench/replica-date-row.tsx`
- Create: `src/components/workbench/replica-content-list.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/workbench/__tests__/replica-workbench-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica workbench shell", () => {
  it("renders the screenshot-first homepage shell", () => {
    render(<MonitoringWorkbench />);

    expect(screen.getByText("ContentPulse")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "⟳ 一键更新" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "公众号" })).toBeInTheDocument();
    expect(screen.getByText(/\[claude code\]/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/workbench/__tests__/replica-workbench-shell.test.tsx`
Expected: FAIL because the new shell does not exist yet

- [ ] **Step 3: Write minimal implementation**

```tsx
export function MonitoringWorkbench() {
  return (
    <section className="replica-shell">
      <ReplicaSidebar ... />
      <main className="replica-shell__main">
        <ReplicaTopbar ... />
        <div className="replica-shell__workspace">
          <ReplicaKeywordBar ... />
          <ReplicaPlatformRow ... />
          <ReplicaDateRow ... />
          <ReplicaContentList ... />
        </div>
      </main>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/workbench/__tests__/replica-workbench-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/replica-*.tsx src/components/workbench/monitoring-workbench.tsx src/app/globals.css src/components/workbench/__tests__/replica-workbench-shell.test.tsx
git commit -m "feat: rebuild homepage as screenshot workbench"
```

### Task 3: 接入关键词更新和接口回退

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/components/workbench/replica-keyword-bar.tsx`
- Modify: `src/components/workbench/replica-content-list.tsx`
- Test: `src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica workbench fetch", () => {
  it("uses api results after clicking update", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [{
          id: "wechat-1",
          title: "Claude Code 新样本",
          platformId: "wechat",
          author: "公众号作者",
          date: "2026-03-31",
          publishedAt: "2026-03-31 09:00",
          heatScore: 88,
          metrics: { likes: "12", comments: "3", saves: "2300阅读" },
          matchedTargets: ["claude code"],
          aiSummary: "summary",
          linkedTopicIds: [],
          includedInDailyReport: false,
          inTopicPool: false
        }]
      })
    }));

    render(<MonitoringWorkbench />);
    await user.clear(screen.getByLabelText("选择关键词"));
    await user.type(screen.getByLabelText("选择关键词"), "claude code");
    await user.click(screen.getByRole("button", { name: "⟳ 一键更新" }));

    await screen.findByText("Claude Code 新样本");
  });

  it("keeps mock content and surfaces a status message when the api fails", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Wechat monitor request failed with status 403: 令牌限额已用尽 (QUOTA_EXCEEDED)" })
    }));

    render(<MonitoringWorkbench />);
    await user.click(screen.getByRole("button", { name: "⟳ 一键更新" }));

    await waitFor(() => {
      expect(screen.getByText(/令牌限额已用尽/)).toBeInTheDocument();
    });
    expect(screen.getAllByRole("button").some((node) => node.textContent?.includes("热度"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
Expected: FAIL because update flow is still mock-only

- [ ] **Step 3: Write minimal implementation**

```tsx
async function handleUpdateKeyword() {
  setIsUpdating(true);
  setStatusMessage("");

  try {
    const response = await fetch(`/api/wechat/keyword-search?keyword=${encodeURIComponent(keyword)}&period=7&page=1`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "公众号接口暂时不可用");
    }

    setRemoteArticles(mapWechatItemsToReplicaArticles(payload.items, keyword));
  } catch (error) {
    setRemoteArticles([]);
    setStatusMessage(error instanceof Error ? error.message : "公众号接口暂时不可用");
  } finally {
    setIsUpdating(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/components/workbench/replica-keyword-bar.tsx src/components/workbench/replica-content-list.tsx src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
git commit -m "feat: connect screenshot homepage update flow to wechat proxy"
```

### Task 4: 回归验证

**Files:**
- Modify: none unless verification finds issues

- [ ] **Step 1: Run full test suite**

Run: `npm run test`
Expected: all tests pass

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no lint errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: build succeeds, allowing the known SWC Win32 warning if it still appears

- [ ] **Step 4: Start local preview and probe homepage**

Run: `npm run dev` or `npm run start -- --hostname 127.0.0.1 --port 3000`
Expected: homepage opens and screenshot-style shell renders

- [ ] **Step 5: Commit final polish**

```bash
git add .
git commit -m "feat: ship screenshot-style monitoring homepage"
```
