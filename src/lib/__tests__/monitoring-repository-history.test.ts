// @vitest-environment node

import { describe, expect, it } from "vitest";

import { initializeMonitoringDatabase } from "@/lib/db/database";
import {
  coerceSearchQueryTriggerType,
  coerceSyncRunStatus,
  createMonitoringRepository,
  createSearchQuery,
  finishSearchQuery,
  getAnalysisSnapshotBySearchQuery,
  listAnalysisSnapshotsByKeyword,
  listSearchQueryContents,
  listSearchQueries,
  replaceSearchQueryContents,
  upsertAnalysisSnapshot
} from "@/lib/db/monitoring-repository";

describe("monitoring history schema", () => {
  it("coerces persisted string values into known trigger and status enums", () => {
    expect(coerceSearchQueryTriggerType("keyword_created")).toBe("keyword_created");
    expect(coerceSearchQueryTriggerType("unexpected")).toBe("manual_refresh");
    expect(coerceSyncRunStatus("success")).toBe("success");
    expect(coerceSyncRunStatus("unexpected")).toBe("idle");
  });

  it("creates query history and analysis archive tables with lookup indexes", () => {
    const database = initializeMonitoringDatabase(":memory:");

    const tables = (
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((row) => row.name);

    expect(tables).toEqual(
      expect.arrayContaining(["search_queries", "analysis_snapshots", "analysis_topics"])
    );

    const indexes = (
      database
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' ORDER BY name")
        .all() as Array<{ name: string }>
    ).map((row) => row.name);

    expect(indexes).toEqual(
      expect.arrayContaining([
        "search_queries_lookup_idx",
        "analysis_snapshots_lookup_idx",
        "analysis_topics_lookup_idx"
      ])
    );

    database.close();
  });

  it("persists search queries and returns them in reverse chronological order", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    createSearchQuery(repository, {
      id: "query-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "openclaw",
      platformScope: "xiaohongshu",
      triggerType: "manual_refresh",
      status: "running",
      fetchedCount: 0,
      cappedCount: 0,
      startedAt: "2026-03-31T09:00:00.000Z",
      finishedAt: null,
      errorMessage: null
    });

    createSearchQuery(repository, {
      id: "query-2",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "openclaw",
      platformScope: "all",
      triggerType: "keyword_created",
      status: "running",
      fetchedCount: 3,
      cappedCount: 2,
      startedAt: "2026-03-31T10:00:00.000Z",
      finishedAt: null,
      errorMessage: null
    });

    finishSearchQuery(repository, {
      id: "query-1",
      status: "success",
      fetchedCount: 12,
      cappedCount: 8,
      finishedAt: "2026-03-31T09:05:00.000Z",
      errorMessage: null
    });

    const searchQueries = listSearchQueries(repository, "claude");

    expect(searchQueries.map((query) => query.id)).toEqual(["query-2", "query-1"]);
    expect(searchQueries[1]).toMatchObject({
      id: "query-1",
      triggerType: "manual_refresh",
      status: "success",
      fetchedCount: 12,
      cappedCount: 8,
      finishedAt: "2026-03-31T09:05:00.000Z"
    });

    database.close();
  });

  it("stores analysis snapshots with topics and resolves the latest snapshot for a query", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    createSearchQuery(repository, {
      id: "query-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "openclaw",
      platformScope: "xiaohongshu",
      triggerType: "manual_refresh",
      status: "running",
      fetchedCount: 0,
      cappedCount: 0,
      startedAt: "2026-03-31T09:00:00.000Z",
      finishedAt: null,
      errorMessage: null
    });

    upsertAnalysisSnapshot(repository, {
      snapshot: {
        id: "snapshot-1",
        searchQueryId: "query-1",
        categoryId: "claude",
        keyword: "openclaw",
        generatedAt: "2026-03-31T09:03:00.000Z",
        hotSummary: "hot-1",
        focusSummary: "focus-1",
        patternSummary: "pattern-1",
        insightSummary: "insight-1"
      },
      topics: [
        {
          id: "topic-1",
          snapshotId: "snapshot-1",
          title: "topic one",
          intro: "intro one",
          whyNow: "why now one",
          hook: "hook one",
          growth: "growth one",
          supportContentIds: ["content-1", "content-2"]
        }
      ]
    });

    upsertAnalysisSnapshot(repository, {
      snapshot: {
        id: "snapshot-2",
        searchQueryId: "query-1",
        categoryId: "claude",
        keyword: "openclaw",
        generatedAt: "2026-03-31T09:06:00.000Z",
        hotSummary: "hot-2",
        focusSummary: "focus-2",
        patternSummary: "pattern-2",
        insightSummary: "insight-2"
      },
      topics: [
        {
          id: "topic-2",
          snapshotId: "snapshot-2",
          title: "topic two",
          intro: "intro two",
          whyNow: "why now two",
          hook: "hook two",
          growth: "growth two",
          supportContentIds: ["content-3"]
        }
      ]
    });

    const snapshot = getAnalysisSnapshotBySearchQuery(repository, "query-1");

    expect(snapshot).toMatchObject({
      snapshot: {
        id: "snapshot-2",
        searchQueryId: "query-1",
        hotSummary: "hot-2"
      },
      topics: [
        {
          id: "topic-2",
          snapshotId: "snapshot-2",
          title: "topic two",
          supportContentIds: ["content-3"]
        }
      ]
    });

    database.close();
  });

  it("lists the latest analysis snapshots for a category keyword without mixing other keywords", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    upsertAnalysisSnapshot(repository, {
      snapshot: {
        id: "snapshot-claude-new",
        searchQueryId: "query-claude-new",
        categoryId: "claude",
        keyword: "claude code",
        generatedAt: "2026-04-03T09:45:00.000Z",
        hotSummary: "claude-hot-new",
        focusSummary: "claude-focus-new",
        patternSummary: "claude-pattern-new",
        insightSummary: "claude-insight-new"
      },
      topics: []
    });

    upsertAnalysisSnapshot(repository, {
      snapshot: {
        id: "snapshot-claude-old",
        searchQueryId: "query-claude-old",
        categoryId: "claude",
        keyword: "claude code",
        generatedAt: "2026-04-02T09:45:00.000Z",
        hotSummary: "claude-hot-old",
        focusSummary: "claude-focus-old",
        patternSummary: "claude-pattern-old",
        insightSummary: "claude-insight-old"
      },
      topics: []
    });

    upsertAnalysisSnapshot(repository, {
      snapshot: {
        id: "snapshot-other-keyword",
        searchQueryId: "query-other-keyword",
        categoryId: "claude",
        keyword: "openclaw",
        generatedAt: "2026-04-03T10:45:00.000Z",
        hotSummary: "other-hot",
        focusSummary: "other-focus",
        patternSummary: "other-pattern",
        insightSummary: "other-insight"
      },
      topics: []
    });

    const reports = listAnalysisSnapshotsByKeyword(repository, "claude", "claude code", 14);

    expect(reports.map((detail) => detail.snapshot.id)).toEqual([
      "snapshot-claude-new",
      "snapshot-claude-old"
    ]);

    database.close();
  });

  it("keeps independent content snapshots for different search queries under the same keyword target", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    createSearchQuery(repository, {
      id: "query-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "claude code",
      platformScope: "xiaohongshu",
      triggerType: "manual_refresh",
      status: "success",
      fetchedCount: 2,
      cappedCount: 2,
      startedAt: "2026-04-01T09:00:00.000Z",
      finishedAt: "2026-04-01T09:01:00.000Z",
      errorMessage: null
    });

    createSearchQuery(repository, {
      id: "query-2",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "claude code",
      platformScope: "xiaohongshu",
      triggerType: "manual_refresh",
      status: "success",
      fetchedCount: 1,
      cappedCount: 1,
      startedAt: "2026-04-01T10:00:00.000Z",
      finishedAt: "2026-04-01T10:01:00.000Z",
      errorMessage: null
    });

    replaceSearchQueryContents(repository, {
      searchQueryId: "query-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      collectedAt: "2026-04-01T09:01:00.000Z",
      items: [
        {
          id: "xhs-older-1",
          date: "2026-04-01",
          timeOfDay: "morning",
          title: "older snapshot result",
          platformId: "xiaohongshu",
          author: "older author",
          authorName: "older author",
          authorId: "older-author",
          publishedAt: "2026-04-01 09:00:00",
          publishTime: "2026-04-01 09:00:00",
          publishTimestamp: 1711962000,
          heatScore: 80,
          metrics: { likes: "10", comments: "3", saves: "2" },
          matchedTargets: ["claude code"],
          aiSummary: "older summary",
          summary: "older summary",
          linkedTopicIds: [],
          includedInDailyReport: false,
          inTopicPool: false,
          keyword: "claude code",
          articleUrl: "https://example.com/older",
          sourceUrl: "https://example.com/older",
          rawOrderIndex: 0
        }
      ]
    });

    replaceSearchQueryContents(repository, {
      searchQueryId: "query-2",
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      collectedAt: "2026-04-01T10:01:00.000Z",
      items: [
        {
          id: "xhs-newer-1",
          date: "2026-04-01",
          timeOfDay: "noon",
          title: "newer snapshot result",
          platformId: "xiaohongshu",
          author: "newer author",
          authorName: "newer author",
          authorId: "newer-author",
          publishedAt: "2026-04-01 10:00:00",
          publishTime: "2026-04-01 10:00:00",
          publishTimestamp: 1711965600,
          heatScore: 92,
          metrics: { likes: "20", comments: "5", saves: "6" },
          matchedTargets: ["claude code"],
          aiSummary: "newer summary",
          summary: "newer summary",
          linkedTopicIds: [],
          includedInDailyReport: false,
          inTopicPool: false,
          keyword: "claude code",
          articleUrl: "https://example.com/newer",
          sourceUrl: "https://example.com/newer",
          rawOrderIndex: 0
        }
      ]
    });

    const firstSnapshot = listSearchQueryContents(repository, { searchQueryId: "query-1" });
    const secondSnapshot = listSearchQueryContents(repository, { searchQueryId: "query-2" });

    expect(firstSnapshot.map((item) => item.title)).toEqual(["older snapshot result"]);
    expect(secondSnapshot.map((item) => item.title)).toEqual(["newer snapshot result"]);

    database.close();
  });
});
