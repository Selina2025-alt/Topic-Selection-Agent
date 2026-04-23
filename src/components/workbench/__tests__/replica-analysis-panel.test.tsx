import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  ReplicaAnalysisPanel,
  type ReplicaAnalysisDetail
} from "@/components/workbench/replica-analysis-panel";
import type { ReplicaDailyReport } from "@/lib/replica-workbench-data";

describe("replica analysis panel", () => {
  it("renders the daily report, supports summary mode, and exposes the run button", async () => {
    const user = userEvent.setup();
    const onSelectMode = vi.fn();
    const onRunAnalysis = vi.fn();

    render(
      <ReplicaAnalysisPanel
        reports={[buildReport()]}
        selectedReportId="report-1"
        analysisMode="daily"
        reportWindow={7}
        isRunning={false}
        statusMessage=""
        detail={buildDetail()}
        selectedSupportTopicId={null}
        onSelectReport={vi.fn()}
        onSelectMode={onSelectMode}
        onSelectWindow={vi.fn()}
        onRunAnalysis={onRunAnalysis}
        onViewSupportContent={vi.fn()}
      />
    );

    expect(screen.getByText("今日热点摘要")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即分析" })).toBeInTheDocument();
    expect(screen.getByText("Article evidence")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "汇总" }));
    expect(onSelectMode).toHaveBeenCalledWith("summary");

    await user.click(screen.getByRole("button", { name: "立即分析" }));
    expect(onRunAnalysis).toHaveBeenCalledTimes(1);
  });
});

function buildReport(): ReplicaDailyReport {
  return {
    id: "report-1",
    date: "2026-04-03",
    label: "2026-04-03",
    hotSummary: "hot",
    focusSummary: "focus",
    patternSummary: "pattern",
    insightSummary: "insight",
    suggestions: [
      {
        id: "topic-1",
        title: "Topic 1",
        intro: "intro",
        whyNow: "why",
        hook: "hook",
        growth: "growth",
        supportContentIds: ["content-1"]
      }
    ]
  };
}

function buildDetail(): ReplicaAnalysisDetail {
  return {
    snapshot: {
      id: "report-1",
      searchQueryId: "analysis-run-1",
      categoryId: "claude",
      keyword: "claude code",
      generatedAt: "2026-04-03T09:00:00.000Z",
      hotSummary: "hot",
      focusSummary: "focus",
      patternSummary: "pattern",
      insightSummary: "insight"
    },
    topics: [
      {
        id: "topic-1",
        snapshotId: "report-1",
        title: "Topic 1",
        intro: "intro",
        whyNow: "why",
        hook: "hook",
        growth: "growth",
        supportContentIds: ["content-1"]
      }
    ],
    evidenceItems: [
      {
        id: "evidence-1",
        snapshotId: "report-1",
        contentId: "content-1",
        keyword: "claude code",
        platformId: "wechat",
        title: "Article evidence",
        briefSummary: "brief",
        keyFacts: ["fact"],
        keywords: ["claude code"],
        highlights: ["highlight"],
        attentionSignals: ["signal"],
        topicAngles: ["angle"],
        createdAt: "2026-04-03T09:00:00.000Z"
      }
    ]
  };
}
