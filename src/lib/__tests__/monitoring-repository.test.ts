// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createMonitoringRepository,
  createSyncRun,
  finishSyncRun,
  initializeMonitoringDatabase,
  listCollectedContents,
  listKeywordTargets,
  upsertCollectedContents,
  upsertKeywordTarget
} from "@/lib/db/monitoring-repository";
import type { ContentItem } from "@/lib/types";

describe("monitoring repository", () => {
  it("persists keyword targets with multi-platform bindings", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    upsertKeywordTarget(repository, {
      id: "target-1",
      categoryId: "claude",
      keyword: "openclaw",
      platformIds: ["wechat", "xiaohongshu"],
      createdAt: "2026-03-31T09:00:00.000Z",
      lastRunAt: null,
      lastRunStatus: "idle",
      lastResultCount: 0
    });

    const keywordTargets = listKeywordTargets(repository, "claude");

    expect(keywordTargets).toHaveLength(1);
    expect(keywordTargets[0]).toMatchObject({
      id: "target-1",
      categoryId: "claude",
      keyword: "openclaw",
      platformIds: ["wechat", "xiaohongshu"],
      lastRunStatus: "idle",
      lastResultCount: 0
    });

    database.close();
  });

  it("stores sync runs and returns collected contents sorted by publish timestamp desc", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    upsertKeywordTarget(repository, {
      id: "target-1",
      categoryId: "claude",
      keyword: "openclaw",
      platformIds: ["xiaohongshu"],
      createdAt: "2026-03-31T09:00:00.000Z",
      lastRunAt: null,
      lastRunStatus: "idle",
      lastResultCount: 0
    });

    createSyncRun(repository, {
      id: "run-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      status: "running",
      resultCount: 0,
      errorMessage: null,
      startedAt: "2026-03-31T09:05:00.000Z",
      finishedAt: null
    });

    upsertCollectedContents(repository, {
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      syncRunId: "run-1",
      items: [
        buildContentItem("note-older", "older", "2026-03-29 12:00:00", 1711684800),
        buildContentItem("note-newer", "newer", "2026-03-31 16:00:00", 1711900800),
        buildContentItem("note-middle", "middle", "2026-03-30 08:00:00", 1711766400)
      ],
      collectedAt: "2026-03-31T09:06:00.000Z"
    });

    finishSyncRun(repository, {
      id: "run-1",
      status: "success",
      resultCount: 3,
      errorMessage: null,
      finishedAt: "2026-03-31T09:06:00.000Z"
    });

    const contents = listCollectedContents(repository, {
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu"
    });

    expect(contents.map((item) => item.title)).toEqual(["newer", "middle", "older"]);

    const keywordTargets = listKeywordTargets(repository, "claude");
    expect(keywordTargets[0]).toMatchObject({
      lastRunStatus: "success",
      lastResultCount: 3,
      lastRunAt: "2026-03-31T09:06:00.000Z"
    });

    database.close();
  });

  it("replaces stale contents when a new snapshot arrives for the same keyword target and platform", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    upsertKeywordTarget(repository, {
      id: "target-1",
      categoryId: "claude",
      keyword: "openclaw",
      platformIds: ["xiaohongshu"],
      createdAt: "2026-03-31T09:00:00.000Z",
      lastRunAt: null,
      lastRunStatus: "idle",
      lastResultCount: 0
    });

    createSyncRun(repository, {
      id: "run-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      status: "running",
      resultCount: 0,
      errorMessage: null,
      startedAt: "2026-03-31T09:05:00.000Z",
      finishedAt: null
    });

    upsertCollectedContents(repository, {
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      syncRunId: "run-1",
      items: [
        buildContentItem("note-a", "first snapshot", "2026-03-31 08:00:00", 1711843200),
        buildContentItem("note-b", "stale snapshot", "2026-03-30 08:00:00", 1711756800)
      ],
      collectedAt: "2026-03-31T09:06:00.000Z"
    });

    upsertCollectedContents(repository, {
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu",
      syncRunId: "run-2",
      items: [buildContentItem("note-c", "fresh snapshot", "2026-03-31 10:00:00", 1711850400)],
      collectedAt: "2026-03-31T10:06:00.000Z"
    });

    const contents = listCollectedContents(repository, {
      categoryId: "claude",
      keywordTargetId: "target-1",
      platformId: "xiaohongshu"
    });

    expect(contents.map((item) => item.title)).toEqual(["fresh snapshot"]);

    database.close();
  });
});

function buildContentItem(
  id: string,
  title: string,
  publishedAt: string,
  publishTimestamp: number
): ContentItem {
  return {
    id,
    date: publishedAt.slice(0, 10),
    timeOfDay: "上午",
    title,
    platformId: "xiaohongshu",
    author: "OpenClaw",
    publishedAt,
    publishTime: publishedAt,
    publishTimestamp,
    heatScore: 80,
    metrics: {
      likes: "10",
      comments: "5",
      saves: "8"
    },
    matchedTargets: ["openclaw"],
    aiSummary: `${title} summary`,
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    keyword: "openclaw",
    articleUrl: "",
    sourceUrl: "",
    rawOrderIndex: 0
  };
}
