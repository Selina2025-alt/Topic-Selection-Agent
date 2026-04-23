# ContentPulse 搜索历史页面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将“搜索历史”升级为顶部一级页面，使历史关键词、历史内容和历史选题快照都能从 SQLite 稳定回看，并保持现有抓取接口和内容页主链不被破坏。

**Architecture:** 保留现有 `content / analysis / settings` 三个主视图，在顶部导航中新增 `history` 视图。服务端继续使用现有 SQLite repository，只扩展历史列表接口的筛选与预览能力；前端新增独立历史页面组件，负责列表、筛选、详情与“查看内容 / 查看选题 / 重新抓取”的页面级切换。

**Tech Stack:** Next.js App Router, React Client Components, TypeScript, node:sqlite, Vitest, Testing Library

---

### Task 1: 历史页数据接口与 repository 扩展

**Files:**
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\db\monitoring-repository.ts`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\app\api\history\route.ts`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\app\api\history\[queryId]\route.ts`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\__tests__\monitoring-repository-history.test.ts`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\app\api\history\__tests__\route.test.ts`

- [ ] **Step 1: 写失败测试，覆盖历史列表筛选与预览内容**

```ts
it("filters search queries by platform and keyword and returns preview items", () => {
  const queries = listSearchQueries(repository, "claude", {
    platform: "xiaohongshu",
    keyword: "claude"
  });

  expect(queries).toHaveLength(1);
  expect(queries[0]?.platformScope).toContain("xiaohongshu");
  expect(queries[0]?.previewItems).toHaveLength(3);
});
```

- [ ] **Step 2: 运行测试，确认正确失败**

Run: `npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts src/app/api/history/__tests__/route.test.ts`

Expected: FAIL，提示筛选参数或 `previewItems` 尚不存在

- [ ] **Step 3: 以最小实现扩展 repository 与 API**

```ts
export interface SearchQueryListFilters {
  platform?: ReplicaTrackedPlatformId | "all";
  keyword?: string;
}

