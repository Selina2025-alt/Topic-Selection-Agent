# Content Monitoring Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js prototype for a content-monitoring and topic-decision workbench with realistic mock data, decision-first reporting, evidence links, and configuration quality feedback.

**Architecture:** Use a lightweight Next.js App Router app with one server entrypoint and one client-side `MonitoringWorkbench` container that owns UI state. Keep domain types, mock data, and derived selectors in `src/lib`, and render the three-column workbench with small presentational components under `src/components/workbench`. Use Vitest plus React Testing Library for TDD on selectors and cross-tab interactions.

**Tech Stack:** Next.js, React, TypeScript, Vitest, React Testing Library, plain CSS via `src/app/globals.css`

---

## File Structure

- Create: `package.json` - app metadata, scripts, runtime dependencies, test dependencies
- Create: `tsconfig.json` - TypeScript config with `@/*` alias for `src/*`
- Create: `next-env.d.ts` - Next.js TypeScript environment file
- Create: `next.config.ts` - minimal Next.js config
- Create: `eslint.config.mjs` - ESLint setup using `eslint-config-next`
- Create: `vitest.config.ts` - Vitest config with jsdom and alias support
- Create: `vitest.setup.ts` - `@testing-library/jest-dom` setup
- Create: `src/app/layout.tsx` - root HTML shell and font variables
- Create: `src/app/page.tsx` - server entrypoint that renders the client workbench
- Create: `src/app/globals.css` - design tokens, three-column layout, card system, tab states, responsive rules
- Create: `src/lib/types.ts` - all domain types and UI state shapes
- Create: `src/lib/mock-data.ts` - realistic mock categories, reports, content items, settings metrics
- Create: `src/lib/workbench-selectors.ts` - derived helpers for initial state, current category, evidence mapping, filters
- Create: `src/lib/__tests__/workbench-selectors.test.ts` - selector tests
- Create: `src/components/workbench/monitoring-workbench.tsx` - stateful container and cross-tab bridge callbacks
- Create: `src/components/workbench/category-sidebar.tsx` - searchable category rail
- Create: `src/components/workbench/workbench-header.tsx` - top summary header for active category
- Create: `src/components/workbench/action-deck.tsx` - “今日建议动作区”
- Create: `src/components/workbench/date-strip.tsx` - reusable date card strip for content and reports
- Create: `src/components/workbench/right-rail.tsx` - decision-support sidebar
- Create: `src/components/workbench/report-tab.tsx` - daily report and topic summary views
- Create: `src/components/workbench/content-tab.tsx` - platform filter, date strip, content cards, reverse bridge
- Create: `src/components/workbench/settings-tab.tsx` - platform, keyword, creator, and schedule cards with quality feedback
- Create: `src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx` - shell smoke test
- Create: `src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx` - category switch and action deck test
- Create: `src/components/workbench/__tests__/report-evidence-bridge.test.tsx` - report to content bridge test
- Create: `src/components/workbench/__tests__/content-insight-bridge.test.tsx` - content to report bridge test
- Create: `src/components/workbench/__tests__/settings-tab.test.tsx` - settings quality feedback test

## Task 1: Bootstrap Next.js and Test Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next-env.d.ts`
- Create: `next.config.ts`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`

- [ ] **Step 1: Create the project manifest and toolchain files**

`package.json`

```json
{
  "name": "content-monitoring-workbench",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^22.10.1",
    "@types/react": "^19.0.2",
    "@types/react-dom": "^19.0.2",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.16.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^2.1.8"
  }
}
```

`tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next-env.d.ts`

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />

// This file is required by Next.js and should not be edited manually.
```

`next.config.ts`

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`eslint.config.mjs`

```js
import nextVitals from "eslint-config-next/core-web-vitals";

export default [...nextVitals];
```

`vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true
  }
});
```

`vitest.setup.ts`

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: npm creates `package-lock.json` and installs `next`, `react`, `react-dom`, `typescript`, `vitest`, and testing dependencies without errors.

- [ ] **Step 3: Verify the toolchain works before any feature code**

Run: `npm run test`

Expected: Vitest starts and exits with `No test files found`, proving the test runner is wired before feature work begins.

- [ ] **Step 4: Commit the toolchain bootstrap**

```bash
git add package.json package-lock.json tsconfig.json next-env.d.ts next.config.ts eslint.config.mjs vitest.config.ts vitest.setup.ts
git commit -m "chore: bootstrap next app tooling"
```

## Task 2: Build the Initial Workbench Shell

