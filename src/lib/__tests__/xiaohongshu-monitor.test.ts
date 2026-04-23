import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mapXiaohongshuItemToContentItem,
  searchXiaohongshuNotesByKeyword,
  searchXiaohongshuNotesSnapshotByKeyword
} from "@/lib/xiaohongshu-monitor";

describe("xiaohongshu monitor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("maps note payload into a content item", () => {
    const item = mapXiaohongshuItemToContentItem(
      {
        model_type: "note",
        hot_query: {
          queries: [],
          source: 0,
          title: "",
          word_request_id: ""
        },
        note: {
          abstract_show: "A concise abstract",
          advanced_widgets_groups: { groups: [] },
          collected: false,
          collected_count: 88,
          comments_count: 22,
          corner_tag_info: [],
          cover_image_index: 0,
          debug_info_str: "",
          desc: "A longer note description for Claude Code workflows.",
          extract_text_enabled: 1,
          geo_info: { distance: "" },
          has_music: false,
          id: "note-1",
          images_list: [
            {
              fileid: "f-1",
              height: 1200,
              need_load_original_image: false,
              original: "https://example.com/original.jpg",
              trace_id: "trace-1",
              url: "https://example.com/cover.jpg",
              url_size_large: "https://example.com/cover-large.jpg",
              width: 900
            }
          ],
          interaction_area: {
            status: true,
            text: "",
            type: 1
          },
          last_update_time: 1711879200,
          liked: false,
          liked_count: 512,
          nice_count: 0,
          niced: false,
          note_attributes: [],
          result_from: "search_result",
          shared_count: 12,
          tag_info: {
            title: "AI",
            type: "topic"
          },
          timestamp: 1711872000,
          title: "Claude Code 工作流拆解",
          type: "note",
          update_time: 1711879200,
          user: {
            followed: false,
            images: "https://example.com/avatar.jpg",
            nickname: "OpenClaw",
            red_id: "red-openclaw",
            red_official_verified: false,
            red_official_verify_type: 0,
            show_red_official_verify_icon: false,
            track_duration: 0,
            userid: "user-1"
          },
          widgets_context: ""
        }
      },
      "openclaw"
    );

    expect(item.platformId).toBe("xiaohongshu");
    expect(item.title).toBe("Claude Code 工作流拆解");
    expect(item.summary).toBe("A longer note description for Claude Code workflows.");
    expect(item.author).toBe("OpenClaw");
    expect(item.authorId).toBe("user-1");
    expect(item.publishTimestamp).toBe(1711872000);
    expect(item.date).toBe("2024-03-31");
    expect(item.keyword).toBe("openclaw");
    expect(item.metrics.likes).toBe("512");
    expect(item.metrics.comments).toBe("22");
    expect(item.metrics.saves).toBe("88");
    expect(item.articleUrl).toBe("");
    expect(item.avatar).toBe("https://example.com/avatar.jpg");
    expect(item.rawOrderIndex).toBeUndefined();
  });

  it("posts to the documented xiaohongshu search endpoint", async () => {
    vi.stubEnv("XIAOHONGSHU_MONITOR_TOKEN", "token");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 0,
        data: {
          items: []
        }
      })
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchXiaohongshuNotesByKeyword("大众");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://cn8n.com/p2/xhs/search_note_web",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          type: 9,
          keyword: "大众",
          page: "1",
          sort: "comment_descending",
          note_type: "note",
          note_time: "week",
          searchId: "",
          sessionId: ""
        })
      })
    );
  });

  it("returns snapshot data with raw order preserved and display order sorted by publish time desc", async () => {
    vi.stubEnv("XIAOHONGSHU_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          data: {
            items: [
              buildSearchItem("note-a", "older first", 1711700000, "A"),
              buildSearchItem("note-b", "newest second", 1711900000, "B"),
              buildSearchItem("note-c", "middle third", 1711800000, "C")
            ]
          }
        })
      })
    );

    const result = await searchXiaohongshuNotesSnapshotByKeyword("openclaw");

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
      1711900000,
      1711800000,
      1711700000
    ]);
  });

  it("parses the current xiaohongshu response shape and exposes note links", async () => {
    vi.stubEnv("XIAOHONGSHU_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 0,
          data: {
            data: [
              buildCurrentSearchItem(
                "note-old",
                "older note",
                "2026-03-30 08:00:00",
                "Older User",
                "https://www.xiaohongshu.com/explore/note-old",
                1000,
                120,
                45
              ),
              buildCurrentSearchItem(
                "note-new",
                "newer note",
                "2026-03-31 09:30:00",
                "Newer User",
                "https://www.xiaohongshu.com/explore/note-new",
                5000,
                360,
                88
              )
            ]
          }
        })
      })
    );

    const result = await searchXiaohongshuNotesSnapshotByKeyword("claude code");

    expect(result.rawItems.map((item) => item.title)).toEqual(["older note", "newer note"]);
    expect(result.items.map((item) => item.title)).toEqual(["newer note", "older note"]);
    expect(result.items[0]?.author).toBe("Newer User");
    expect(result.items[0]?.articleUrl).toBe("https://www.xiaohongshu.com/explore/note-new");
    expect(result.items[0]?.sourceUrl).toBe("https://www.xiaohongshu.com/explore/note-new");
    expect(result.items[0]?.publishTimestamp).toBe(Math.floor(new Date("2026-03-31T09:30:00").getTime() / 1000));
    expect(result.items[0]?.metrics.likes).toBe("360");
    expect(result.items[0]?.metrics.comments).toBe("88");
    expect(result.items[0]?.metrics.saves).toBe("120");
    expect(result.items[0]?.rawOrderIndex).toBe(1);
  });

  it("surfaces upstream business errors", async () => {
    vi.stubEnv("XIAOHONGSHU_MONITOR_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          code: 403,
          msg: "QUOTA_EXCEEDED",
          data: {
            items: []
          }
        })
      })
    );

    await expect(searchXiaohongshuNotesByKeyword("大众")).rejects.toThrow("QUOTA_EXCEEDED");
  });
});

