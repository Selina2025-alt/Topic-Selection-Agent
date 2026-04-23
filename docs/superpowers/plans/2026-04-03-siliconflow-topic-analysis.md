# SiliconFlow Topic Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current template-only topic analysis with a real two-stage SiliconFlow analysis pipeline, add per-article evidence persistence, support manual "analyze now" for a keyword, and add a global scheduled daily analysis job.

**Architecture:** Keep the existing content collection pipeline and analysis UI shell, but introduce a server-side SiliconFlow client, a dedicated AI analysis service, and an orchestration layer that performs "refresh then analyze". Persist the final reports in the existing analysis tables, add a new evidence table for stage-one article extraction, and store global schedule settings so both the page button and the Windows scheduled task reuse the same orchestration flow.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Node `fetch`, Node `node:sqlite`, Windows Task Scheduler, SiliconFlow OpenAI-compatible `chat/completions` API.

---

## File Structure

### Existing files to modify

- `src/lib/types.ts`
  - Extend analysis types for evidence items and global analysis settings.
- `src/lib/db/schema.ts`
  - Add `analysis_evidence_items` and `analysis_settings` tables plus indexes.
- `src/lib/db/monitoring-repository.ts`
  - Add repository methods for analysis settings and evidence item persistence.
- `src/lib/analysis-report.ts`
  - Convert from template generation to adapting persisted AI reports and fallback behavior.
- `src/lib/history-archive.ts`
  - Include evidence-aware archive shaping where needed.
- `src/app/api/content/refresh/route.ts`
  - Stop directly owning final analysis generation; hand off to orchestration where appropriate.
- `src/components/workbench/replica-analysis-panel.tsx`
  - Add "立即分析" action, loading/error states, and evidence detail surface.
- `src/components/workbench/settings-tab.tsx`
  - Add global analysis settings UI and save action.
- `src/components/workbench/monitoring-workbench.tsx`
  - Wire manual analysis action, latest report refresh, and global settings loading.
- `.env.example`
  - Add SiliconFlow environment variables.

### New files to create

- `src/lib/siliconflow-client.ts`
  - Low-level OpenAI-compatible API client.
- `src/lib/ai-analysis-service.ts`
  - Stage A evidence extraction and Stage B report synthesis.
- `src/lib/analysis-orchestrator.ts`
  - Shared "refresh then analyze" workflow for manual and scheduled modes.
- `src/lib/db/analysis-settings-repository.ts`
  - Focused helpers for global analysis settings storage/loading.
- `src/app/api/analysis/run/route.ts`
  - Manual run endpoint.
- `src/app/api/analysis/reports/route.ts`
  - Report list endpoint.
- `src/app/api/analysis/report/[snapshotId]/route.ts`
  - Single report detail endpoint with evidence.
- `scripts/run-daily-analysis.ts`
  - Scheduled analysis runner.
- `scripts/register-analysis-task.ts`
  - Windows task registration/update helper.

### Test files to create or expand

- `src/lib/__tests__/siliconflow-client.test.ts`
- `src/lib/__tests__/ai-analysis-service.test.ts`
- `src/lib/__tests__/analysis-orchestrator.test.ts`
- `src/lib/__tests__/monitoring-repository-analysis-settings.test.ts`
- `src/app/api/analysis/run/__tests__/route.test.ts`
- `src/app/api/analysis/reports/__tests__/route.test.ts`
- `src/app/api/analysis/report/[snapshotId]/__tests__/route.test.ts`
- `src/components/workbench/__tests__/replica-analysis-panel.test.tsx`
- `src/components/workbench/__tests__/replica-workbench-analysis.test.tsx`

---

### Task 1: Persist analysis settings and evidence storage

**Files:**
- Create: `src/lib/db/analysis-settings-repository.ts`
- Modify: `src/lib/types.ts`
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/db/monitoring-repository.ts`
- Test: `src/lib/__tests__/monitoring-repository-analysis-settings.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
import { beforeEach, describe, expect, it } from "vitest";

import {
  createTestRepository,
  resetTestDatabase
} from "@/lib/__tests__/db-test-utils";
import {
  getGlobalAnalysisSettings,
  saveGlobalAnalysisSettings,
  upsertAnalysisEvidenceItems,
  getAnalysisEvidenceItemsBySnapshotId
} from "@/lib/db/monitoring-repository";

