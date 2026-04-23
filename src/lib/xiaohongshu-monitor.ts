import type { ContentItem, TimeOfDay } from "@/lib/types";

const XIAOHONGSHU_MONITOR_ENDPOINT = "https://cn8n.com/p2/xhs/search_note_web";

export interface XiaohongshuSearchQuery {
  page?: number;
  noteTime?: "day" | "week" | "month";
}

export interface XiaohongshuSearchItem {
  hot_query: {
    queries: Array<{
      cover: string;
      id: string;
      name: string;
      search_word: string;
    }>;
    source: number;
    title: string;
    word_request_id: string;
  };
  model_type: string;
  note: {
    abstract_show?: string;
    advanced_widgets_groups: {
      groups: Array<{
        fetch_types: string[];
        mode: number;
      }>;
    };
    collected: boolean;
    collected_count: number;
    comments_count: number;
    corner_tag_info: Array<{
      icon: string;
      location: number;
      poi_id: string;
      style: number;
      text: string;
      text_en: string;
      type: string;
    }>;
    cover_image_index: number;
    debug_info_str: string;
    desc: string;
    extract_text_enabled: number;
    geo_info: {
      distance: string;
    };
    has_music: boolean;
    id: string;
    images_list: Array<{
      fileid: string;
      height: number;
      need_load_original_image: boolean;
      original: string;
      trace_id: string;
      url: string;
      url_size_large: string;
      width: number;
    }>;
    interaction_area: {
      status: boolean;
      text: string;
      type: number;
    };
    last_update_time: number;
    liked: boolean;
    liked_count: number;
    nice_count: number;
    niced: boolean;
    note_attributes: string[];
    result_from: string;
    shared_count: number;
    tag_info: {
      title: string;
      type: string;
    };
    timestamp: number;
    title: string;
    type: string;
    update_time: number;
    user: {
      followed: boolean;
      images: string;
      live?: {
        has_draw: boolean;
        has_goods: boolean;
        has_red_packet: boolean;
        live_link: string;
        live_status: number;
        room_id: string;
        should_light_off: boolean;
        start_time: number;
        user_id: string;
      };
      nickname: string;
      red_id: string;
      red_official_verified: boolean;
      red_official_verify_type: number;
      show_red_official_verify_icon: boolean;
      track_duration: number;
      userid: string;
    };
    widgets_context: string;
  };
}

export interface XiaohongshuCurrentSearchItem {
  noteInfo: {
    noteId: string;
    noteLink?: string;
    title: string;
    notePublishTime: string;
    readNum?: number;
    likeNum?: number;
    cmtNum?: number;
    favNum?: number;
    noteImages?: Array<{
      imageUrl?: string;
      imageWidth?: number;
      imageHeight?: number;
    }>;
    noteType?: number;
    isAdNote?: number;
    bindType?: number;
    bizType?: number;
    videoDuration?: number;
    videoUrl?: string;
  };
  userInfo: {
    nickName: string;
    avatar?: string;
    userId: string;
    fansNum?: number;
    currentLevel?: number;
    userType?: number;
  };
}

interface XiaohongshuMonitorApiResponse {
  code: number | string;
  msg?: string;
  message?: string;
  data?: {
    items?: XiaohongshuSearchItem[];
    data?: XiaohongshuCurrentSearchItem[];
    service_status?: string;
  };
}

export interface XiaohongshuNotesSnapshot {
  rawItems: ContentItem[];
  items: ContentItem[];
}

type XiaohongshuApiItem = XiaohongshuSearchItem | XiaohongshuCurrentSearchItem;
const MORNING = "涓婂崍" as TimeOfDay;
const AFTERNOON = "涓嬪崍" as TimeOfDay;
const EVENING = "鏅氫笂" as TimeOfDay;

function normalizeUnixTimestamp(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 0;
  }

  return timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
}

