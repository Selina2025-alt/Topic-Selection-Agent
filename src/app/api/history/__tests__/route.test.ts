// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const repository = { database: { close: vi.fn() } };
const listSearchQueriesMock = vi.fn();
const getSearchQueryByIdMock = vi.fn();
const getAnalysisSnapshotBySearchQueryMock = vi.fn();
const getAnalysisEvidenceItemsBySnapshotIdMock = vi.fn();
const listCollectedContentsBySearchQueryMock = vi.fn();

vi.mock("@/lib/db/monitoring-repository", () => ({
  createMonitoringRepository: vi.fn(() => repository),
  listSearchQueries: listSearchQueriesMock,
  getSearchQueryById: getSearchQueryByIdMock,
  getAnalysisSnapshotBySearchQuery: getAnalysisSnapshotBySearchQueryMock,
  getAnalysisEvidenceItemsBySnapshotId: getAnalysisEvidenceItemsBySnapshotIdMock,
  listCollectedContentsBySearchQuery: listCollectedContentsBySearchQueryMock
}));

describe("history api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repository.database.close.mockReset();
  });

  it("lists recent search query rows by category", async () => {
    listSearchQueriesMock.mockReturnValue([
      {
        id: "query-1",
        categoryId: "claude",
        keywordTargetId: "target-1",
        keyword: "claude code",
        platformScope: "wechat",
        triggerType: "manual_refresh",
        status: "success",
        fetchedCount: 20,
        cappedCount: 20,
        startedAt: "2026-04-01T10:00:00.000Z",
        finishedAt: "2026-04-01T10:01:00.000Z",
        errorMessage: null
      }
    ]);

    const { GET } = await import("@/app/api/history/route");
    const response = await GET(new NextRequest("http://localhost/api/history?categoryId=claude"));
    const payload = await response.json();

    expect(listSearchQueriesMock).toHaveBeenCalledWith(repository, "claude");
    expect(payload).toEqual({
      queries: [
        expect.objectContaining({
          id: "query-1",
          keyword: "claude code",
          cappedCount: 20
        })
      ]
    });
    expect(repository.database.close).toHaveBeenCalledTimes(1);
  });

  it("returns detail payload for a single search query", async () => {
    getSearchQueryByIdMock.mockReturnValue({
      id: "query-1",
      categoryId: "claude",
      keywordTargetId: "target-1",
      keyword: "claude code",
      platformScope: "wechat",
      triggerType: "manual_refresh",
      status: "success",
      fetchedCount: 20,
      cappedCount: 20,
      startedAt: "2026-04-01T10:00:00.000Z",
      finishedAt: "2026-04-01T10:01:00.000Z",
      errorMessage: null
    });
    getAnalysisSnapshotBySearchQueryMock.mockReturnValue({
      snapshot: {
        id: "query-1-analysis",
        searchQueryId: "query-1",
        categoryId: "claude",
        keyword: "claude code",
        generatedAt: "2026-04-01T10:01:00.000Z",
        hotSummary: "hot",
        focusSummary: "focus",
        patternSummary: "pattern",
        insightSummary: "insight"
      },
      topics: []
    });
    getAnalysisEvidenceItemsBySnapshotIdMock.mockReturnValue([
      {
        id: "evidence-1",
        snapshotId: "query-1-analysis",
        contentId: "wx-1",
        keyword: "claude code",
        platformId: "wechat",
        title: "wechat article",
        briefSummary: "summary",
        keyFacts: [],
        keywords: ["claude"],
        highlights: [],
        attentionSignals: [],
        topicAngles: [],
        createdAt: "2026-04-01T10:01:00.000Z"
      }
    ]);
    listCollectedContentsBySearchQueryMock.mockReturnValue([
      {
        id: "wx-1",
        title: "wechat article"
      }
    ]);

    const { GET } = await import("@/app/api/history/[queryId]/route");
    const response = await GET(
      new NextRequest("http://localhost/api/history/query-1"),
      { params: Promise.resolve({ queryId: "query-1" }) }
    );
    const payload = await response.json();

    expect(getSearchQueryByIdMock).toHaveBeenCalledWith(repository, "query-1");
    expect(getAnalysisSnapshotBySearchQueryMock).toHaveBeenCalledWith(repository, "query-1");
    expect(getAnalysisEvidenceItemsBySnapshotIdMock).toHaveBeenCalledWith(
      repository,
      "query-1-analysis"
    );
    expect(listCollectedContentsBySearchQueryMock).toHaveBeenCalledWith(repository, {
      searchQueryId: "query-1"
    });
    expect(payload).toEqual({
      query: expect.objectContaining({
        id: "query-1",
        keyword: "claude code"
      }),
      analysis: expect.objectContaining({
        snapshot: expect.objectContaining({
          searchQueryId: "query-1"
        })
      }),
      items: [expect.objectContaining({ id: "wx-1" })]
    });
    expect(repository.database.close).toHaveBeenCalledTimes(1);
  });
});