describe("analysis settings and evidence persistence", () => {
  beforeEach(() => {
    resetTestDatabase();
  });

  it("stores and reloads the global analysis schedule", () => {
    const repository = createTestRepository();

    saveGlobalAnalysisSettings(repository, {
      enabled: true,
      time: "09:30",
      provider: "SiliconFlow",
      model: "zai-org/GLM-5"
    });

    expect(getGlobalAnalysisSettings(repository)).toEqual({
      enabled: true,
      time: "09:30",
      provider: "SiliconFlow",
      model: "zai-org/GLM-5"
    });
  });

  it("stores and reads stage-one evidence items by snapshot id", () => {
    const repository = createTestRepository();

    upsertAnalysisEvidenceItems(repository, {
      snapshotId: "snapshot-1",
      items: [
        {
          id: "evidence-1",
          snapshotId: "snapshot-1",
          contentId: "content-1",
          keyword: "claude code",
          platformId: "wechat",
          title: "Article title",
          briefSummary: "Short summary",
          keyFacts: ["fact"],
          keywords: ["Claude Code"],
          highlights: ["highlight"],
          attentionSignals: ["signal"],
          topicAngles: ["angle"],
          createdAt: "2026-04-03T08:00:00.000Z"
        }
      ]
    });

    expect(getAnalysisEvidenceItemsBySnapshotId(repository, "snapshot-1")).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/monitoring-repository-analysis-settings.test.ts`

Expected:
- FAIL because the repository functions and new types do not exist yet

- [ ] **Step 3: Add the new types and schema**

```ts
export interface GlobalAnalysisSettings {
  enabled: boolean;
  time: string;
  provider: string;
  model: string;
}

export interface AnalysisEvidenceItem {
  id: string;
  snapshotId: string;
  contentId: string;
  keyword: string;
  platformId: NonAggregatePlatformId;
  title: string;
  briefSummary: string;
  keyFacts: string[];
  keywords: string[];
  highlights: string[];
  attentionSignals: string[];
  topicAngles: string[];
  createdAt: string;
}
```

```sql
CREATE TABLE IF NOT EXISTS analysis_settings (
  singleton_key TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  time TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analysis_evidence_items (
  id TEXT PRIMARY KEY,
  snapshot_id TEXT NOT NULL,
  content_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  platform_id TEXT NOT NULL,
  title TEXT NOT NULL,
  brief_summary TEXT NOT NULL,
  key_facts_json TEXT NOT NULL,
  keywords_json TEXT NOT NULL,
  highlights_json TEXT NOT NULL,
  attention_signals_json TEXT NOT NULL,
  topic_angles_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS analysis_evidence_items_snapshot_idx
ON analysis_evidence_items (snapshot_id);
```

- [ ] **Step 4: Implement the repository helpers**

```ts
export function saveGlobalAnalysisSettings(
  repository: MonitoringRepository,
  input: GlobalAnalysisSettings
) {
  repository.db
    .prepare(
      `INSERT INTO analysis_settings (
        singleton_key, enabled, time, provider, model, updated_at
      ) VALUES ('global', ?, ?, ?, ?, ?)
      ON CONFLICT(singleton_key) DO UPDATE SET
        enabled = excluded.enabled,
        time = excluded.time,
        provider = excluded.provider,
        model = excluded.model,
        updated_at = excluded.updated_at`
    )
    .run(input.enabled ? 1 : 0, input.time, input.provider, input.model, new Date().toISOString());
}

export function getGlobalAnalysisSettings(
  repository: MonitoringRepository
): GlobalAnalysisSettings {
  const row = repository.db
    .prepare(`SELECT enabled, time, provider, model FROM analysis_settings WHERE singleton_key = 'global'`)
    .get() as
    | { enabled: number; time: string; provider: string; model: string }
    | undefined;

  return {
    enabled: row ? row.enabled === 1 : true,
    time: row?.time ?? "08:00",
    provider: row?.provider ?? "SiliconFlow",
    model: row?.model ?? "zai-org/GLM-5"
  };
}
```

- [ ] **Step 5: Run the repository tests to verify they pass**

Run: `npm test -- src/lib/__tests__/monitoring-repository-analysis-settings.test.ts`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts src/lib/db/schema.ts src/lib/db/monitoring-repository.ts src/lib/db/analysis-settings-repository.ts src/lib/__tests__/monitoring-repository-analysis-settings.test.ts
git commit -m "feat: persist analysis settings and evidence"
```

---

### Task 2: Build the SiliconFlow client and two-stage AI service

**Files:**
- Create: `src/lib/siliconflow-client.ts`
- Create: `src/lib/ai-analysis-service.ts`
- Modify: `.env.example`
- Test: `src/lib/__tests__/siliconflow-client.test.ts`
- Test: `src/lib/__tests__/ai-analysis-service.test.ts`

- [ ] **Step 1: Write the failing client test**

```ts
import { describe, expect, it, vi } from "vitest";

import { createSiliconFlowClient } from "@/lib/siliconflow-client";

describe("siliconflow client", () => {
  it("sends an OpenAI-compatible chat/completions request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "{\"ok\":true}" } }]
      })
    });

    const client = createSiliconFlowClient({
      apiKey: "test-key",
      baseUrl: "https://api.siliconflow.cn/v1",
      model: "zai-org/GLM-5",
      fetchImpl: fetchMock
    });

    await client.completeJson({ system: "sys", user: "usr" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.siliconflow.cn/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key"
        })
      })
    );
  });
});
```

- [ ] **Step 2: Write the failing AI service test**

```ts
import { describe, expect, it, vi } from "vitest";

import { buildTopicAnalysis } from "@/lib/ai-analysis-service";

describe("ai analysis service", () => {
  it("returns structured evidence items and at least five topic suggestions", async () => {
    const completeJson = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            contentId: "content-1",
            title: "Article title",
            platform: "wechat",
            author: "author",
            briefSummary: "summary",
            keyFacts: ["fact"],
            keywords: ["Claude Code"],
            highlights: ["highlight"],
            attentionSignals: ["signal"],
            topicAngles: ["angle"]
          }
        ]
      })
      .mockResolvedValueOnce({
        hotSummary: "hot",
        focusSummary: "focus",
        patternSummary: "pattern",
        insightSummary: "insight",
        topics: new Array(5).fill(null).map((_, index) => ({
          title: `Topic ${index + 1}`,
          intro: "intro",
          whyNow: "why",
          hook: "hook",
          growth: "growth",
          coreKeywords: ["Claude Code"],
          supportContentIds: ["content-1"],
          evidenceSummary: "evidence"
        }))
      });

    const result = await buildTopicAnalysis({
      keyword: "claude code",
      items: [
        {
          id: "content-1",
          title: "Article title",
          platformId: "wechat",
          author: "author",
          summary: "body",
          publishedAt: "2026-04-03 08:00:00",
          publishTimestamp: 1712102400
        } as never
      ],
      client: { completeJson } as never
    });

    expect(result.evidenceItems).toHaveLength(1);
    expect(result.snapshot.topics).toHaveLength(5);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/lib/__tests__/siliconflow-client.test.ts src/lib/__tests__/ai-analysis-service.test.ts`

Expected:
- FAIL because neither module exists yet

- [ ] **Step 4: Implement the minimal SiliconFlow client**

```ts
export function createSiliconFlowClient(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  fetchImpl?: typeof fetch;
}) {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async completeJson(messages: { system: string; user: string }) {
      const response = await fetchImpl(`${input.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: input.model,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: messages.system },
            { role: "user", content: messages.user }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`SiliconFlow request failed with status ${response.status}`);
      }

      const payload = await response.json();
      return JSON.parse(payload.choices[0].message.content as string);
    }
  };
}
```

- [ ] **Step 5: Implement the minimal two-stage service**

```ts
export async function buildTopicAnalysis(input: {
  keyword: string;
  items: ContentItem[];
  client: { completeJson(messages: { system: string; user: string }): Promise<any> };
}) {
  if (input.items.length === 0) {
    return null;
  }

  const evidencePayload = await input.client.completeJson({
    system: "Extract structured evidence as JSON.",
    user: JSON.stringify({
      keyword: input.keyword,
      items: input.items.map((item) => ({
        id: item.id,
        title: item.title,
        platform: item.platformId,
        author: item.author,
        summary: item.summary ?? item.aiSummary ?? "",
        publishedAt: item.publishedAt
      }))
    })
  });

  const snapshotPayload = await input.client.completeJson({
    system: "Generate a topic report with at least five structured topics as JSON.",
    user: JSON.stringify({
      keyword: input.keyword,
      evidence: evidencePayload.items
    })
  });

  return {
    evidenceItems: evidencePayload.items,
    snapshot: snapshotPayload
  };
}
```

- [ ] **Step 6: Add the environment variables**

```env
SILICONFLOW_API_KEY=replace-with-your-key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=zai-org/GLM-5
```

- [ ] **Step 7: Run the targeted tests to verify they pass**

Run: `npm test -- src/lib/__tests__/siliconflow-client.test.ts src/lib/__tests__/ai-analysis-service.test.ts`

Expected:
- PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/siliconflow-client.ts src/lib/ai-analysis-service.ts src/lib/__tests__/siliconflow-client.test.ts src/lib/__tests__/ai-analysis-service.test.ts .env.example
git commit -m "feat: add siliconflow topic analysis service"
```

---

### Task 3: Create orchestration and analysis API routes

**Files:**
- Create: `src/lib/analysis-orchestrator.ts`
- Create: `src/app/api/analysis/run/route.ts`
- Create: `src/app/api/analysis/reports/route.ts`
- Create: `src/app/api/analysis/report/[snapshotId]/route.ts`
- Modify: `src/app/api/content/refresh/route.ts`
- Modify: `src/lib/history-archive.ts`
- Test: `src/lib/__tests__/analysis-orchestrator.test.ts`
- Test: `src/app/api/analysis/run/__tests__/route.test.ts`
- Test: `src/app/api/analysis/reports/__tests__/route.test.ts`
- Test: `src/app/api/analysis/report/[snapshotId]/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing orchestration test**

```ts
import { describe, expect, it, vi } from "vitest";

import { runManualKeywordAnalysis } from "@/lib/analysis-orchestrator";

describe("analysis orchestrator", () => {
  it("refreshes content first and then persists a new analysis snapshot", async () => {
    const refreshKeywordAcrossPlatforms = vi.fn().mockResolvedValue({
      items: [{ id: "content-1" }],
      latestRunAt: "2026-04-03T08:00:00.000Z"
    });
    const buildTopicAnalysis = vi.fn().mockResolvedValue({
      evidenceItems: [{ id: "evidence-1", contentId: "content-1" }],
      snapshot: {
        hotSummary: "hot",
        focusSummary: "focus",
        patternSummary: "pattern",
        insightSummary: "insight",
        topics: new Array(5).fill(null).map((_, index) => ({
          title: `Topic ${index + 1}`,
          intro: "intro",
          whyNow: "why",
          hook: "hook",
          growth: "growth",
          supportContentIds: ["content-1"],
          coreKeywords: ["Claude Code"],
          evidenceSummary: "evidence"
        }))
      }
    });

    await runManualKeywordAnalysis({
      categoryId: "claude",
      keyword: "claude code",
      refreshKeywordAcrossPlatforms: refreshKeywordAcrossPlatforms as never,
      buildTopicAnalysis: buildTopicAnalysis as never
    });

    expect(refreshKeywordAcrossPlatforms).toHaveBeenCalled();
    expect(buildTopicAnalysis).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/__tests__/analysis-orchestrator.test.ts`

Expected:
- FAIL because the orchestration module and route handlers do not exist yet

- [ ] **Step 3: Implement the orchestration workflow**

```ts
export async function runManualKeywordAnalysis(input: {
  categoryId: string;
  keyword: string;
  repository: MonitoringRepository;
  refreshKeywordAcrossPlatforms: typeof refreshKeywordAcrossPlatforms;
  buildTopicAnalysis: typeof buildTopicAnalysis;
  client: SiliconFlowClient;
}) {
  const refreshResult = await input.refreshKeywordAcrossPlatforms({
    repository: input.repository,
    categoryId: input.categoryId,
    keyword: input.keyword
  });

  if (refreshResult.items.length === 0) {
    return { skipped: true, reason: "no_data" } as const;
  }

  const analysis = await input.buildTopicAnalysis({
    keyword: input.keyword,
    items: refreshResult.items,
    client: input.client
  });

  if (!analysis) {
    return { skipped: true, reason: "no_data" } as const;
  }

  const snapshotId = upsertAnalysisSnapshot(input.repository, {
    snapshot: {
      ...analysis.snapshot,
      categoryId: input.categoryId,
      keyword: input.keyword,
      generatedAt: new Date().toISOString()
    }
  });

  upsertAnalysisEvidenceItems(input.repository, {
    snapshotId,
    items: analysis.evidenceItems.map((item: any, index: number) => ({
      ...item,
      id: `${snapshotId}-evidence-${index + 1}`,
      snapshotId,
      keyword: input.keyword,
      createdAt: new Date().toISOString()
    }))
  });

  return { skipped: false, snapshotId } as const;
}
```

- [ ] **Step 4: Implement the API routes**

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const result = await runManualKeywordAnalysis({
    categoryId: body.categoryId,
    keyword: body.keyword,
    repository: createMonitoringRepository(),
    refreshKeywordAcrossPlatforms,
    buildTopicAnalysis,
    client: createDefaultSiliconFlowClient()
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 5: Run orchestration and API tests**

Run: `npm test -- src/lib/__tests__/analysis-orchestrator.test.ts src/app/api/analysis/run/__tests__/route.test.ts src/app/api/analysis/reports/__tests__/route.test.ts src/app/api/analysis/report/[snapshotId]/__tests__/route.test.ts`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/analysis-orchestrator.ts src/app/api/analysis/run/route.ts src/app/api/analysis/reports/route.ts src/app/api/analysis/report/[snapshotId]/route.ts src/lib/history-archive.ts src/app/api/content/refresh/route.ts src/lib/__tests__/analysis-orchestrator.test.ts src/app/api/analysis/run/__tests__/route.test.ts src/app/api/analysis/reports/__tests__/route.test.ts src/app/api/analysis/report/[snapshotId]/__tests__/route.test.ts
git commit -m "feat: add manual topic analysis orchestration"
```

---

### Task 4: Add analysis settings API and Windows scheduler scripts

**Files:**
- Create: `src/lib/db/analysis-settings-repository.ts`
- Create: `src/app/api/analysis/settings/route.ts`
- Create: `scripts/register-analysis-task.ts`
- Create: `scripts/run-daily-analysis.ts`
- Test: `src/app/api/analysis/settings/__tests__/route.test.ts`
- Test: `src/lib/__tests__/scheduled-analysis.test.ts`

- [ ] **Step 1: Write the failing settings route test**

```ts
import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/analysis/settings/route";

describe("analysis settings route", () => {
  it("returns the default global settings", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(payload.time).toBe("08:00");
    expect(payload.model).toBe("zai-org/GLM-5");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/app/api/analysis/settings/__tests__/route.test.ts`

Expected:
- FAIL because the route does not exist yet

- [ ] **Step 3: Implement the settings route and task registration hook**

```ts
export async function POST(request: Request) {
  const body = await request.json();
  const repository = createMonitoringRepository();

  saveGlobalAnalysisSettings(repository, {
    enabled: body.enabled,
    time: body.time,
    provider: "SiliconFlow",
    model: "zai-org/GLM-5"
  });

  await registerAnalysisTask({ enabled: body.enabled, time: body.time });

  return NextResponse.json({ ok: true });
}
```

```ts
export async function registerAnalysisTask(input: { enabled: boolean; time: string }) {
  if (!input.enabled) {
    return;
  }

  const [hour, minute] = input.time.split(":");
  const taskName = "ContentPulseDailyAnalysis";
  const scriptPath = path.resolve(process.cwd(), "scripts/run-daily-analysis.ts");

  await execFileAsync("schtasks.exe", [
    "/Create",
    "/F",
    "/SC",
    "DAILY",
    "/TN",
    taskName,
    "/TR",
    `node "${scriptPath}"`,
    "/ST",
    `${hour}:${minute}`
  ]);
}
```

- [ ] **Step 4: Implement the daily runner**

```ts
async function main() {
  const repository = createMonitoringRepository();
  const categories = listMonitorCategories(repository);

  for (const category of categories) {
    for (const target of category.settings.keywords) {
      await runScheduledKeywordAnalysis({
        categoryId: category.id,
        keyword: target.label,
        repository,
        client: createDefaultSiliconFlowClient()
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

- [ ] **Step 5: Run the settings and scheduler tests**

Run: `npm test -- src/app/api/analysis/settings/__tests__/route.test.ts src/lib/__tests__/scheduled-analysis.test.ts`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/api/analysis/settings/route.ts src/lib/db/analysis-settings-repository.ts scripts/register-analysis-task.ts scripts/run-daily-analysis.ts src/app/api/analysis/settings/__tests__/route.test.ts src/lib/__tests__/scheduled-analysis.test.ts
git commit -m "feat: add scheduled topic analysis settings"
```

---

### Task 5: Wire the analysis page and settings page UI

**Files:**
- Modify: `src/components/workbench/replica-analysis-panel.tsx`
- Modify: `src/components/workbench/settings-tab.tsx`
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/lib/analysis-report.ts`
- Test: `src/components/workbench/__tests__/replica-analysis-panel.test.tsx`
- Test: `src/components/workbench/__tests__/replica-workbench-analysis.test.tsx`

- [ ] **Step 1: Write the failing UI tests**

```ts
it("runs manual analysis from the analysis tab and shows the new report", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("tab", { name: "选题分析" }));
  await user.click(screen.getByRole("button", { name: "立即分析" }));

  expect(await screen.findByText("Topic 1")).toBeInTheDocument();
});

it("saves global analysis time from settings", async () => {
  render(<MonitoringWorkbench />);

  await user.click(screen.getByRole("tab", { name: "监控设置" }));
  await user.clear(screen.getByLabelText("执行时间"));
  await user.type(screen.getByLabelText("执行时间"), "09:15");
  await user.click(screen.getByRole("button", { name: "保存分析设置" }));

  expect(await screen.findByText(/已保存/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/components/workbench/__tests__/replica-analysis-panel.test.tsx src/components/workbench/__tests__/replica-workbench-analysis.test.tsx`

Expected:
- FAIL because the page does not have these controls and state updates yet

- [ ] **Step 3: Add the UI controls**

```tsx
<button
  type="button"
  className="replica-shell__action-button is-primary"
  onClick={onRunAnalysis}
  disabled={isRunningAnalysis}
>
  {isRunningAnalysis ? "分析中..." : "立即分析"}
</button>
```

```tsx
<section className="workbench-shell__settings-section" aria-label="global-analysis-settings">
  <div className="workbench-shell__settings-section-header">
    <div>
      <h3>全局分析设置</h3>
      <p>配置每天自动抓取并生成选题日报的时间。</p>
    </div>
  </div>
  <label>
    执行时间
    <input aria-label="执行时间" type="time" value={analysisTime} onChange={(event) => setAnalysisTime(event.target.value)} />
  </label>
  <button type="button" onClick={onSaveAnalysisSettings}>保存分析设置</button>
</section>
```

- [ ] **Step 4: Wire the page state and APIs**

```ts
const runManualAnalysis = async () => {
  setAnalysisStatus("loading");

  const response = await fetch("/api/analysis/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      categoryId: activeCategory.id,
      keyword: activeKeyword
    })
  });

  const payload = await response.json();

  await refreshReports(activeCategory.id, activeKeyword);
  setSelectedReportDate(payload.generatedDate ?? new Date().toISOString().slice(0, 10));
  setAnalysisStatus("idle");
};
```

- [ ] **Step 5: Run the UI tests**

Run: `npm test -- src/components/workbench/__tests__/replica-analysis-panel.test.tsx src/components/workbench/__tests__/replica-workbench-analysis.test.tsx`

Expected:
- PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/workbench/replica-analysis-panel.tsx src/components/workbench/settings-tab.tsx src/components/workbench/monitoring-workbench.tsx src/lib/analysis-report.ts src/components/workbench/__tests__/replica-analysis-panel.test.tsx src/components/workbench/__tests__/replica-workbench-analysis.test.tsx
git commit -m "feat: wire siliconflow analysis page controls"
```

---

### Task 6: Full verification and documentation touch-up

**Files:**
- Modify: `.env.example`
- Modify: `docs/superpowers/specs/2026-04-03-siliconflow-topic-analysis-design.md` (only if implementation-driven clarifications are needed)

- [ ] **Step 1: Run the focused new tests**

Run: `npm test -- src/lib/__tests__/monitoring-repository-analysis-settings.test.ts src/lib/__tests__/siliconflow-client.test.ts src/lib/__tests__/ai-analysis-service.test.ts src/lib/__tests__/analysis-orchestrator.test.ts src/app/api/analysis/run/__tests__/route.test.ts src/app/api/analysis/reports/__tests__/route.test.ts src/app/api/analysis/report/[snapshotId]/__tests__/route.test.ts src/components/workbench/__tests__/replica-analysis-panel.test.tsx src/components/workbench/__tests__/replica-workbench-analysis.test.tsx`

Expected:
- PASS

- [ ] **Step 2: Run the full project test suite**

Run: `npm test`

Expected:
- PASS with all tests green

- [ ] **Step 3: Run lint and build**

Run: `npm run lint`
Expected: PASS

Run: `npm run build`
Expected: PASS (warnings about Next/SQLite may remain, but no failure)

- [ ] **Step 4: Smoke test the key flows**

Run:

```bash
npm run dev
```

Then manually verify:
- `选题分析` 页点击 `立即分析` 会产生新日期卡和至少 5 条选题建议
- `监控设置` 页能保存全局分析时间
- `搜索历史` 中可以回看带证据项的分析快照

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "feat: add siliconflow topic analysis workflow"
```
