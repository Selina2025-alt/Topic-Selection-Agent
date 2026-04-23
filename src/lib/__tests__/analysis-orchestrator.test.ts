// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  createMonitoringRepository,
  getAnalysisEvidenceItemsBySnapshotId,
  initializeMonitoringDatabase,
  listAnalysisSnapshotsByKeyword,
  type PersistedKeywordTarget
} from "@/lib/db/monitoring-repository";
import { runKeywordTopicAnalysis } from "@/lib/analysis-orchestrator";
import type { ContentItem } from "@/lib/types";

describe("analysis orchestrator", () => {
  it("refreshes enabled platforms, runs AI analysis, and persists snapshot evidence", async () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);
    const keywordTarget = buildKeywordTarget();

    const refreshPlatform = vi
      .fn()
      .mockResolvedValueOnce(buildSnapshot("wechat", "wechat-1", "2026-04-03 08:00:00"))
      .mockResolvedValueOnce(buildSnapshot("xiaohongshu", "xhs-1", "2026-04-03 08:10:00"));

    const analyze = vi.fn().mockResolvedValue({
      evidenceItems: [
        {
          contentId: "wechat-1",
          title: "Wechat title",
          platform: "wechat",
          author: "Author 1",
          briefSummary: "brief summary",
          keyFacts: ["fact"],
          keywords: ["claude code"],
          highlights: ["highlight"],
          attentionSignals: ["signal"],
          topicAngles: ["angle"]
        }
      ],
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
          coreKeywords: ["claude code"],
          supportContentIds: ["wechat-1"],
          evidenceSummary: "evidence"
        }))
      }
    });

    const result = await runKeywordTopicAnalysis({
      repository,
      categoryId: "claude",
      keywordTarget,
      platformIds: ["wechat", "xiaohongshu"],
      mode: "manual",
      refreshPlatform,
      analyze,
      client: {} as never,
      now: () => "2026-04-03T09:30:00.000Z"
    });

    expect(refreshPlatform).toHaveBeenCalledTimes(2);
    expect(analyze).toHaveBeenCalledTimes(1);
    expect(result.report.date).toBe("2026-04-03");
    expect(result.snapshotDetail.topics).toHaveLength(5);

    const persistedReports = listAnalysisSnapshotsByKeyword(repository, "claude", "claude code", 14);
    expect(persistedReports).toHaveLength(1);
    expect(persistedReports[0]?.topics).toHaveLength(5);

    const persistedEvidence = getAnalysisEvidenceItemsBySnapshotId(
      repository,
      result.snapshotDetail.snapshot.id
    );
    expect(persistedEvidence).toHaveLength(1);
    expect(persistedEvidence[0]?.contentId).toBe("wechat-1");

    database.close();
  });

  it("skips scheduled analysis when the previous day has no data", async () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);
    const keywordTarget = buildKeywordTarget();

    const refreshPlatform = vi.fn().mockResolvedValue(
      buildSnapshot("wechat", "wechat-1", "2026-04-03 08:00:00")
    );
    const analyze = vi.fn();

    const result = await runKeywordTopicAnalysis({
      repository,
      categoryId: "claude",
      keywordTarget,
      platformIds: ["wechat"],
      mode: "scheduled",
      refreshPlatform,
      analyze,
      client: {} as never,
      now: () => "2026-04-03T09:30:00.000Z"
    });

    expect(result).toEqual({
      skipped: true,
      reason: "No eligible content from the previous day"
    });
    expect(analyze).not.toHaveBeenCalled();

    database.close();
  });
});

function buildKeywordTarget(): PersistedKeywordTarget {
  return {
    id: "claude-keyword-1",
    categoryId: "claude",
    keyword: "claude code",
    platformIds: ["wechat", "xiaohongshu"],
    createdAt: "2026-04-02T08:00:00.000Z",
    lastRunAt: null,
    lastRunStatus: "idle",
    lastResultCount: 0
  };
}

function buildSnapshot(
  platformId: "wechat" | "xiaohongshu" | "twitter",
  itemId: string,
  publishedAt: string
) {
  const item = buildContentItem(platformId, itemId, publishedAt);

  return {
    searchQueryId: `query-${platformId}-${itemId}`,
    platformId,
    fetchedCount: 1,
    cappedCount: 1,
    rawItems: [item],
    items: [item]
  };
}

function buildContentItem(
  platformId: "wechat" | "xiaohongshu" | "twitter",
  id: string,
  publishedAt: string
): ContentItem {
  return {
    id,
    date: publishedAt.slice(0, 10),
    timeOfDay: "上午",
    title: `${platformId} title`,
    platformId,
    author: "Author 1",
    authorName: "Author 1",
    authorId: "author-1",
    summary: "summary",
    publishedAt,
    publishTime: publishedAt,
    publishTimestamp: Date.parse(publishedAt.replace(" ", "T")),
    heatScore: 90,
    metrics: {
      likes: "100",
      comments: "20",
      saves: "30"
    },
    likeCount: 100,
    readCount: 1000,
    matchedTargets: ["claude code"],
    aiSummary: "summary",
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    keyword: "claude code",
    articleUrl: "https://example.com/article",
    sourceUrl: "https://example.com/article"
  };
}