function buildSearchItem(
  id: string,
  title: string,
  timestamp: number,
  nickname: string
) {
  return {
    model_type: "note",
    hot_query: {
      queries: [],
      source: 0,
      title: "",
      word_request_id: ""
    },
    note: {
      abstract_show: `${title} abstract`,
      advanced_widgets_groups: { groups: [] },
      collected: false,
      collected_count: 30,
      comments_count: 20,
      corner_tag_info: [],
      cover_image_index: 0,
      debug_info_str: "",
      desc: `${title} description`,
      extract_text_enabled: 1,
      geo_info: { distance: "" },
      has_music: false,
      id,
      images_list: [],
      interaction_area: {
        status: true,
        text: "",
        type: 1
      },
      last_update_time: timestamp,
      liked: false,
      liked_count: 40,
      nice_count: 0,
      niced: false,
      note_attributes: [],
      result_from: "search_result",
      shared_count: 0,
      tag_info: {
        title: "AI",
        type: "topic"
      },
      timestamp,
      title,
      type: "note",
      update_time: timestamp,
      user: {
        followed: false,
        images: "",
        nickname,
        red_id: `${nickname}-red`,
        red_official_verified: false,
        red_official_verify_type: 0,
        show_red_official_verify_icon: false,
        track_duration: 0,
        userid: `${nickname}-user`
      },
      widgets_context: ""
    }
  };
}

function buildCurrentSearchItem(
  noteId: string,
  title: string,
  notePublishTime: string,
  nickName: string,
  noteLink: string,
  readNum: number,
  likeNum: number,
  cmtNum: number
) {
  return {
    noteInfo: {
      noteId,
      title,
      notePublishTime,
      noteLink,
      readNum,
      likeNum,
      cmtNum,
      favNum: 120,
      noteImages: [],
      noteType: 1,
      isAdNote: 0,
      bindType: 4,
      bizType: 0,
      videoDuration: 0
    },
    userInfo: {
      nickName,
      avatar: `https://example.com/${noteId}.jpg`,
      userId: `${noteId}-user`,
      fansNum: 100,
      currentLevel: 1,
      userType: 1
    }
  };
}
