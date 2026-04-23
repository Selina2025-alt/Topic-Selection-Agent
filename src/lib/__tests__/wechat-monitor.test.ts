import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mapWechatDatumToContentItem,
  searchWechatArticlesByKeyword,
  searchWechatArticlesSnapshotByKeyword
} from "@/lib/wechat-monitor";

describe("wechat monitor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps api article data into content pool items", () => {
    const item = mapWechatDatumToContentItem(
      {
        avatar: "https://example.com/avatar.png",
        classify: "AI tools",
        content: "Article summary for a Claude Code workflow breakdown.",
        ghid: "gh_xxx",
        ip_wording: "Shanghai",
        is_original: 1,
        looking: 321,
        praise: 654,
        publish_time: 1711584000,
        publish_time_str: "2026-03-30 08:30:00",
        read: 12000,
        short_link: "https://mp.weixin.qq.com/s/demo",
        title: "Claude Code workflow breakdown",
        update_time: 1711587600,
        update_time_str: "2026-03-30 09:30:00",
        url: "https://mp.weixin.qq.com/s/demo-long",
        wx_id: "rmrbwx",
        wx_name: "People Daily"
      },
      "Claude Code"
    );

    expect(item.platformId).toBe("wechat");
    expect(item.author).toBe("People Daily");
    expect(item.title).toBe("Claude Code workflow breakdown");
    expect(item.date).toBe("2026-03-30");
    expect(item.metrics.likes).toBe("654");
    expect(item.metrics.comments).toBe("321");
    expect(item.metrics.saves).toBe("1.2万阅读");
    expect(item.matchedTargets).toContain("Claude Code");
    expect(item.linkedTopicIds).toEqual([]);
    expect(item.sourceUrl).toBe("https://mp.weixin.qq.com/s/demo-long");
    expect(item.publishTimestamp).toBe(1711584000);
    expect(item.rawOrderIndex).toBeUndefined();
  });

  it("falls back to short link when the long url is missing", () => {
    const item = mapWechatDatumToContentItem(
      {
        avatar: "",
        classify: "news",
        content: "fallback summary",
        ghid: "gh_short",
        ip_wording: "",
        is_original: 0,
        looking: 10,
        praise: 20,
        publish_time: 1711584001,
        publish_time_str: "2026-03-30 10:30:00",
        read: 2000,
        short_link: "https://mp.weixin.qq.com/s/fallback",
        title: "fallback link",
        update_time: 1711587601,
        update_time_str: "2026-03-30 11:30:00",
        url: "",
        wx_id: "wx_short",
        wx_name: "Fallback"
      },
      "OpenClaw"
    );

    expect(item.articleUrl).toBe("https://mp.weixin.qq.com/s/fallback");
    expect(item.sourceUrl).toBe("https://mp.weixin.qq.com/s/fallback");
  });

  it("posts to the documented https p4 endpoint", async () => {
    vi.stubEnv("WECHAT_MONITOR_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        msg: "success",
        requestId: "request-1",
        data: {
          data: []
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchWechatArticlesByKeyword("人民日报");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cn8n.com/p4/fbmain/monitor/v3/kw_search",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("returns snapshot data with raw order preserved and display order sorted by publish time desc", async () => {
    vi.stubEnv("WECHAT_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          msg: "success",
          requestId: "request-2",
          data: {
            data: [
              {
                avatar: "",
                classify: "AI",
                content: "first",
                ghid: "gh_1",
                ip_wording: "",
                is_original: 1,
                looking: 1,
                praise: 10,
                publish_time: 1711400000,
                publish_time_str: "2026-03-25 09:00:00",
                read: 1000,
                short_link: "https://mp.weixin.qq.com/s/1",
                title: "older first",
                update_time: 1711403600,
                update_time_str: "2026-03-25 10:00:00",
                url: "",
                wx_id: "wx_1",
                wx_name: "A"
              },
              {
                avatar: "",
                classify: "AI",
                content: "second",
                ghid: "gh_2",
                ip_wording: "",
                is_original: 1,
                looking: 1,
                praise: 10,
                publish_time: 1711700000,
                publish_time_str: "2026-03-29 20:00:00",
                read: 1000,
                short_link: "https://mp.weixin.qq.com/s/2",
                title: "newest second",
                update_time: 1711703600,
                update_time_str: "2026-03-29 21:00:00",
                url: "",
                wx_id: "wx_2",
                wx_name: "B"
              },
              {
                avatar: "",
                classify: "AI",
                content: "third",
                ghid: "gh_3",
                ip_wording: "",
                is_original: 1,
                looking: 1,
                praise: 10,
                publish_time: 1711600000,
                publish_time_str: "2026-03-28 08:00:00",
                read: 1000,
                short_link: "https://mp.weixin.qq.com/s/3",
                title: "middle third",
                update_time: 1711603600,
                update_time_str: "2026-03-28 09:00:00",
                url: "",
                wx_id: "wx_3",
                wx_name: "C"
              }
            ]
          }
        })
      })
    );

    const result = await searchWechatArticlesSnapshotByKeyword("openclaw");

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
    expect(result.rawItems.map((item) => item.rawOrderIndex)).toEqual([0, 1, 2]);
    expect(result.items.map((item) => item.publishTimestamp)).toEqual([
      1711700000,
      1711600000,
      1711400000
    ]);
  });

  it("accepts code 0 responses when the gateway status is not ok but the article array exists", async () => {
    vi.stubEnv("WECHAT_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: 0,
          msg: "ok",
          requestId: "request-3",
          data: {
            data: []
          }
        })
      })
    );

    await expect(searchWechatArticlesByKeyword("人民日报")).resolves.toEqual([]);
  });

  it("throws when the upstream status is not ok and the payload has no article array", async () => {
    vi.stubEnv("WECHAT_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: 0,
          msg: "ok",
          requestId: "request-4",
          data: {}
        })
      })
    );

    await expect(searchWechatArticlesByKeyword("人民日报")).rejects.toThrow(
      "Wechat monitor request failed with status 404"
    );
  });

  it("surfaces upstream business error details when the API rejects the token", async () => {
    vi.stubEnv("WECHAT_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          code: "QUOTA_EXCEEDED",
          message: "令牌限额已用尽",
          solution: "请查看令牌限额配置",
          requestId: "request-5"
        })
      })
    );

    await expect(searchWechatArticlesByKeyword("Claude Code")).rejects.toThrow(
      "Wechat monitor request failed with status 403: 令牌限额已用尽 (QUOTA_EXCEEDED)"
    );
  });
});