function parseDateTimeToUnix(text: string) {
  if (!text) {
    return 0;
  }

  const parsed = Date.parse(text.replace(/-/g, "/"));

  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

function formatDateTime(timestamp: number) {
  const normalized = normalizeUnixTimestamp(timestamp);

  if (!normalized) {
    return "";
  }

  const date = new Date(normalized * 1000);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  const seconds = `${date.getSeconds()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function inferTimeOfDayByTimestamp(timestamp: number): TimeOfDay {
  const normalized = normalizeUnixTimestamp(timestamp);

  if (!normalized) {
    return MORNING;
  }

  const hour = new Date(normalized * 1000).getHours();

  if (hour < 12) {
    return MORNING;
  }

  if (hour < 18) {
    return AFTERNOON;
  }

  return EVENING;
}

function getPublishTimestamp(item: Pick<ContentItem, "publishTimestamp" | "publishTime" | "publishedAt">) {
  if (typeof item.publishTimestamp === "number") {
    return item.publishTimestamp;
  }

  const text = item.publishTime || item.publishedAt;
  const parsed = Date.parse(text);

  return Number.isNaN(parsed) ? 0 : Math.floor(parsed / 1000);
}

function sortContentItemsByPublishTimeDesc(items: ContentItem[]) {
  return [...items].sort((left, right) => {
    const rightTimestamp = getPublishTimestamp(right);
    const leftTimestamp = getPublishTimestamp(left);

    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return (left.rawOrderIndex ?? 0) - (right.rawOrderIndex ?? 0);
  });
}

function formatXiaohongshuError(payload: XiaohongshuMonitorApiResponse, status: number) {
  const detail = payload.message || payload.msg || payload.data?.service_status;
  const code =
    payload.code !== 0 && payload.code !== "0" && payload.code ? ` (${payload.code})` : "";

  if (detail) {
    return `Xiaohongshu monitor request failed with status ${status}: ${detail}${code}`;
  }

  return `Xiaohongshu monitor request failed with status ${status}`;
}

function isLegacySearchItem(item: XiaohongshuApiItem): item is XiaohongshuSearchItem {
  return "note" in item;
}

function mapLegacyItemToContentItem(
  item: XiaohongshuSearchItem,
  keyword: string,
  rawOrderIndex?: number
): ContentItem {
  const publishTimestamp = normalizeUnixTimestamp(item.note.timestamp);
  const publishTime = formatDateTime(publishTimestamp);
  const summary = item.note.desc || item.note.abstract_show || "";

  return {
    id: `xiaohongshu-${keyword}-${item.note.id}`,
    date: publishTime.slice(0, 10),
    timeOfDay: inferTimeOfDayByTimestamp(publishTimestamp),
    platformId: "xiaohongshu",
    title: item.note.title,
    summary,
    author: item.note.user.nickname,
    authorName: item.note.user.nickname,
    authorId: item.note.user.userid,
    publishedAt: publishTime,
    publishTime,
    publishTimestamp,
    updateTimestamp: normalizeUnixTimestamp(item.note.update_time),
    heatScore: Math.max(
      55,
      Math.min(
        99,
        Math.round(
          item.note.liked_count / 30 + item.note.comments_count / 15 + item.note.collected_count / 12
        )
      )
    ),
    metrics: {
      likes: `${item.note.liked_count}`,
      comments: `${item.note.comments_count}`,
      saves: `${item.note.collected_count}`
    },
    matchedTargets: [keyword].filter(Boolean),
    aiSummary: summary || `${item.note.user.nickname} 鐨勫皬绾功绗旇鎽樿`,
    keyword,
    avatar: item.note.user.images,
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    articleUrl: "",
    sourceUrl: "",
    rawOrderIndex
  };
}

function mapCurrentItemToContentItem(
  item: XiaohongshuCurrentSearchItem,
  keyword: string,
  rawOrderIndex?: number
): ContentItem {
  const publishTimestamp = parseDateTimeToUnix(item.noteInfo.notePublishTime);
  const publishTime = item.noteInfo.notePublishTime || formatDateTime(publishTimestamp);
  const summary = item.noteInfo.title || `${item.userInfo.nickName} 鐨勫皬绾功绗旇`;
  const likeCount = item.noteInfo.likeNum ?? 0;
  const commentCount = item.noteInfo.cmtNum ?? 0;
  const saveCount = item.noteInfo.favNum ?? 0;
  const readCount = item.noteInfo.readNum ?? 0;
  const articleUrl = item.noteInfo.noteLink || "";

  return {
    id: `xiaohongshu-${keyword}-${item.noteInfo.noteId}`,
    date: publishTime.slice(0, 10),
    timeOfDay: inferTimeOfDayByTimestamp(publishTimestamp),
    platformId: "xiaohongshu",
    title: item.noteInfo.title,
    summary,
    author: item.userInfo.nickName,
    authorName: item.userInfo.nickName,
    authorId: item.userInfo.userId,
    publishedAt: publishTime,
    publishTime,
    publishTimestamp,
    updateTimestamp: publishTimestamp,
    heatScore: Math.max(
      55,
      Math.min(99, Math.round(readCount / 400 + likeCount / 30 + commentCount / 15 + saveCount / 12))
    ),
    metrics: {
      likes: `${likeCount}`,
      comments: `${commentCount}`,
      saves: `${saveCount}`
    },
    readCount,
    likeCount,
    matchedTargets: [keyword].filter(Boolean),
    aiSummary: summary,
    keyword,
    avatar: item.userInfo.avatar,
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    articleUrl,
    sourceUrl: articleUrl,
    rawOrderIndex
  };
}

async function fetchXiaohongshuMonitorData(
  keyword: string,
  query: XiaohongshuSearchQuery = {}
) {
  const token = process.env.XIAOHONGSHU_MONITOR_TOKEN;

  if (!token) {
    throw new Error("Missing XIAOHONGSHU_MONITOR_TOKEN");
  }

  const page = `${query.page ?? 1}`;
  const noteTime = query.noteTime ?? "week";

  const response = await fetch(XIAOHONGSHU_MONITOR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: 9,
      keyword,
      page,
      sort: "comment_descending",
      note_type: "note",
      note_time: noteTime,
      searchId: "",
      sessionId: ""
    }),
    cache: "no-store"
  });
  const payload = (await response.json()) as XiaohongshuMonitorApiResponse;
  const hasLegacyItems = Array.isArray(payload.data?.items);
  const hasCurrentItems = Array.isArray(payload.data?.data);

  if (!response.ok && !hasLegacyItems && !hasCurrentItems) {
    throw new Error(formatXiaohongshuError(payload, response.status));
  }

  if (payload.code !== 0 && payload.code !== "0") {
    throw new Error(payload.message || payload.msg || "Xiaohongshu monitor returned invalid data");
  }

  if (hasLegacyItems) {
    return payload.data?.items ?? [];
  }

  if (hasCurrentItems) {
    return payload.data?.data ?? [];
  }

  return [];
}

export function mapXiaohongshuItemToContentItem(
  item: XiaohongshuApiItem,
  keyword: string,
  rawOrderIndex?: number
): ContentItem {
  if (isLegacySearchItem(item)) {
    return mapLegacyItemToContentItem(item, keyword, rawOrderIndex);
  }

  return mapCurrentItemToContentItem(item, keyword, rawOrderIndex);
}

export async function searchXiaohongshuNotesSnapshotByKeyword(
  keyword: string,
  page = 1,
  noteTime: XiaohongshuSearchQuery["noteTime"] = "week"
) {
  const items = await fetchXiaohongshuMonitorData(keyword, {
    page,
    noteTime
  });
  const rawItems = items.map((item, index) =>
    mapXiaohongshuItemToContentItem(item, keyword, index)
  );

  return {
    rawItems,
    items: sortContentItemsByPublishTimeDesc(rawItems)
  } satisfies XiaohongshuNotesSnapshot;
}

export async function searchXiaohongshuNotesByKeyword(
  keyword: string,
  page = 1,
  noteTime: XiaohongshuSearchQuery["noteTime"] = "week"
) {
  const snapshot = await searchXiaohongshuNotesSnapshotByKeyword(keyword, page, noteTime);
  return snapshot.items;
}
