// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = {
  database: {
    close: vi.fn()
  }
};

const createMonitoringRepositoryMock = vi.fn(() => repository);
const getKeywordTargetByIdMock = vi.fn();
const runKeywordTopicAnalysisMock = vi.fn();

vi.mock("@/lib/db/monitoring-repository", () => ({
  createMonitoringRepository: createMonitoringRepositoryMock,
  getKeywordTargetById: getKeywordTargetByIdMock
}));

vi.mock("@/lib/analysis-orchestrator", () => ({
  runKeywordTopicAnalysis: runKeywordTopicAnalysisMock
}));

describe("POST /api/analysis/run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.database.close.mockReset();
    getKeywordTargetByIdMock.mockReturnValue(undefined);
    runKeywordTopicAnalysisMock.mockResolvedValue({
      report: {
        id: "snapshot-1",
        date: "2026-04-03",
        label: "2026-04-03",
        hotSummary: "hot",
        focusSummary: "focus",
        patternSummary: "pattern",
        insightSummary: "insight",
        suggestions: new Array(5).fill(null).map((_, index) => ({
          id: `topic-${index + 1}`,
          title: `Topic ${index + 1}`,
          intro: "intro",
          whyNow: "why",
          hook: "hook",
          growth: "growth",
          supportContentIds: ["content-1"]
        }))
      },
      snapshotDetail: {
        snapshot: {
          id: "snapshot-1",
          searchQueryId: "analysis-run-1",
          categoryId: "claude",
          keyword: "claude code",
          generatedAt: "2026-04-03T09:30:00.000Z",
          hotSummary: "hot",
          focusSummary: "focus",
          patternSummary: "pattern",
          insightSummary: "insight"
        },
        topics: []
      },
      evidenceItems: [
        {
          id: "evidence-1",
          snapshotId: "snapshot-1",
          contentId: "content-1",
          keyword: "claude code",
          platformId: "wechat",
          title: "Evidence title",
          briefSummary: "brief",
          keyFacts: ["fact"],
          keywords: ["claude code"],
          highlights: ["highlight"],
          attentionSignals: ["signal"],
          topicAngles: ["angle"],
          createdAt: "2026-04-03T09:30:00.000Z"
        }
      ],
      contentItems: [],
      refreshedPlatforms: ["wechat", "xiaohongshu"]
    });
  });

  it("runs a manual analysis for the current keyword and returns report detail", async () => {
    const { POST } = await import("@/app/api/analysis/run/route");

    const request = new NextRequest("http://localhost/api/analysis/run", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "claude",
        keywordTargetId: "claude-keyword-1",
        keyword: "claude code",
        platformIds: ["wechat", "xiaohongshu"]
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(runKeywordTopicAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "claude",
        platformIds: ["wechat", "xiaohongshu"],
        mode: "manual"
      })
    );
    expect(payload).toEqual({
      report: expect.objectContaining({
        id: "snapshot-1",
        date: "2026-04-03"
      }),
      detail: expect.objectContaining({
        snapshot: expect.objectContaining({
          id: "snapshot-1"
        }),
        evidenceItems: expect.any(Array)
      }),
      meta: {
        refreshedPlatforms: ["wechat", "xiaohongshu"],
        skipped: false
      }
    });
    expect(repository.database.close).toHaveBeenCalledTimes(1);
  });
});