**Files:**
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/components/workbench/monitoring-workbench.tsx`
- Create: `src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx`

- [ ] **Step 1: Write the failing shell smoke test**

`src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("MonitoringWorkbench shell", () => {
  it("renders the default decision-first shell", () => {
    render(<MonitoringWorkbench />);

    expect(
      screen.getByRole("heading", { name: "ClaudeCode 选题监控" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "选题分析与报告" })
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("今日建议动作区")).toBeInTheDocument();
    expect(screen.getByText("监控分类")).toBeInTheDocument();
    expect(screen.getByText("判断辅助信息")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx`

Expected: FAIL with a module resolution error for `@/components/workbench/monitoring-workbench` or a missing export error.

- [ ] **Step 3: Implement the minimal shell, page, and visual system**

`src/app/layout.tsx`

```tsx
import type { Metadata } from "next";
import { Manrope, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "内容监控与选题决策工作台",
  description: "单页原型：内容监控、AI 报告与选题决策"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`

```tsx
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

export default function Page() {
  return <MonitoringWorkbench />;
}
```

`src/components/workbench/monitoring-workbench.tsx`

```tsx
"use client";

export function MonitoringWorkbench() {
  return (
    <div className="workbench-shell">
      <aside className="workbench-panel">
        <p className="eyebrow">监控分类</p>
        <h2 className="panel-title">分类工作区</h2>
      </aside>

      <main className="workbench-main">
        <header className="hero-card">
          <p className="eyebrow">ClaudeCode 选题监控</p>
          <h1>ClaudeCode 选题监控</h1>
          <p className="hero-summary">今日建议动作区</p>
        </header>

        <div className="tabs" role="tablist" aria-label="主工作区标签">
          <button role="tab" aria-selected="false" className="tab-button">
            内容
          </button>
          <button role="tab" aria-selected="true" className="tab-button is-active">
            选题分析与报告
          </button>
          <button role="tab" aria-selected="false" className="tab-button">
            监控设置
          </button>
        </div>
      </main>

      <aside className="workbench-panel">
        <p className="eyebrow">判断辅助信息</p>
      </aside>
    </div>
  );
}
```

`src/app/globals.css`

```css
:root {
  --bg: #f6f2e8;
  --panel: rgba(255, 252, 245, 0.92);
  --panel-strong: #fffdf8;
  --ink: #1f1e1b;
  --muted: #696256;
  --line: rgba(31, 30, 27, 0.1);
  --accent: #d5653a;
  --accent-soft: rgba(213, 101, 58, 0.12);
  --success: #285f4b;
  --shadow: 0 24px 60px rgba(68, 51, 34, 0.08);
  --radius-xl: 28px;
  --radius-lg: 20px;
  --radius-md: 14px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(255, 222, 178, 0.4), transparent 22%),
    linear-gradient(180deg, #fbf7ef 0%, #f3ecdf 100%);
  color: var(--ink);
  font-family: var(--font-sans), sans-serif;
}

button,
input {
  font: inherit;
}

body {
  padding: 24px;
}

.workbench-shell {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr) 300px;
  gap: 20px;
  min-height: calc(100vh - 48px);
}

.workbench-panel,
.workbench-main {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow);
  backdrop-filter: blur(18px);
}

.workbench-panel {
  padding: 22px;
}

.workbench-main {
  padding: 22px;
  display: grid;
  gap: 18px;
  align-content: start;
}

.hero-card {
  padding: 24px;
  border-radius: var(--radius-xl);
  background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(252,241,226,0.95));
  border: 1px solid rgba(213, 101, 58, 0.18);
}

.hero-card h1 {
  margin: 10px 0 12px;
  font-family: var(--font-serif), serif;
  font-size: 2rem;
}

.hero-summary,
.panel-title,
.eyebrow {
  margin: 0;
}

.eyebrow {
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.tabs {
  display: inline-flex;
  gap: 8px;
  padding: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid var(--line);
  width: fit-content;
}

.tab-button {
  border: none;
  border-radius: 999px;
  padding: 12px 18px;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.tab-button.is-active {
  background: var(--ink);
  color: white;
}

@media (max-width: 1280px) {
  .workbench-shell {
    grid-template-columns: 280px minmax(0, 1fr) 260px;
  }
}

@media (max-width: 1080px) {
  .workbench-shell {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx`

Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit the initial shell**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/globals.css src/components/workbench/monitoring-workbench.tsx src/components/workbench/__tests__/monitoring-workbench-shell.test.tsx
git commit -m "feat: add initial workbench shell"
```

## Task 3: Add Domain Types, Mock Data, and Selectors

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/mock-data.ts`
- Create: `src/lib/workbench-selectors.ts`
- Create: `src/lib/__tests__/workbench-selectors.test.ts`

- [ ] **Step 1: Write the failing selector tests**

`src/lib/__tests__/workbench-selectors.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { monitorCategories } from "@/lib/mock-data";
import {
  buildInitialWorkbenchState,
  getActiveCategory,
  getCurrentDailyReport,
  getLinkedContentIds
} from "@/lib/workbench-selectors";

describe("workbench selectors", () => {
  it("builds the default state from the first category and latest report date", () => {
    const state = buildInitialWorkbenchState(monitorCategories);

    expect(state.selectedCategoryId).toBe("claudecode");
    expect(state.activeTab).toBe("report");
    expect(state.selectedPlatformId).toBe("all");
    expect(state.selectedReportDate).toBe("2026-03-26");
    expect(state.selectedContentDate).toBe("2026-03-26");
  });

  it("exposes linked content ids from the current report topic", () => {
    const category = getActiveCategory(monitorCategories, "claudecode");
    const report = getCurrentDailyReport(category, "2026-03-26");
    const topic = report.topics[0];

    expect(getLinkedContentIds(topic)).toEqual([
      "cc-xhs-0326-1",
      "cc-bili-0326-1",
      "cc-dy-0326-1"
    ]);
  });
});
```

- [ ] **Step 2: Run the selector tests to verify they fail**

Run: `npm run test -- src/lib/__tests__/workbench-selectors.test.ts`

Expected: FAIL because `mock-data.ts` and `workbench-selectors.ts` do not exist yet.

- [ ] **Step 3: Implement domain types, factories, and selectors**

`src/lib/types.ts`

```ts
export type TabId = "report" | "content" | "settings";
export type ReportView = "daily" | "summary";
export type PlatformId = "all" | "douyin" | "xiaohongshu" | "weibo" | "bilibili";

export interface ActionItem {
  id: string;
  type: "topic" | "signal" | "review";
  title: string;
  summary: string;
  priority: "P1" | "P2" | "P3";
  sourceLabel: string;
  evidenceLabel: string;
}

export interface InsightEvidence {
  id: string;
  contentIds: string[];
  sourcePlatformIds: PlatformId[];
  summary: string;
}

export interface TopicIdea {
  id: string;
  title: string;
  brief: string;
  whyNow: string;
  hook: string;
  growthSpace: string;
  sourcePlatforms: PlatformId[];
  evidenceCount: number;
  coreSamples: string[];
  burstWindow: string;
  streakDays: number;
  confidence: string;
  evidence: InsightEvidence[];
}

export interface DailyReport {
  date: string;
  hotSummary: string;
  focusSummary: string;
  patternSummary: string;
  insightSummary: string;
  platformsInvolved: number;
  topicCount: number;
  topics: TopicIdea[];
}

export interface ContentItem {
  id: string;
  date: string;
  timeOfDay: "上午" | "下午" | "晚间";
  title: string;
  platformId: Exclude<PlatformId, "all">;
  author: string;
  publishedAt: string;
  heatScore: number;
  metrics: {
    likes: string;
    comments: string;
    saves: string;
  };
  matchedTargets: string[];
  aiSummary: string;
  linkedTopicIds: string[];
  includedInDailyReport: boolean;
  inTopicPool: boolean;
}

export interface PlatformSetting {
  id: Exclude<PlatformId, "all">;
  label: string;
  enabled: boolean;
  syncedAt: string;
  keywordCount: number;
  creatorCount: number;
  successRate: string;
  qualityRate: string;
  recommendation: string;
}

export interface KeywordTarget {
  id: string;
  label: string;
  platformLabels: string;
  hitCount: number;
  qualityRate: string;
  qualityHint: string;
  overlapHint: string;
}

export interface CreatorTarget {
  id: string;
  name: string;
  platformLabel: string;
  profile: string;
  updatedAt: string;
  hotContentStatus: string;
  weeklyActivity: string;
  hotSampleContribution: number;
  healthHint: string;
}

export interface ScheduleConfig {
  frequency: string;
  time: string;
  analysisScope: string;
  model: string;
}

export interface DecisionSignals {
  priorityDistribution: string[];
  anomalySignals: string[];
  risingTopics: string[];
  emergingKeywords: string[];
  reviewItems: string[];
}

export interface MonitorCategory {
  id: string;
  name: string;
  description: string;
  lastRunAt: string;
  todayCollectionCount: number;
  reportStatus: string;
  overview: {
    platformCount: number;
    keywordCount: number;
    creatorCount: number;
    updatedAt: string;
  };
  actionItems: ActionItem[];
  reports: DailyReport[];
  content: ContentItem[];
  settings: {
    platforms: PlatformSetting[];
    keywords: KeywordTarget[];
    creators: CreatorTarget[];
    schedule: ScheduleConfig;
  };
  decisionSignals: DecisionSignals;
}

export interface WorkbenchState {
  selectedCategoryId: string;
  activeTab: TabId;
  reportView: ReportView;
  selectedReportDate: string;
  selectedContentDate: string;
  selectedPlatformId: PlatformId;
  focusedTopicId: string | null;
  highlightedContentIds: string[];
}
```

`src/lib/mock-data.ts`

```ts
import { MonitorCategory, PlatformId } from "@/lib/types";

function content(
  id: string,
  date: string,
  timeOfDay: "上午" | "下午" | "晚间",
  title: string,
  platformId: Exclude<PlatformId, "all">,
  author: string,
  publishedAt: string,
  heatScore: number,
  likes: string,
  comments: string,
  saves: string,
  matchedTargets: string[],
  aiSummary: string,
  linkedTopicIds: string[],
  includedInDailyReport = true,
  inTopicPool = false
) {
  return {
    id,
    date,
    timeOfDay,
    title,
    platformId,
    author,
    publishedAt,
    heatScore,
    metrics: { likes, comments, saves },
    matchedTargets,
    aiSummary,
    linkedTopicIds,
    includedInDailyReport,
    inTopicPool
  };
}

export const monitorCategories: MonitorCategory[] = [
  {
    id: "claudecode",
    name: "ClaudeCode 选题监控",
    description: "追踪 AI 编码工作流、Agent 体验与效率型选题。",
    lastRunAt: "2026-03-27 08:30",
    todayCollectionCount: 46,
    reportStatus: "最新日报已生成",
    overview: { platformCount: 4, keywordCount: 8, creatorCount: 5, updatedAt: "5 分钟前" },
    actionItems: [
      {
        id: "action-cc-1",
        type: "topic",
        title: "AI 编码陪跑工作流",
        summary: "“从提需求到审代码”的全链路陪跑内容连续升温。",
        priority: "P1",
        sourceLabel: "小红书 + B站",
        evidenceLabel: "3 条强证据"
      }
    ],
    reports: [
      {
        date: "2026-03-26",
        hotSummary: "AI 编码陪跑与 Code Review 工作流是昨天最强的增长话题。",
        focusSummary: "用户更关心“如何把 Agent 真的接进日常协作”。",
        patternSummary: "强样本集中在“实战流程、提效对比、踩坑复盘”。",
        insightSummary: "优先做“运营人如何搭 AI 内容流水线”的实操向选题。",
        platformsInvolved: 4,
        topicCount: 4,
        topics: [
          {
            id: "topic-cc-1",
            title: "AI 编码陪跑工作流",
            brief: "展示如何让 Claude Code 参与提纲、审稿和复盘。",
            whyNow: "高热内容都在讲真实工作流。",
            hook: "把 Agent 放进每日内容生产链路。",
            growthSpace: "可拆成总览、角色协作、踩坑清单三类延展。",
            sourcePlatforms: ["xiaohongshu", "bilibili", "douyin"],
            evidenceCount: 3,
            coreSamples: [
              "从脚本到 Agent，运营人怎样搭内容自动化",
              "手把手搭 Claude Code Code Review 流程",
              "我把日报交给 Agent 后，团队协作发生了什么"
            ],
            burstWindow: "03-24 至 03-26",
            streakDays: 3,
            confidence: "高",
            evidence: [
              {
                id: "evi-cc-1",
                contentIds: ["cc-xhs-0326-1", "cc-bili-0326-1", "cc-dy-0326-1"],
                sourcePlatformIds: ["xiaohongshu", "bilibili", "douyin"],
                summary: "3 个平台都出现“把 Agent 接入真实流程”的强信号。"
              }
            ]
          }
        ]
      }
    ],
    content: [
      content("cc-xhs-0326-1", "2026-03-26", "上午", "从脚本到 Agent，运营人怎样搭内容自动化", "xiaohongshu", "Yao 内容实验室", "09:12", 98, "3.4k", "286", "2.1k", ["Claude Code"], "方法论和流程图并重，收藏意图很强。", ["topic-cc-1"], true, true),
      content("cc-bili-0326-1", "2026-03-26", "下午", "手把手搭 Claude Code Code Review 流程", "bilibili", "阿望做效率", "14:40", 95, "2.1k", "183", "1.6k", ["Code Review"], "教程足够具体，是选题证据中的核心样本。", ["topic-cc-1"]),
      content("cc-dy-0326-1", "2026-03-26", "晚间", "我把日报交给 Agent 后，团队协作发生了什么", "douyin", "木西做增长", "20:05", 93, "8.6k", "530", "1.2k", ["日报自动化"], "结果导向强，适合为选题提供传播钩子。", ["topic-cc-1"])
    ],
    settings: {
      platforms: [
        { id: "douyin", label: "抖音", enabled: true, syncedAt: "今天 08:28", keywordCount: 3, creatorCount: 2, successRate: "98%", qualityRate: "61%", recommendation: "保留，适合补充强钩子表达" },
        { id: "xiaohongshu", label: "小红书", enabled: true, syncedAt: "今天 08:27", keywordCount: 4, creatorCount: 2, successRate: "99%", qualityRate: "78%", recommendation: "保留，是方法论类高质量样本主阵地" }
      ],
      keywords: [
        { id: "kw-cc-1", label: "Claude Code", platformLabels: "小红书 / B站 / 抖音", hitCount: 18, qualityRate: "74%", qualityHint: "信号稳定", overlapHint: "与 AI 编码助手存在中度重叠" },
        { id: "kw-cc-2", label: "零代码 Agent", platformLabels: "微博 / 抖音", hitCount: 23, qualityRate: "26%", qualityHint: "疑似过宽", overlapHint: "与新手教程词包大量重合" }
      ],
      creators: [
        { id: "creator-cc-1", name: "Yao 内容实验室", platformLabel: "小红书", profile: "偏方法论和团队协作打法", updatedAt: "今天 09:12", hotContentStatus: "最近 7 天 2 条高热内容", weeklyActivity: "高", hotSampleContribution: 2, healthHint: "优质信号稳定" },
        { id: "creator-cc-2", name: "AI 热点搬运工", platformLabel: "微博", profile: "泛 AI 资讯与热点摘录", updatedAt: "昨天 18:10", hotContentStatus: "最近 7 天无高热内容", weeklyActivity: "高", hotSampleContribution: 0, healthHint: "长期无有效信号" }
      ],
      schedule: { frequency: "每日一次", time: "08:30", analysisScope: "前一天热门内容 Top 10", model: "OpenAI ChatGPT" }
    },
    decisionSignals: {
      priorityDistribution: ["P1 选题 3 个", "P2 信号 4 个", "P3 风险 2 个"],
      anomalySignals: ["B站教程类平均热度较上周 +26%", "微博泛 AI 热点噪声偏高"],
      risingTopics: ["AI 编码陪跑", "日报自动化", "Code Review 流程"],
      emergingKeywords: ["协作模版", "提审流程", "Agent 看板"],
      reviewItems: ["“零代码 Agent”词包是否需要拆分"]
    }
  },
  {
    id: "vibecoding",
    name: "VibeCoding 选题监控",
    description: "追踪 AI 产品实验、个人开发与内容化表达。",
    lastRunAt: "2026-03-27 08:30",
    todayCollectionCount: 38,
    reportStatus: "最新日报已生成",
    overview: { platformCount: 4, keywordCount: 7, creatorCount: 4, updatedAt: "8 分钟前" },
    actionItems: [
      {
        id: "action-vc-1",
        type: "topic",
        title: "全平台 AI 工具实测笔记",
        summary: "用户对“真实对比”和“体验成本”格外敏感。",
        priority: "P1",
        sourceLabel: "小红书 + 微博",
        evidenceLabel: "2 条强证据"
      }
    ],
    reports: [
      {
        date: "2026-03-26",
        hotSummary: "真实实测、个人开发过程记录和结果复盘是主流信号。",
        focusSummary: "读者想知道试错成本与真实产出。",
        patternSummary: "有具体数字、时间线和失败样本的内容更易沉淀收藏。",
        insightSummary: "适合做“我连续 7 天测试 X 工具”的系列题。",
        platformsInvolved: 4,
        topicCount: 4,
        topics: []
      }
    ],
    content: [],
    settings: { platforms: [], keywords: [], creators: [], schedule: { frequency: "每日一次", time: "08:30", analysisScope: "前一天热门内容 Top 10", model: "OpenAI ChatGPT" } },
    decisionSignals: {
      priorityDistribution: ["P1 选题 2 个", "P2 信号 3 个", "P3 风险 1 个"],
      anomalySignals: ["小红书实测笔记收藏率持续升高"],
      risingTopics: ["7 天挑战", "真实对比", "体验成本"],
      emergingKeywords: ["Vibe Coding", "独立开发", "实测复盘"],
      reviewItems: ["收入截图类样本需要降权"]
    }
  }
];
```

`src/lib/workbench-selectors.ts`

```ts
import { MonitorCategory, PlatformId, TopicIdea, WorkbenchState } from "@/lib/types";

export function buildInitialWorkbenchState(categories: MonitorCategory[]): WorkbenchState {
  const first = categories[0];
  const latestReportDate = first.reports[0]?.date ?? "";

  return {
    selectedCategoryId: first.id,
    activeTab: "report",
    reportView: "daily",
    selectedReportDate: latestReportDate,
    selectedContentDate: latestReportDate,
    selectedPlatformId: "all",
    focusedTopicId: first.reports[0]?.topics[0]?.id ?? null,
    highlightedContentIds: []
  };
}

export function getActiveCategory(categories: MonitorCategory[], categoryId: string) {
  return categories.find((category) => category.id === categoryId) ?? categories[0];
}

export function getCurrentDailyReport(category: MonitorCategory, date: string) {
  return category.reports.find((report) => report.date === date) ?? category.reports[0];
}

export function getLinkedContentIds(topic: TopicIdea) {
  return topic.evidence.flatMap((item) => item.contentIds);
}

export function getContentForDate(
  category: MonitorCategory,
  date: string,
  platformId: PlatformId,
  highlightedContentIds: string[]
) {
  const byDate = category.content.filter((item) => item.date === date);
  const byPlatform =
    platformId === "all"
      ? byDate
      : byDate.filter((item) => item.platformId === platformId);

  if (highlightedContentIds.length === 0) {
    return byPlatform;
  }

  return byPlatform.filter((item) => highlightedContentIds.includes(item.id));
}
```

- [ ] **Step 4: Run the selector tests to verify they pass**

Run: `npm run test -- src/lib/__tests__/workbench-selectors.test.ts`

Expected: PASS with 2 passing tests.

- [ ] **Step 5: Commit the data layer**

```bash
git add src/lib/types.ts src/lib/mock-data.ts src/lib/workbench-selectors.ts src/lib/__tests__/workbench-selectors.test.ts
git commit -m "feat: add workbench mock data and selectors"
```

## Task 4: Implement Sidebar Navigation, Header, Action Deck, and Right Rail

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create: `src/components/workbench/category-sidebar.tsx`
- Create: `src/components/workbench/workbench-header.tsx`
- Create: `src/components/workbench/action-deck.tsx`
- Create: `src/components/workbench/right-rail.tsx`
- Create: `src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx`

- [ ] **Step 1: Write the failing navigation test**

`src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("MonitoringWorkbench navigation", () => {
  it("switches categories and updates the workbench context", async () => {
    const user = userEvent.setup();
    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: /VibeCoding 选题监控/ }));

    expect(
      screen.getByRole("heading", { name: "VibeCoding 选题监控" })
    ).toBeInTheDocument();
    expect(screen.getByText("今日最值得跟进的 3 个选题")).toBeInTheDocument();
    expect(screen.getByText("全平台 AI 工具实测笔记")).toBeInTheDocument();
    expect(screen.getByText("平台异常波动提示")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx`

Expected: FAIL because the shell does not yet render category buttons or category-derived content.

- [ ] **Step 3: Implement the stateful shell and presentational components**

`src/components/workbench/category-sidebar.tsx`

```tsx
import { MonitorCategory } from "@/lib/types";

interface CategorySidebarProps {
  categories: MonitorCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory
}: CategorySidebarProps) {
  return (
    <aside className="workbench-panel sidebar-panel" aria-label="监控分类">
      <p className="eyebrow">监控分类</p>
      <div className="panel-stack">
        <input className="search-input" placeholder="搜索分类名称" aria-label="搜索分类名称" />
        <button className="ghost-button">+ 新建分类</button>
      </div>

      <div className="category-list">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`category-card ${category.id === selectedCategoryId ? "is-selected" : ""}`}
            onClick={() => onSelectCategory(category.id)}
          >
            <strong>{category.name}</strong>
            <span>{category.description}</span>
            <small>
              {category.overview.platformCount} 平台 · {category.overview.keywordCount} 关键词 ·{" "}
              {category.overview.creatorCount} 账号
            </small>
          </button>
        ))}
      </div>
    </aside>
  );
}
```

`src/components/workbench/workbench-header.tsx`

```tsx
import { MonitorCategory } from "@/lib/types";

export function WorkbenchHeader({ category }: { category: MonitorCategory }) {
  return (
    <header className="hero-card">
      <p className="eyebrow">{category.name}</p>
      <h1>{category.name}</h1>
      <p className="hero-summary">{category.description}</p>
      <div className="metric-row">
        <span>最近运行：{category.lastRunAt}</span>
        <span>今日采集：{category.todayCollectionCount}</span>
        <span>状态：{category.reportStatus}</span>
      </div>
    </header>
  );
}
```

`src/components/workbench/action-deck.tsx`

```tsx
import { ActionItem } from "@/lib/types";

export function ActionDeck({ items }: { items: ActionItem[] }) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2>今日建议动作区</h2>
        <p>先看结论，再决定是否深入看报告。</p>
      </div>
      <div className="action-grid">
        <div className="section-subtitle">今日最值得跟进的 3 个选题</div>
        {items.map((item) => (
          <article key={item.id} className="action-card">
            <span className={`priority-badge priority-${item.priority.toLowerCase()}`}>{item.priority}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <div className="mini-meta">
              <span>{item.sourceLabel}</span>
              <span>{item.evidenceLabel}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

`src/components/workbench/right-rail.tsx`

```tsx
import { DecisionSignals } from "@/lib/types";

export function RightRail({ signals }: { signals: DecisionSignals }) {
  return (
    <aside className="workbench-panel" aria-label="判断辅助信息">
      <p className="eyebrow">判断辅助信息</p>
      <section className="rail-block">
        <h2>今日选题优先级分布</h2>
        <ul>{signals.priorityDistribution.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="rail-block">
        <h2>平台异常波动提示</h2>
        <ul>{signals.anomalySignals.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
    </aside>
  );
}
```

`src/components/workbench/monitoring-workbench.tsx`

```tsx
"use client";

import { useState } from "react";
import { monitorCategories } from "@/lib/mock-data";
import { buildInitialWorkbenchState, getActiveCategory } from "@/lib/workbench-selectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { CategorySidebar } from "@/components/workbench/category-sidebar";
import { RightRail } from "@/components/workbench/right-rail";
import { WorkbenchHeader } from "@/components/workbench/workbench-header";

const initialState = buildInitialWorkbenchState(monitorCategories);

export function MonitoringWorkbench() {
  const [state, setState] = useState(initialState);
  const activeCategory = getActiveCategory(monitorCategories, state.selectedCategoryId);

  return (
    <div className="workbench-shell">
      <CategorySidebar
        categories={monitorCategories}
        selectedCategoryId={state.selectedCategoryId}
        onSelectCategory={(selectedCategoryId) =>
          setState((current) => ({ ...current, selectedCategoryId }))
        }
      />

      <main className="workbench-main">
        <WorkbenchHeader category={activeCategory} />
        <ActionDeck items={activeCategory.actionItems} />
        <div className="tabs" role="tablist" aria-label="主工作区标签">
          <button role="tab" aria-selected="false" className="tab-button">
            内容
          </button>
          <button role="tab" aria-selected="true" className="tab-button is-active">
            选题分析与报告
          </button>
          <button role="tab" aria-selected="false" className="tab-button">
            监控设置
          </button>
        </div>
      </main>

      <RightRail signals={activeCategory.decisionSignals} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx`

Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit the navigation layer**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/components/workbench/category-sidebar.tsx src/components/workbench/workbench-header.tsx src/components/workbench/action-deck.tsx src/components/workbench/right-rail.tsx src/components/workbench/__tests__/monitoring-workbench-navigation.test.tsx
git commit -m "feat: add workbench navigation and decision context"
```

## Task 5: Implement the Report Tab and Evidence Bridge

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create: `src/components/workbench/date-strip.tsx`
- Create: `src/components/workbench/report-tab.tsx`
- Create: `src/components/workbench/__tests__/report-evidence-bridge.test.tsx`

- [ ] **Step 1: Write the failing report bridge test**

`src/components/workbench/__tests__/report-evidence-bridge.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("report to content bridge", () => {
  it("opens the linked evidence inside the content tab", async () => {
    const user = userEvent.setup();
    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: /查看支撑内容/ }));

    expect(screen.getByRole("tab", { name: "内容" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("已聚焦 3 条支撑内容")).toBeInTheDocument();
    expect(
      screen.getByText("手把手搭 Claude Code Code Review 流程")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/workbench/__tests__/report-evidence-bridge.test.tsx`

Expected: FAIL because the report tab and the bridge callback do not exist yet.

- [ ] **Step 3: Implement report rendering and the “查看支撑内容” bridge**

`src/components/workbench/date-strip.tsx`

```tsx
interface DateStripProps {
  title: string;
  items: Array<{
    date: string;
    label: string;
    subtitle: string;
    meta: string;
  }>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
}

export function DateStrip({ title, items, selectedDate, onSelectDate }: DateStripProps) {
  return (
    <section className="section-card">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="date-strip">
        {items.map((item) => (
          <button
            key={item.date}
            className={`date-card ${item.date === selectedDate ? "is-selected" : ""}`}
            onClick={() => onSelectDate(item.date)}
          >
            <strong>{item.label}</strong>
            <span>{item.subtitle}</span>
            <small>{item.meta}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
```

`src/components/workbench/report-tab.tsx`

```tsx
import { DailyReport } from "@/lib/types";
import { DateStrip } from "@/components/workbench/date-strip";

interface ReportTabProps {
  reports: DailyReport[];
  selectedDate: string;
  reportView: "daily" | "summary";
  onSelectDate: (date: string) => void;
  onChangeView: (view: "daily" | "summary") => void;
  onViewEvidence: (topicId: string, contentIds: string[], reportDate: string) => void;
}

export function ReportTab({
  reports,
  selectedDate,
  reportView,
  onSelectDate,
  onChangeView,
  onViewEvidence
}: ReportTabProps) {
  const current = reports.find((report) => report.date === selectedDate) ?? reports[0];

  return (
    <section className="section-stack">
      <DateStrip
        title="最近报告"
        items={reports.map((report) => ({
          date: report.date,
          label: report.date,
          subtitle: report.hotSummary,
          meta: `${report.topicCount} 个选题 · ${report.platformsInvolved} 平台`
        }))}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="tabs secondary-tabs" role="tablist" aria-label="报告视图">
        <button
          role="tab"
          aria-selected={reportView === "daily"}
          className={`tab-button ${reportView === "daily" ? "is-active" : ""}`}
          onClick={() => onChangeView("daily")}
        >
          日报视图
        </button>
        <button
          role="tab"
          aria-selected={reportView === "summary"}
          className={`tab-button ${reportView === "summary" ? "is-active" : ""}`}
          onClick={() => onChangeView("summary")}
        >
          选题汇总
        </button>
      </div>

      <article className="section-card">
        <h2>今日热点总结</h2>
        <p>{current.hotSummary}</p>
        <p>{current.focusSummary}</p>
        <p>{current.patternSummary}</p>

        {current.topics.map((topic) => (
          <section key={topic.id} className="topic-card">
            <h3>{topic.title}</h3>
            <p>{topic.brief}</p>
            <div className="topic-meta">
              <span>来源平台：{topic.sourcePlatforms.join(" / ")}</span>
              <span>支撑内容：{topic.evidenceCount} 条</span>
              <span>趋势强度：{topic.confidence}</span>
            </div>
            <button
              className="ghost-button"
              onClick={() => onViewEvidence(topic.id, topic.evidence[0].contentIds, current.date)}
            >
              查看支撑内容
            </button>
          </section>
        ))}
      </article>
    </section>
  );
}
```

`src/components/workbench/monitoring-workbench.tsx`

```tsx
"use client";

import { useState } from "react";
import { monitorCategories } from "@/lib/mock-data";
import {
  buildInitialWorkbenchState,
  getActiveCategory
} from "@/lib/workbench-selectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { CategorySidebar } from "@/components/workbench/category-sidebar";
import { ReportTab } from "@/components/workbench/report-tab";
import { RightRail } from "@/components/workbench/right-rail";
import { WorkbenchHeader } from "@/components/workbench/workbench-header";

const initialState = buildInitialWorkbenchState(monitorCategories);

export function MonitoringWorkbench() {
  const [state, setState] = useState(initialState);
  const activeCategory = getActiveCategory(monitorCategories, state.selectedCategoryId);

  return (
    <div className="workbench-shell">
      <CategorySidebar
        categories={monitorCategories}
        selectedCategoryId={state.selectedCategoryId}
        onSelectCategory={(selectedCategoryId) => {
          const nextCategory = getActiveCategory(monitorCategories, selectedCategoryId);
          const nextDate = nextCategory.reports[0]?.date ?? "";

          setState({
            selectedCategoryId,
            activeTab: "report",
            reportView: "daily",
            selectedReportDate: nextDate,
            selectedContentDate: nextDate,
            selectedPlatformId: "all",
            focusedTopicId: nextCategory.reports[0]?.topics[0]?.id ?? null,
            highlightedContentIds: []
          });
        }}
      />

      <main className="workbench-main">
        <WorkbenchHeader category={activeCategory} />
        <ActionDeck items={activeCategory.actionItems} />
        <div className="tabs" role="tablist" aria-label="主工作区标签">
          <button
            role="tab"
            aria-selected={state.activeTab === "content"}
            className={`tab-button ${state.activeTab === "content" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "content" }))}
          >
            内容
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "report"}
            className={`tab-button ${state.activeTab === "report" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "report" }))}
          >
            选题分析与报告
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "settings"}
            className={`tab-button ${state.activeTab === "settings" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "settings" }))}
          >
            监控设置
          </button>
        </div>

        {state.activeTab === "report" ? (
          <ReportTab
            reports={activeCategory.reports}
            selectedDate={state.selectedReportDate}
            reportView={state.reportView}
            onSelectDate={(selectedReportDate) =>
              setState((current) => ({ ...current, selectedReportDate }))
            }
            onChangeView={(reportView) =>
              setState((current) => ({ ...current, reportView }))
            }
            onViewEvidence={(focusedTopicId, highlightedContentIds, reportDate) =>
              setState((current) => ({
                ...current,
                activeTab: "content",
                focusedTopicId,
                selectedContentDate: reportDate,
                highlightedContentIds
              }))
            }
          />
        ) : null}
      </main>

      <RightRail signals={activeCategory.decisionSignals} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/workbench/__tests__/report-evidence-bridge.test.tsx`

Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit the report tab**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/components/workbench/date-strip.tsx src/components/workbench/report-tab.tsx src/components/workbench/__tests__/report-evidence-bridge.test.tsx
git commit -m "feat: add report tab and evidence bridge"
```

## Task 6: Implement the Content Tab and Reverse Insight Bridge

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Create: `src/components/workbench/content-tab.tsx`
- Create: `src/components/workbench/__tests__/content-insight-bridge.test.tsx`

- [ ] **Step 1: Write the failing content bridge test**

`src/components/workbench/__tests__/content-insight-bridge.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("content to report bridge", () => {
  it("filters by platform and jumps back to the linked insight", async () => {
    const user = userEvent.setup();
    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("tab", { name: "内容" }));
    await user.click(screen.getByRole("button", { name: /小红书/ }));

    expect(
      screen.getByText("从脚本到 Agent，运营人怎样搭内容自动化")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /查看关联洞察/ }));

    expect(screen.getByRole("tab", { name: "选题分析与报告" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByText("AI 编码陪跑工作流")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/workbench/__tests__/content-insight-bridge.test.tsx`

Expected: FAIL because the content tab does not exist yet.

- [ ] **Step 3: Implement content filters, highlighted evidence, and reverse jump**

`src/components/workbench/content-tab.tsx`

```tsx
import { ContentItem, PlatformId } from "@/lib/types";
import { DateStrip } from "@/components/workbench/date-strip";

interface ContentTabProps {
  dates: string[];
  selectedDate: string;
  selectedPlatformId: PlatformId;
  contentItems: ContentItem[];
  highlightedCount: number;
  onSelectDate: (date: string) => void;
  onSelectPlatform: (platformId: PlatformId) => void;
  onJumpToTopic: (topicId: string, reportDate: string) => void;
}

const platformButtons: { id: PlatformId; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "douyin", label: "抖音" },
  { id: "xiaohongshu", label: "小红书" },
  { id: "weibo", label: "微博" },
  { id: "bilibili", label: "B站" }
];

export function ContentTab({
  dates,
  selectedDate,
  selectedPlatformId,
  contentItems,
  highlightedCount,
  onSelectDate,
  onSelectPlatform,
  onJumpToTopic
}: ContentTabProps) {
  return (
    <section className="section-stack">
      {highlightedCount > 0 ? (
        <div className="focus-banner">已聚焦 {highlightedCount} 条支撑内容</div>
      ) : null}

      <div className="chip-row">
        {platformButtons.map((platform) => (
          <button
            key={platform.id}
            className={`chip ${platform.id === selectedPlatformId ? "is-selected" : ""}`}
            onClick={() => onSelectPlatform(platform.id)}
          >
            {platform.label}
          </button>
        ))}
      </div>

      <DateStrip
        title="最近内容"
        items={dates.map((date) => ({
          date,
          label: date,
          subtitle: "查看当天采集到的热门内容",
          meta: "按爆款与时间线展示"
        }))}
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
      />

      <div className="content-list">
        {contentItems.map((item) => (
          <article key={item.id} className="content-card">
            <div className="content-topline">
              <span>{item.platformId}</span>
              <span>{item.publishedAt}</span>
              <span>热度 {item.heatScore}</span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.aiSummary}</p>
            <div className="mini-meta">
              <span>{item.author}</span>
              <span>点赞 {item.metrics.likes}</span>
              <span>评论 {item.metrics.comments}</span>
              <span>收藏 {item.metrics.saves}</span>
            </div>
            <div className="button-row">
              <button className="ghost-button">收藏</button>
              <button className="ghost-button">标记重点</button>
              <button className="ghost-button">加入选题池</button>
              <button
                className="ghost-button"
                onClick={() => onJumpToTopic(item.linkedTopicIds[0], item.date)}
              >
                查看关联洞察
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

`src/components/workbench/monitoring-workbench.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { monitorCategories } from "@/lib/mock-data";
import {
  buildInitialWorkbenchState,
  getActiveCategory,
  getContentForDate
} from "@/lib/workbench-selectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { CategorySidebar } from "@/components/workbench/category-sidebar";
import { ContentTab } from "@/components/workbench/content-tab";
import { ReportTab } from "@/components/workbench/report-tab";
import { RightRail } from "@/components/workbench/right-rail";
import { WorkbenchHeader } from "@/components/workbench/workbench-header";

const initialState = buildInitialWorkbenchState(monitorCategories);

export function MonitoringWorkbench() {
  const [state, setState] = useState(initialState);
  const activeCategory = getActiveCategory(monitorCategories, state.selectedCategoryId);

  const contentItems = useMemo(
    () =>
      getContentForDate(
        activeCategory,
        state.selectedContentDate,
        state.selectedPlatformId,
        state.highlightedContentIds
      ),
    [
      activeCategory,
      state.highlightedContentIds,
      state.selectedContentDate,
      state.selectedPlatformId
    ]
  );

  return (
    <div className="workbench-shell">
      <CategorySidebar
        categories={monitorCategories}
        selectedCategoryId={state.selectedCategoryId}
        onSelectCategory={(selectedCategoryId) => {
          const nextCategory = getActiveCategory(monitorCategories, selectedCategoryId);
          const nextDate = nextCategory.reports[0]?.date ?? "";

          setState({
            selectedCategoryId,
            activeTab: "report",
            reportView: "daily",
            selectedReportDate: nextDate,
            selectedContentDate: nextDate,
            selectedPlatformId: "all",
            focusedTopicId: nextCategory.reports[0]?.topics[0]?.id ?? null,
            highlightedContentIds: []
          });
        }}
      />

      <main className="workbench-main">
        <WorkbenchHeader category={activeCategory} />
        <ActionDeck items={activeCategory.actionItems} />
        <div className="tabs" role="tablist" aria-label="主工作区标签">
          <button
            role="tab"
            aria-selected={state.activeTab === "content"}
            className={`tab-button ${state.activeTab === "content" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "content" }))}
          >
            内容
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "report"}
            className={`tab-button ${state.activeTab === "report" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "report" }))}
          >
            选题分析与报告
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "settings"}
            className={`tab-button ${state.activeTab === "settings" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "settings" }))}
          >
            监控设置
          </button>
        </div>

        {state.activeTab === "report" ? (
          <ReportTab
            reports={activeCategory.reports}
            selectedDate={state.selectedReportDate}
            reportView={state.reportView}
            onSelectDate={(selectedReportDate) =>
              setState((current) => ({ ...current, selectedReportDate }))
            }
            onChangeView={(reportView) =>
              setState((current) => ({ ...current, reportView }))
            }
            onViewEvidence={(focusedTopicId, highlightedContentIds, reportDate) =>
              setState((current) => ({
                ...current,
                activeTab: "content",
                focusedTopicId,
                selectedContentDate: reportDate,
                highlightedContentIds
              }))
            }
          />
        ) : null}

        {state.activeTab === "content" ? (
          <ContentTab
            dates={activeCategory.reports.map((report) => report.date)}
            selectedDate={state.selectedContentDate}
            selectedPlatformId={state.selectedPlatformId}
            contentItems={contentItems}
            highlightedCount={state.highlightedContentIds.length}
            onSelectDate={(selectedContentDate) =>
              setState((current) => ({ ...current, selectedContentDate }))
            }
            onSelectPlatform={(selectedPlatformId) =>
              setState((current) => ({ ...current, selectedPlatformId }))
            }
            onJumpToTopic={(focusedTopicId, reportDate) =>
              setState((current) => ({
                ...current,
                activeTab: "report",
                focusedTopicId,
                selectedReportDate: reportDate,
                highlightedContentIds: []
              }))
            }
          />
        ) : null}
      </main>

      <RightRail signals={activeCategory.decisionSignals} />
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- src/components/workbench/__tests__/content-insight-bridge.test.tsx`

Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit the content tab**

```bash
git add src/components/workbench/monitoring-workbench.tsx src/components/workbench/content-tab.tsx src/components/workbench/__tests__/content-insight-bridge.test.tsx
git commit -m "feat: add content tab and insight bridge"
```

## Task 7: Implement Settings, Quality Feedback, and Final Verification

**Files:**
- Modify: `src/components/workbench/monitoring-workbench.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/workbench/settings-tab.tsx`
- Create: `src/components/workbench/__tests__/settings-tab.test.tsx`

- [ ] **Step 1: Write the failing settings test**

`src/components/workbench/__tests__/settings-tab.test.tsx`

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonitoringWorkbench } from "@/components/workbench/monitoring-workbench";

describe("settings tab", () => {
  it("shows configuration quality feedback and add-entry actions", async () => {
    const user = userEvent.setup();
    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("tab", { name: "监控设置" }));

    expect(screen.getByText("最近抓取成功率")).toBeInTheDocument();
    expect(screen.getByText("疑似过宽")).toBeInTheDocument();
    expect(screen.getByText("长期无有效信号")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加关键词" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加账号" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- src/components/workbench/__tests__/settings-tab.test.tsx`

Expected: FAIL because the settings tab is not rendered yet.

- [ ] **Step 3: Implement the settings tab and mount it in the container**

`src/components/workbench/settings-tab.tsx`

```tsx
import { MonitorCategory } from "@/lib/types";

export function SettingsTab({ category }: { category: MonitorCategory }) {
  return (
    <section className="section-stack">
      <article className="section-card">
        <div className="section-header">
          <h2>监控平台</h2>
          <p>最近抓取成功率与有效样本占比决定平台是否继续保留。</p>
        </div>
        <div className="card-grid">
          {category.settings.platforms.map((platform) => (
            <section key={platform.id} className="config-card">
              <h3>{platform.label}</h3>
              <p>{platform.enabled ? "已启用" : "未启用"}</p>
              <ul>
                <li>最近同步时间：{platform.syncedAt}</li>
                <li>最近抓取成功率：{platform.successRate}</li>
                <li>有效样本占比：{platform.qualityRate}</li>
                <li>建议：{platform.recommendation}</li>
              </ul>
            </section>
          ))}
        </div>
      </article>

      <article className="section-card">
        <div className="section-header">
          <h2>对标关键词</h2>
          <button className="ghost-button">添加关键词</button>
        </div>
        <div className="card-grid">
          {category.settings.keywords.map((keyword) => (
            <section key={keyword.id} className="config-card">
              <h3>{keyword.label}</h3>
              <p>{keyword.platformLabels}</p>
              <ul>
                <li>命中内容数：{keyword.hitCount}</li>
                <li>近 7 天高质量命中占比：{keyword.qualityRate}</li>
                <li>{keyword.qualityHint}</li>
                <li>{keyword.overlapHint}</li>
              </ul>
            </section>
          ))}
        </div>
      </article>

      <article className="section-card">
        <div className="section-header">
          <h2>对标博主 / 账号</h2>
          <button className="ghost-button">添加账号</button>
        </div>
        <div className="card-grid">
          {category.settings.creators.map((creator) => (
            <section key={creator.id} className="config-card">
              <h3>{creator.name}</h3>
              <p>{creator.platformLabel}</p>
              <ul>
                <li>{creator.profile}</li>
                <li>高热样本贡献数：{creator.hotSampleContribution}</li>
                <li>{creator.healthHint}</li>
              </ul>
            </section>
          ))}
        </div>
      </article>

      <article className="section-card">
        <div className="section-header">
          <h2>运行规则</h2>
        </div>
        <ul>
          <li>执行频率：{category.settings.schedule.frequency}</li>
          <li>执行时间：{category.settings.schedule.time}</li>
          <li>分析范围：{category.settings.schedule.analysisScope}</li>
          <li>AI 分析引擎：{category.settings.schedule.model}</li>
        </ul>
      </article>
    </section>
  );
}
```

Append to `src/app/globals.css`

```css
.panel-stack,
.section-stack,
.card-grid,
.content-list,
.category-list {
  display: grid;
  gap: 14px;
}

.section-card,
.category-card,
.action-card,
.topic-card,
.content-card,
.config-card,
.date-card {
  background: var(--panel-strong);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  padding: 18px;
}

.category-card,
.date-card,
.chip,
.ghost-button {
  cursor: pointer;
}

.category-card {
  text-align: left;
  border: 1px solid var(--line);
}

.category-card.is-selected,
.date-card.is-selected,
.chip.is-selected {
  border-color: rgba(213, 101, 58, 0.5);
  background: var(--accent-soft);
}

.search-input {
  width: 100%;
  padding: 12px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.8);
}

.ghost-button,
.chip {
  border: 1px solid var(--line);
  background: rgba(255, 255, 255, 0.88);
  border-radius: 999px;
  padding: 10px 14px;
}

.action-grid,
.topic-meta,
.metric-row,
.mini-meta,
.button-row,
.chip-row,
.content-topline,
.date-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.section-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.section-subtitle,
.focus-banner {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(40, 95, 75, 0.1);
  color: var(--success);
  width: fit-content;
}

.priority-badge {
  display: inline-flex;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--ink);
  color: white;
}
```

`src/components/workbench/monitoring-workbench.tsx`

```tsx
"use client";

import { useMemo, useState } from "react";
import { monitorCategories } from "@/lib/mock-data";
import {
  buildInitialWorkbenchState,
  getActiveCategory,
  getContentForDate
} from "@/lib/workbench-selectors";
import { ActionDeck } from "@/components/workbench/action-deck";
import { CategorySidebar } from "@/components/workbench/category-sidebar";
import { ContentTab } from "@/components/workbench/content-tab";
import { ReportTab } from "@/components/workbench/report-tab";
import { RightRail } from "@/components/workbench/right-rail";
import { SettingsTab } from "@/components/workbench/settings-tab";
import { WorkbenchHeader } from "@/components/workbench/workbench-header";

const initialState = buildInitialWorkbenchState(monitorCategories);

export function MonitoringWorkbench() {
  const [state, setState] = useState(initialState);
  const activeCategory = getActiveCategory(monitorCategories, state.selectedCategoryId);

  const contentItems = useMemo(
    () =>
      getContentForDate(
        activeCategory,
        state.selectedContentDate,
        state.selectedPlatformId,
        state.highlightedContentIds
      ),
    [
      activeCategory,
      state.highlightedContentIds,
      state.selectedContentDate,
      state.selectedPlatformId
    ]
  );

  return (
    <div className="workbench-shell">
      <CategorySidebar
        categories={monitorCategories}
        selectedCategoryId={state.selectedCategoryId}
        onSelectCategory={(selectedCategoryId) => {
          const nextCategory = getActiveCategory(monitorCategories, selectedCategoryId);
          const nextDate = nextCategory.reports[0]?.date ?? "";

          setState({
            selectedCategoryId,
            activeTab: "report",
            reportView: "daily",
            selectedReportDate: nextDate,
            selectedContentDate: nextDate,
            selectedPlatformId: "all",
            focusedTopicId: nextCategory.reports[0]?.topics[0]?.id ?? null,
            highlightedContentIds: []
          });
        }}
      />

      <main className="workbench-main">
        <WorkbenchHeader category={activeCategory} />
        <ActionDeck items={activeCategory.actionItems} />
        <div className="tabs" role="tablist" aria-label="主工作区标签">
          <button
            role="tab"
            aria-selected={state.activeTab === "content"}
            className={`tab-button ${state.activeTab === "content" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "content" }))}
          >
            内容
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "report"}
            className={`tab-button ${state.activeTab === "report" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "report" }))}
          >
            选题分析与报告
          </button>
          <button
            role="tab"
            aria-selected={state.activeTab === "settings"}
            className={`tab-button ${state.activeTab === "settings" ? "is-active" : ""}`}
            onClick={() => setState((current) => ({ ...current, activeTab: "settings" }))}
          >
            监控设置
          </button>
        </div>

        {state.activeTab === "report" ? (
          <ReportTab
            reports={activeCategory.reports}
            selectedDate={state.selectedReportDate}
            reportView={state.reportView}
            onSelectDate={(selectedReportDate) =>
              setState((current) => ({ ...current, selectedReportDate }))
            }
            onChangeView={(reportView) =>
              setState((current) => ({ ...current, reportView }))
            }
            onViewEvidence={(focusedTopicId, highlightedContentIds, reportDate) =>
              setState((current) => ({
                ...current,
                activeTab: "content",
                focusedTopicId,
                selectedContentDate: reportDate,
                highlightedContentIds
              }))
            }
          />
        ) : null}

        {state.activeTab === "content" ? (
          <ContentTab
            dates={activeCategory.reports.map((report) => report.date)}
            selectedDate={state.selectedContentDate}
            selectedPlatformId={state.selectedPlatformId}
            contentItems={contentItems}
            highlightedCount={state.highlightedContentIds.length}
            onSelectDate={(selectedContentDate) =>
              setState((current) => ({ ...current, selectedContentDate }))
            }
            onSelectPlatform={(selectedPlatformId) =>
              setState((current) => ({ ...current, selectedPlatformId }))
            }
            onJumpToTopic={(focusedTopicId, reportDate) =>
              setState((current) => ({
                ...current,
                activeTab: "report",
                focusedTopicId,
                selectedReportDate: reportDate,
                highlightedContentIds: []
              }))
            }
          />
        ) : null}

        {state.activeTab === "settings" ? <SettingsTab category={activeCategory} /> : null}
      </main>

      <RightRail signals={activeCategory.decisionSignals} />
    </div>
  );
}
```

- [ ] **Step 4: Run the settings test to verify it passes**

Run: `npm run test -- src/components/workbench/__tests__/settings-tab.test.tsx`

Expected: PASS with 1 passing test.

- [ ] **Step 5: Run the full verification suite**

Run: `npm run test`
Expected: All selector and component tests pass.

Run: `npm run lint`
Expected: ESLint exits cleanly with no errors.

Run: `npm run build`
Expected: Next.js production build succeeds.

Run: `npm run dev`
Expected: Local preview starts, the first screen shows “今日建议动作区” above the latest report, and all three tabs are interactive.

- [ ] **Step 6: Commit the settings and verification pass**

```bash
git add src/app/globals.css src/components/workbench/monitoring-workbench.tsx src/components/workbench/settings-tab.tsx src/components/workbench/__tests__/settings-tab.test.tsx
git commit -m "feat: add monitoring settings and quality feedback"
```

## Self-Review Notes

- Spec coverage: covered shell layout, action deck, report evidence chain, content/report bridges, settings quality feedback, and realistic mock data. No spec section is left without an implementation task.
- Placeholder scan: no `TODO`, `TBD`, or “implement later” placeholders remain in the plan steps.
- Type consistency: `WorkbenchState`, `TopicIdea`, `MonitorCategory`, `ActionItem`, and bridge callbacks use one naming scheme across tasks.
