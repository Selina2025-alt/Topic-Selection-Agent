import { afterEach, describe, expect, it, vi } from "vitest";

import {
  searchTwitterPostsSnapshotByKeyword
} from "@/lib/twitter-monitor";

describe("twitter monitor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("posts to x api recent search with the bearer token", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildRecentSearchPayload([])
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://api.x.com/2/tweets/search/recent"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer token"
        })
      })
    );
  });

  it("decodes url-encoded bearer tokens before calling x api", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token%2Fwith%3Dencoding");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => buildRecentSearchPayload([])
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer token/with=encoding"
        })
      })
    );
  });

  it("throws when the bearer token is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => buildRecentSearchPayload([])
      })
    );

    await expect(searchTwitterPostsSnapshotByKeyword("claude code")).rejects.toThrow(
      "Missing TWITTER_BEARER_TOKEN"
    );
  });

  it("returns raw items in api order and items sorted by publish timestamp desc", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () =>
          buildRecentSearchPayload([
            buildTweet("1900", "older first", "2026-03-30T08:00:00.000Z", "alice", "Alice", 5, 2, 1),
            buildTweet("1901", "newest second", "2026-03-31T09:00:00.000Z", "bob", "Bob", 21, 4, 7),
            buildTweet("1902", "middle third", "2026-03-30T18:00:00.000Z", "carol", "Carol", 12, 3, 2)
          ])
      })
    );

    const result = await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(result.rawItems.map((item) => item.title)).toEqual([
      "older first",
      "newest second",
      "middle third"
    ]);
    expect(result.items.map((item) => item.title)).toEqual([
      "newest second",
      "middle third",
      "older first"
    ]);
    expect(result.items.map((item) => item.publishTimestamp)).toEqual([
      Math.floor(Date.parse("2026-03-31T09:00:00.000Z") / 1000),
      Math.floor(Date.parse("2026-03-30T18:00:00.000Z") / 1000),
      Math.floor(Date.parse("2026-03-30T08:00:00.000Z") / 1000)
    ]);
    expect(result.items[0]).toMatchObject({
      platformId: "twitter",
      author: "@bob",
      authorName: "Bob",
      authorId: "bob",
      articleUrl: "https://x.com/bob/status/1901",
      sourceUrl: "https://x.com/bob/status/1901"
    });
    expect(result.items[0]?.timeOfDay).toBe("上午");
    expect(result.rawItems.map((item) => item.rawOrderIndex)).toEqual([0, 1, 2]);
  });

  it("falls back safely when username is missing", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () =>
          buildRecentSearchPayload(
            [
              {
                id: "1903",
                text: "no username tweet",
                created_at: "2026-03-31T10:00:00.000Z",
                author_id: "123456",
                public_metrics: {
                  like_count: 0,
                  reply_count: 0,
                  retweet_count: 0
                }
              }
            ],
            [
              {
                id: "123456",
                name: "Anonymous",
                profile_image_url: ""
              }
            ]
          )
      })
    );

    const result = await searchTwitterPostsSnapshotByKeyword("claude code");

    expect(result.items[0]).toMatchObject({
      author: "Anonymous",
      authorName: "Anonymous",
      articleUrl: "",
      sourceUrl: ""
    });
  });

  it("surfaces non-2xx payload errors", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          errors: [
            {
              title: "Forbidden",
              detail: "token expired"
            }
          ]
        })
      })
    );

    await expect(searchTwitterPostsSnapshotByKeyword("claude code")).rejects.toThrow(
      "Twitter monitor request failed with status 403: token expired"
    );
  });

  it("surfaces 2xx business errors from the payload", async () => {
    vi.stubEnv("TWITTER_BEARER_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          errors: [
            {
              title: "Unauthorized",
              detail: "bearer token rejected"
            }
          ]
        })
      })
    );

    await expect(searchTwitterPostsSnapshotByKeyword("claude code")).rejects.toThrow(
      "bearer token rejected"
    );
  });
});

function buildRecentSearchPayload(
  data: Array<Record<string, unknown>>,
  users: Array<Record<string, unknown>> = data.map((tweet) => {
    const authorId = String(tweet.author_id ?? "");
    return {
      id: authorId,
      username: String(tweet.__username ?? ""),
      name: String(tweet.__name ?? ""),
      profile_image_url: ""
    };
  })
) {
  return {
    data,
    includes: {
      users
    }
  };
}

function buildTweet(
  id: string,
  text: string,
  createdAt: string,
  username: string,
  name: string,
  likeCount: number,
  replyCount: number,
  retweetCount: number
) {
  return {
    id,
    text,
    created_at: createdAt,
    author_id: username,
    public_metrics: {
      like_count: likeCount,
      reply_count: replyCount,
      retweet_count: retweetCount
    },
    __username: username,
    __name: name
  };
}