export interface PersistedSearchQueryPreview extends PersistedSearchQuery {
  previewItems: ContentItem[];
}
```

```ts
export function listSearchQueries(
  repository: MonitoringRepository,
  categoryId: string,
  filters: SearchQueryListFilters = {}
): PersistedSearchQueryPreview[] {
  // 先查 search_queries，再按 queryId 查最近 3 条内容作为 previewItems
}
```

```ts
const platform = searchParams.get("platform")?.trim() ?? "";
const keyword = searchParams.get("keyword")?.trim() ?? "";
const queries = listSearchQueries(repository, categoryId, {
  platform: platform || undefined,
  keyword: keyword || undefined
});
```

- [ ] **Step 4: 再跑测试，确认通过**

Run: `npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts src/app/api/history/__tests__/route.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/monitoring-repository.ts src/app/api/history/route.ts src/app/api/history/[queryId]/route.ts src/lib/__tests__/monitoring-repository-history.test.ts src/app/api/history/__tests__/route.test.ts
git commit -m "feat: add query history list filters and previews"
```

### Task 2: 顶部导航升级为四页签并接入 history 视图

**Files:**
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\replica-workbench-data.ts`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\replica-topbar.tsx`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\monitoring-workbench.tsx`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\__tests__\replica-workbench-shell.test.tsx`

- [ ] **Step 1: 写失败测试，要求顶部出现“搜索历史”且可切换**

```tsx
it("switches top navigation to history view", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("button", { name: "搜索历史" }));

  expect(screen.getByRole("heading", { name: "搜索历史" })).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- src/components/workbench/__tests__/replica-workbench-shell.test.tsx`

Expected: FAIL，提示找不到 `搜索历史` 页签或页面标题

- [ ] **Step 3: 最小实现新增 history tab**

```ts
export type ReplicaTabId = "content" | "analysis" | "history" | "settings";
```

```tsx
const TABS = [
  { id: "content", label: "内容" },
  { id: "analysis", label: "选题分析" },
  { id: "history", label: "搜索历史" },
  { id: "settings", label: "监控设置" }
];
```

```tsx
{activeTab === "history" ? (
  <ReplicaHistoryPage ... />
) : null}
```

- [ ] **Step 4: 再跑测试，确认切换通过**

Run: `npm run test -- src/components/workbench/__tests__/replica-workbench-shell.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/replica-workbench-data.ts src/components/workbench/replica-topbar.tsx src/components/workbench/monitoring-workbench.tsx src/components/workbench/__tests__/replica-workbench-shell.test.tsx
git commit -m "feat: add search history tab to workbench"
```

### Task 3: 独立搜索历史页面组件

**Files:**
- Create: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\replica-history-page.tsx`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\monitoring-workbench.tsx`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\app\globals.css`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\__tests__\replica-history-page.test.tsx`

- [ ] **Step 1: 写失败测试，覆盖平台筛选、关键词筛选和历史卡片预览**

```tsx
it("filters history records by platform and keyword", async () => {
  render(
    <ReplicaHistoryPage
      queries={queries}
      selectedQueryId="query-1"
      detail={detail}
      onSelectQuery={vi.fn()}
      onPlatformFilterChange={vi.fn()}
      onKeywordFilterChange={vi.fn()}
      ...
    />
  );

  expect(screen.getByText("共 2 条记录")).toBeInTheDocument();
  expect(screen.getByText("claude code")).toBeInTheDocument();
  expect(screen.getByText("18 条结果")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- src/components/workbench/__tests__/replica-history-page.test.tsx`

Expected: FAIL，提示组件不存在

- [ ] **Step 3: 最小实现历史页面组件**

```tsx
export function ReplicaHistoryPage(props: ReplicaHistoryPageProps) {
  return (
    <section className="replica-shell__history-page">
      <header className="replica-shell__history-toolbar">
        <label>
          <span>平台</span>
          <select ... />
        </label>
        <label>
          <span>关键词</span>
          <input ... />
        </label>
        <span>共 {props.filteredCount} 条记录</span>
      </header>

      <div className="replica-shell__history-page-body">
        <div className="replica-shell__history-records">...</div>
        <aside className="replica-shell__history-detail">...</aside>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 再跑测试，确认页面渲染通过**

Run: `npm run test -- src/components/workbench/__tests__/replica-history-page.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/replica-history-page.tsx src/components/workbench/monitoring-workbench.tsx src/app/globals.css src/components/workbench/__tests__/replica-history-page.test.tsx
git commit -m "feat: add dedicated search history page"
```

### Task 4: 将历史内容与历史选题回填到现有内容页/分析页

**Files:**
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\monitoring-workbench.tsx`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\replica-workbench.ts`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\__tests__\replica-workbench-fetch.test.tsx`

- [ ] **Step 1: 写失败测试，验证“查看内容 / 查看选题 / 重新抓取”**

```tsx
it("restores archived content from a history query without refetching", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("button", { name: "搜索历史" }));
  await user.click(screen.getByRole("button", { name: "查看内容" }));

  expect(screen.getByRole("button", { name: "内容" })).toHaveClass("is-active");
  expect(screen.getByText("接口原始顺序已保留")).toBeInTheDocument();
});
```

```tsx
it("restores archived analysis from a history query", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("button", { name: "搜索历史" }));
  await user.click(screen.getByRole("button", { name: "查看选题" }));

  expect(screen.getByRole("button", { name: "选题分析" })).toHaveClass("is-active");
  expect(screen.getByText("今日热点摘要")).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

Expected: FAIL，提示没有 history 页面动作或不会切换到对应视图

- [ ] **Step 3: 最小实现历史回填逻辑**

```tsx
function handleViewArchivedContent(queryId: string) {
  const detail = historyDetailsById[queryId];
  if (!detail) return;
  applyHistoricalContent(detail);
  setActiveTab("content");
}

function handleViewArchivedAnalysis(queryId: string) {
  const detail = historyDetailsById[queryId];
  if (!detail?.analysis) return;
  applyHistoricalAnalysis(detail);
  setActiveTab("analysis");
}
```

```tsx
function handleRerunQuery(queryId: string) {
  const query = historyQueries.find((entry) => entry.id === queryId);
  if (!query) return;
  // 使用历史关键词和平台重新走现有 refreshKeywordTarget
}
```

- [ ] **Step 4: 再跑测试，确认回填与重抓通过**

Run: `npm run test -- src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/lib/replica-workbench.ts src/components/workbench/__tests__/replica-workbench-fetch.test.tsx
git commit -m "feat: restore archived content and analysis from history page"
```

### Task 5: 历史页的持久化验收与兼容收尾

**Files:**
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\monitoring-workbench.tsx`
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\search-history.ts`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\__tests__\replica-history-page.test.tsx`
- Test: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\__tests__\history-archive.test.ts`

- [ ] **Step 1: 写失败测试，验证历史页优先读 SQLite，而不是只靠 localStorage**

```ts
it("prefers persisted query history over localStorage fallback", async () => {
  const response = await GET(
    new Request("http://localhost/api/history?categoryId=claude")
  );
  const payload = await response.json();

  expect(payload.queries[0]).toHaveProperty("id");
  expect(payload.queries[0]).toHaveProperty("cappedCount");
});
```

- [ ] **Step 2: 运行测试，确认失败或暴露旧回退逻辑**

Run: `npm run test -- src/components/workbench/__tests__/replica-history-page.test.tsx src/lib/__tests__/history-archive.test.ts`

Expected: FAIL，提示历史页仍依赖旧回退或缺少统一来源

- [ ] **Step 3: 最小实现收尾**

```ts
// monitoring-workbench.tsx
// history 页面默认读取 API 返回的 SQLite 结果，localStorage 仅在接口不可用时兜底
```

```ts
// search-history.ts
// 保留兼容函数，但新增注释和更明确的 fallback 定位
```

- [ ] **Step 4: 运行相关测试确认通过**

Run: `npm run test -- src/components/workbench/__tests__/replica-history-page.test.tsx src/lib/__tests__/history-archive.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/lib/search-history.ts src/components/workbench/__tests__/replica-history-page.test.tsx src/lib/__tests__/history-archive.test.ts
git commit -m "refactor: make sqlite the primary source for search history page"
```

### Task 6: 全量验证

**Files:**
- Modify: `C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\docs\superpowers\plans\2026-04-01-search-history-page.md`

- [ ] **Step 1: 运行针对性测试**

Run: `npm run test -- src/lib/__tests__/monitoring-repository-history.test.ts src/app/api/history/__tests__/route.test.ts src/components/workbench/__tests__/replica-history-page.test.tsx src/components/workbench/__tests__/replica-workbench-fetch.test.tsx`

Expected: PASS

- [ ] **Step 2: 运行完整测试**

Run: `npm run test`

Expected: PASS，0 failures

- [ ] **Step 3: 运行 lint**

Run: `npm run lint`

Expected: PASS，0 errors

- [ ] **Step 4: 运行 build**

Run: `npm run build`

Expected: PASS，允许存在既有的非阻塞环境 warning，但不能有 build error

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add persistent search history page"
```
