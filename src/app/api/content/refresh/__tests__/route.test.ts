// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repository = {
  database: {
    close: vi.fn()
  }
};

const createMonitoringRepositoryMock = vi.fn(() => repository);
const upsertAnalysisSnapshotMock = vi.fn();
const getKeywordTargetByIdMock = vi.fn();
const buildAnalysisArchiveSnapshotMock = vi.fn(() => ({
  snapshot: {
    id: "query-run-1-analysis",
    searchQueryId: "query-run-1",
    categoryId: "claude",
    keyword: "claude code",
    generatedAt: "2026-04-01T10:00:00.000Z",
    hotSummary: "hot",
    focusSummary: "focus",
    patternSummary: "pattern",
    insightSummary: "insight"
  },
  topics: []
}));
const refreshKeywordTargetPlatformMock = vi.fn();

vi.mock("@/lib/db/monitoring-repository", () => ({
  createMonitoringRepository: createMonitoringRepositoryMock,
  upsertAnalysisSnapshot: upsertAnalysisSnapshotMock,
  getKeywordTargetById: getKeywordTargetByIdMock
}));

vi.mock("@/lib/history-archive", () => ({
  buildAnalysisArchiveSnapshot: buildAnalysisArchiveSnapshotMock
}));

vi.mock("@/lib/monitoring-sync-service", () => ({
  refreshKeywordTargetPlatform: refreshKeywordTargetPlatformMock
}));

describe("POST /api/content/refresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-07T09:27:49.000Z"));
    vi.clearAllMocks();
    repository.database.close.mockReset();
    getKeywordTargetByIdMock.mockReturnValue(undefined);
    refreshKeywordTargetPlatformMock.mockResolvedValue({
      searchQueryId: "query-run-1",
      items: [],
      rawItems: [],
      fetchedCount: 2,
      cappedCount: 2
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("archives a fresh analysis snapshot when refresh completes without changing the response shape", async () => {
    const { POST } = await import("@/app/api/content/refresh/route");

    const request = new NextRequest("http://localhost/api/content/refresh", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "claude",
        keywordTargetId: "claude-keyword-1",
        keyword: "claude code",
        platformId: "wechat",
        platformIds: ["wechat", "xiaohongshu"],
        reports: [
          {
            id: "report-1",
            date: "2026-04-01",
            label: "4月1日",
            hotSummary: "hot",
            focusSummary: "focus",
            patternSummary: "pattern",
            insightSummary: "insight",
            suggestions: []
          }
        ]
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(refreshKeywordTargetPlatformMock).toHaveBeenCalledTimes(1);
    expect(buildAnalysisArchiveSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchQueryId: "query-run-1",
        categoryId: "claude",
        keyword: "claude code",
        generatedAt: "2026-04-07",
        reports: [
          expect.objectContaining({
            id: "report-claude code-2026-04-07",
            date: "2026-04-07"
          })
        ]
      })
    );
    expect(upsertAnalysisSnapshotMock).toHaveBeenCalledWith(
      repository,
      expect.objectContaining({
        snapshot: expect.objectContaining({
          searchQueryId: "query-run-1"
        })
      })
    );
    expect(payload).toEqual({
      items: [],
      rawItems: [],
      report: expect.objectContaining({
        id: "report-claude code-2026-04-07",
        date: "2026-04-07"
      }),
      meta: {
        source: "wechat",
        sortedBy: "publish_time_desc",
        persisted: true,
        fetchedCount: 2,
        cappedCount: 2
      }
    });
    expect(repository.database.close).toHaveBeenCalledTimes(1);
  });

  it("supports twitter refresh without changing the response shape", async () => {
    const { POST } = await import("@/app/api/content/refresh/route");

    const request = new NextRequest("http://localhost/api/content/refresh", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "claude",
        keywordTargetId: "claude-keyword-twitter",
        keyword: "claude code",
        platformId: "twitter",
        platformIds: ["twitter"]
      })
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(refreshKeywordTargetPlatformMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "claude",
        platformId: "twitter"
      })
    );
    expect(payload).toEqual({
      items: [],
      rawItems: [],
      report: expect.objectContaining({
        id: "report-claude code-2026-04-07",
        date: "2026-04-07"
      }),
      meta: {
        source: "twitter",
        sortedBy: "publish_time_desc",
        persisted: true,
        fetchedCount: 2,
        cappedCount: 2
      }
    });
    expect(repository.database.close).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted keyword target metadata when refreshing an existing target", async () => {
    getKeywordTargetByIdMock.mockReturnValue({
      id: "claude-keyword-1",
      categoryId: "claude",
      keyword: "persisted keyword",
      platformIds: ["wechat", "twitter"],
      createdAt: "2026-03-30T08:00:00.000Z",
      lastRunAt: "2026-03-31T08:00:00.000Z",
      lastRunStatus: "success",
      lastResultCount: 8
    });

    const { POST } = await import("@/app/api/content/refresh/route");

    const request = new NextRequest("http://localhost/api/content/refresh", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "claude",
        keywordTargetId: "claude-keyword-1",
        keyword: "request keyword",
        platformId: "twitter",
        platformIds: ["twitter"],
        createdAt: "2026-04-01T10:00:00.000Z",
        lastRunAt: null,
        lastRunStatus: "idle",
        lastResultCount: 0
      })
    });

    await POST(request);

    expect(refreshKeywordTargetPlatformMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "claude",
        platformId: "twitter",
        keywordTarget: {
          id: "claude-keyword-1",
          categoryId: "claude",
          keyword: "persisted keyword",
          platformIds: ["wechat", "twitter"],
          createdAt: "2026-03-30T08:00:00.000Z",
          lastRunAt: "2026-03-31T08:00:00.000Z",
          lastRunStatus: "success",
          lastResultCount: 8
        }
      })
    );
  });

  it("creates a keyword target from the request body when no persisted target exists", async () => {
    getKeywordTargetByIdMock.mockReturnValue(undefined);

    const { POST } = await import("@/app/api/content/refresh/route");

    const request = new NextRequest("http://localhost/api/content/refresh", {
      method: "POST",
      body: JSON.stringify({
        categoryId: "claude",
        keywordTargetId: "new-keyword-target",
        keyword: "request keyword",
        platformId: "twitter",
        platformIds: ["twitter"],
        createdAt: "2026-04-01T10:00:00.000Z",
        lastRunAt: null,
        lastRunStatus: "idle",
        lastResultCount: 0
      })
    });

    await POST(request);

    expect(refreshKeywordTargetPlatformMock).toHaveBeenCalledWith(
      expect.objectContaining({
        keywordTarget: {
          id: "new-keyword-target",
          categoryId: "claude",
          keyword: "request keyword",
          platformIds: ["twitter"],
          createdAt: "2026-04-01T10:00:00.000Z",
          lastRunAt: null,
          lastRunStatus: "idle",
          lastResultCount: 0
        }
      })
    );
  });
});
