// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const searchTwitterPostsSnapshotByKeywordMock = vi.fn();

vi.mock("@/lib/twitter-monitor", () => ({
  searchTwitterPostsSnapshotByKeyword: searchTwitterPostsSnapshotByKeywordMock
}));

describe("GET /api/twitter/keyword-search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchTwitterPostsSnapshotByKeywordMock.mockResolvedValue({
      items: [{ id: "tweet-1" }],
      rawItems: [{ id: "tweet-1" }, { id: "tweet-2" }]
    });
  });

  it("returns unified items rawItems and meta for twitter search results", async () => {
    const { GET } = await import("@/app/api/twitter/keyword-search/route");

    const request = new NextRequest("http://localhost/api/twitter/keyword-search?keyword=claude%20code");
    const response = await GET(request);
    const payload = await response.json();

    expect(searchTwitterPostsSnapshotByKeywordMock).toHaveBeenCalledWith("claude code");
    expect(payload).toEqual({
      items: [{ id: "tweet-1" }],
      rawItems: [{ id: "tweet-1" }, { id: "tweet-2" }],
      meta: {
        source: "twitter",
        sortedBy: "publish_time_desc",
        fetchedCount: 2,
        cappedCount: 1
      }
    });
  });

  it("rejects missing keyword requests", async () => {
    const { GET } = await import("@/app/api/twitter/keyword-search/route");

    const request = new NextRequest("http://localhost/api/twitter/keyword-search");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      error: "keyword is required",
      items: [],
      rawItems: [],
      meta: null
    });
  });

  it("returns 502 when the twitter snapshot search fails", async () => {
    searchTwitterPostsSnapshotByKeywordMock.mockRejectedValue(new Error("twitter backend down"));

    const { GET } = await import("@/app/api/twitter/keyword-search/route");

    const request = new NextRequest("http://localhost/api/twitter/keyword-search?keyword=claude");
    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      error: "twitter backend down",
      items: [],
      rawItems: [],
      meta: null
    });
  });
});
