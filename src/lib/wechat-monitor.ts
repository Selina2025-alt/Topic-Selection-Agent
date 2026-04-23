import type { ContentItem, TimeOfDay } from "@/lib/types";

const WECHAT_MONITOR_ENDPOINT = "https://cn8n.com/p4/fbmain/monitor/v3/kw_search";

export interface WechatMonitorDatum {
  avatar: string;
  classify: string;
  content: string;
  ghid: string;
  ip_wording: string;
  is_original: number;
  looking: number;
  praise: number;
  publish_time: number;
  publish_time_str: string;
  read: number;
  short_link: string;
  title: string;
  update_time: number;
  update_time_str: string;
  url: string;
  wx_id: string;
  wx_name: string;
}

interface WechatMonitorApiResponse {
  code: number | string;
  data?: {
    data?: WechatMonitorDatum[];
    data_number?: number;
    page?: number;
    total?: number;
    total_page?: number;
  };
  msg?: string;
  message?: string;
  requestId?: string;
  solution?: string;
}

export interface WechatArticlesSnapshot {
  rawItems: ContentItem[];
  items: ContentItem[];
}

function inferTimeOfDay(publishedAt: string): TimeOfDay {
  const hour = Number.parseInt(publishedAt.slice(11, 13), 10);

  if (Number.isNaN(hour) || hour < 12) {
    return "上午";
  }

  if (hour < 18) {
    return "下午";
  }

  return "晚上";
}

function formatReadCount(read: number) {
  if (read >= 10000) {
    return `${(read / 10000).toFixed(1).replace(/\.0$/, "")}万阅读`;
  }

  return `${read}阅读`;
}

function buildHeatScore(read: number, praise: number, looking: number) {
  const score = Math.round(read / 400 + praise / 30 + looking / 20);
  return Math.max(55, Math.min(score, 99));
}

function resolveArticleUrl(datum: Pick<WechatMonitorDatum, "url" | "short_link">) {
  return datum.url || datum.short_link || "";
}

function getPublishTimestamp(item: Pick<ContentItem, "publishTimestamp" | "publishTime" | "publishedAt">) {
  if (typeof item.publishTimestamp === "number") {
    return item.publishTimestamp;
  }

  const text = item.publishTime || item.publishedAt;
  const parsed = Date.parse(text);

  return Number.isNaN(parsed) ? 0 : parsed;
}

export function sortContentItemsByPublishTimeDesc(items: ContentItem[]) {
  return [...items].sort((left, right) => {
    const rightTimestamp = getPublishTimestamp(right);
    const leftTimestamp = getPublishTimestamp(left);

    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return (left.rawOrderIndex ?? 0) - (right.rawOrderIndex ?? 0);
  });
}

export function mapWechatDatumToContentItem(
  datum: WechatMonitorDatum,
  keyword: string,
  rawOrderIndex?: number
): ContentItem {
  const publishTime = datum.publish_time_str || datum.update_time_str || "";
  const articleUrl = resolveArticleUrl(datum);

  return {
    id: `wechat-${keyword}-${datum.ghid}-${datum.publish_time}`,
    date: publishTime.slice(0, 10),
    timeOfDay: inferTimeOfDay(publishTime),
    platformId: "wechat",
    title: datum.title,
    summary: datum.content,
    author: datum.wx_name,
    authorName: datum.wx_name,
    authorId: datum.wx_id,
    publishedAt: publishTime,
    publishTime,
    publishTimestamp: datum.publish_time,
    updateTimestamp: datum.update_time,
    heatScore: buildHeatScore(datum.read, datum.praise, datum.looking),
    metrics: {
      likes: `${datum.praise}`,
      comments: `${datum.looking}`,
      saves: formatReadCount(datum.read)
    },
    readCount: datum.read,
    likeCount: datum.praise,
    matchedTargets: [keyword, datum.classify].filter(Boolean),
    aiSummary: datum.content || `${datum.wx_name} 的公众号文章摘要`,
    keyword,
    avatar: datum.avatar,
    isOriginal: datum.is_original === 1,
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    articleUrl,
    sourceUrl: articleUrl,
    shortLink: datum.short_link,
    rawOrderIndex,
    sourceType: "wechat"
  };
}

function formatWechatMonitorError(payload: WechatMonitorApiResponse, status: number) {
  const detail = payload.message || payload.msg;
  const code =
    payload.code !== 0 && payload.code !== "0" && payload.code ? ` (${payload.code})` : "";

  if (detail) {
    return `Wechat monitor request failed with status ${status}: ${detail}${code}`;
  }

  return `Wechat monitor request failed with status ${status}`;
}

async function fetchWechatMonitorData(keyword: string, page = 1, period = 7) {
  const token = process.env.WECHAT_MONITOR_TOKEN;

  if (!token) {
    throw new Error("Missing WECHAT_MONITOR_TOKEN");
  }

  const response = await fetch(WECHAT_MONITOR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      kw: keyword,
      sort_type: 1,
      mode: 1,
      period,
      page,
      any_kw: "",
      ex_kw: "",
      verifycode: "",
      type: 1
    }),
    cache: "no-store"
  });
  const payload = (await response.json()) as WechatMonitorApiResponse;
  const hasArticleArray = Array.isArray(payload.data?.data);

  if (!response.ok && !hasArticleArray) {
    throw new Error(formatWechatMonitorError(payload, response.status));
  }

  if (payload.code !== 0 && payload.code !== "0") {
    throw new Error(payload.message || payload.msg || "Wechat monitor returned invalid data");
  }

  return hasArticleArray ? payload.data!.data! : [];
}

export async function searchWechatArticlesSnapshotByKeyword(keyword: string, page = 1, period = 7) {
  const articles = await fetchWechatMonitorData(keyword, page, period);
  const rawItems = articles.map((datum, index) => mapWechatDatumToContentItem(datum, keyword, index));
  const items = sortContentItemsByPublishTimeDesc(rawItems);

  return {
    rawItems,
    items
  } satisfies WechatArticlesSnapshot;
}

export async function searchWechatArticlesByKeyword(keyword: string, page = 1, period = 7) {
  const snapshot = await searchWechatArticlesSnapshotByKeyword(keyword, page, period);
  return snapshot.items;
}

export const searchWechatArticles = searchWechatArticlesByKeyword;
