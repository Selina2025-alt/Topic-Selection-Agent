import {
  initialReplicaCategories,
  replicaArticleTemplates,
  replicaPlatforms,
  type ReplicaArticle,
  type ReplicaCategory,
  type ReplicaDateOption,
  type ReplicaKeywordTarget,
  type ReplicaPlatformId,
  type ReplicaTrackedPlatformId
} from "@/lib/replica-workbench-data";
import { formatLocalDate, parseDateLike } from "@/lib/time-utils";
import type { ContentItem } from "@/lib/types";

export function titleCaseKeyword(keyword: string) {
  return keyword
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeCategoryInput(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function mapReplicaPlatformLabel(platformId: ReplicaTrackedPlatformId) {
  return replicaPlatforms.find((item) => item.id === platformId)?.label || platformId;
}

function syncLegacyKeywords(category: ReplicaCategory): ReplicaCategory {
  const keywords = category.keywordTargets.map((item) => item.keyword);

  return {
    ...category,
    keywordTargets: category.keywordTargets,
    keywords,
    keyword: keywords[0] ?? category.keyword
  };
}

export function createReplicaKeywordTarget(
  keyword: string,
  platformIds: ReplicaTrackedPlatformId[],
  options?: {
    id?: string;
    createdAt?: string;
    lastRunAt?: string | null;
    lastRunStatus?: ReplicaKeywordTarget["lastRunStatus"];
    lastResultCount?: number;
  }
): ReplicaKeywordTarget {
  const normalizedKeyword = normalizeCategoryInput(keyword).toLowerCase();

  return {
    id:
      options?.id ??
      `keyword-${normalizedKeyword.replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-") || Date.now().toString()}`,
    keyword: normalizedKeyword,
    platformIds: Array.from(new Set(platformIds)),
    createdAt: options?.createdAt ?? new Date().toISOString(),
    lastRunAt: options?.lastRunAt ?? null,
    lastRunStatus: options?.lastRunStatus ?? "idle",
    lastResultCount: options?.lastResultCount ?? 0
  };
}

export function mergeKeywordTargetsIntoCategory(
  category: ReplicaCategory,
  persistedTargets: ReplicaKeywordTarget[]
): ReplicaCategory {
  if (persistedTargets.length === 0) {
    return category;
  }

  const indexById = new Map(category.keywordTargets.map((target, index) => [target.id, index]));
  const indexByKeyword = new Map(
    category.keywordTargets.map((target, index) => [target.keyword.toLowerCase(), index])
  );
  const nextTargets = [...category.keywordTargets];

  for (const persistedTarget of persistedTargets) {
    const normalizedKeyword = normalizeCategoryInput(persistedTarget.keyword).toLowerCase();
    const normalizedTarget = createReplicaKeywordTarget(normalizedKeyword, persistedTarget.platformIds, {
      id: persistedTarget.id,
      createdAt: persistedTarget.createdAt,
      lastRunAt: persistedTarget.lastRunAt,
      lastRunStatus: persistedTarget.lastRunStatus,
      lastResultCount: persistedTarget.lastResultCount
    });
    const existingIndex =
      indexById.get(persistedTarget.id) ?? indexByKeyword.get(normalizedKeyword) ?? -1;

    if (existingIndex >= 0) {
      nextTargets[existingIndex] = normalizedTarget;
      indexById.set(normalizedTarget.id, existingIndex);
      indexByKeyword.set(normalizedTarget.keyword, existingIndex);
      continue;
    }

    nextTargets.push(normalizedTarget);
    const nextIndex = nextTargets.length - 1;
    indexById.set(normalizedTarget.id, nextIndex);
    indexByKeyword.set(normalizedTarget.keyword, nextIndex);
  }

  nextTargets.sort((left, right) => {
    const leftTimestamp = Date.parse(left.createdAt || "") || 0;
    const rightTimestamp = Date.parse(right.createdAt || "") || 0;
    return leftTimestamp - rightTimestamp;
  });

  return syncLegacyKeywords({
    ...category,
    keywordTargets: nextTargets
  });
}

function createSlug(value: string) {
  return (
    normalizeCategoryInput(value)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "") || "new-category"
  );
}

function replaceKeyword(template: string, keyword: string) {
  return template.replaceAll("{keyword}", titleCaseKeyword(keyword));
}

function parseTimestamp(text: string) {
  const parsed = Date.parse(text.replace(/-/g, "/"));

  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatWeekday(text: string) {
  const date = new Date(text.replace(/-/g, "/"));

  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()] || "";
}

function formatDateHint(text: string, index: number) {
  if (index === 0) {
    return "最新";
  }

  if (index === 1) {
    return "前一天";
  }

  const date = new Date(text.replace(/-/g, "/"));

  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function buildReplicaArticles(category: ReplicaCategory, keyword: string) {
  const templates = replicaArticleTemplates[category.id] || [];
  const normalizedKeyword = normalizeCategoryInput(keyword) || category.keyword;

  return templates
    .map<ReplicaArticle>((template, index) => ({
      id: `${category.id}-${template.platformId}-${index + 1}`,
      platformId: template.platformId,
      platformLabel:
        replicaPlatforms.find((item) => item.id === template.platformId)?.label || template.platformId,
      author: template.author,
      title: replaceKeyword(template.title, normalizedKeyword),
      excerpt: replaceKeyword(template.excerpt, normalizedKeyword),
      publishedAt: template.publishedAt,
      publishTimestamp: parseTimestamp(template.publishedAt),
      heat: template.heat,
      likes: template.likes,
      comments: template.comments,
      reads: template.reads,
      articleUrl: template.articleUrl,
      sourceUrl: template.articleUrl,
      source: "mock",
      sourceType: template.platformId === "wechat" ? "wechat" : "mixed",
      tag: normalizedKeyword
    }))
    .sort((left, right) => right.publishTimestamp - left.publishTimestamp);
}

function resolveTimelineAnchor(articles: ReplicaArticle[], anchorDateLike?: Date | number | string | null) {
  const anchorDate = parseDateLike(anchorDateLike) ?? new Date();
  const latestArticleDate = parseDateLike(
    [...articles]
      .sort((left, right) => right.publishTimestamp - left.publishTimestamp)[0]
      ?.publishedAt
      ?.slice(0, 10)
  );

  if (latestArticleDate) {
    return anchorDate.getTime() > latestArticleDate.getTime() ? anchorDate : latestArticleDate;
  }

  return anchorDate;
}

export function buildDateOptions(
  articles: ReplicaArticle[],
  anchorDateLike?: Date | number | string | null
) {
  const uniqueDates = Array.from(new Set(articles.map((item) => item.publishedAt.slice(0, 10))));
  const anchorDateText = formatLocalDate(resolveTimelineAnchor(articles, anchorDateLike));
  const anchorDate = new Date(anchorDateText.replace(/-/g, "/"));
  const timelineDates = new Set(uniqueDates);

  for (let offset = 0; offset < 10 || timelineDates.size < 7; offset += 1) {
    const date = new Date(anchorDate);
    date.setDate(anchorDate.getDate() - offset);
    timelineDates.add(formatLocalDate(date));
  }

  return Array.from(timelineDates)
    .sort((left, right) => Date.parse(right.replace(/-/g, "/")) - Date.parse(left.replace(/-/g, "/")))
    .slice(0, 10)
    .map<ReplicaDateOption>((dateText, index) => {
    const date = new Date(dateText.replace(/-/g, "/"));

    return {
      id: dateText,
      hint: formatDateHint(dateText, index),
      day: `${date.getDate()}`,
      week: formatWeekday(dateText),
      dots:
        index === 0
          ? ["#61a8ff", "#7cb6ff", "#61a8ff"]
          : ["#d5dae5", "#6cc4d4", "#71aefb"].slice(0, (index % 3) + 1)
    };
    });
}

export function filterReplicaArticles(
  articles: ReplicaArticle[],
  platformId: ReplicaPlatformId,
  selectedDateId?: string
) {
  return articles.filter((item) => {
    const platformMatches = platformId === "all" || item.platformId === platformId;
    const dateMatches = !selectedDateId || item.publishedAt.startsWith(selectedDateId);

    return platformMatches && dateMatches;
  });
}

export function mapContentItemsToReplicaArticles(items: ContentItem[], keyword: string) {
  return items
    .map((item) => {
      const platformId = item.platformId as ReplicaTrackedPlatformId;
      const sourceType: ReplicaArticle["sourceType"] =
        platformId === "wechat" ? "wechat" : platformId === "xiaohongshu" ? "xiaohongshu" : "mixed";

      return {
        id: item.id,
        platformId,
        platformLabel: mapReplicaPlatformLabel(platformId),
        author: item.authorName || item.author,
        title: item.title,
        excerpt: item.summary || item.aiSummary || "暂无摘要",
        publishedAt: item.publishTime || item.publishedAt,
        publishTimestamp: item.publishTimestamp || Date.parse(item.publishTime || item.publishedAt),
        heat: item.heatScore || 72,
        likes: item.likeCount || Number.parseInt(item.metrics.likes, 10) || 0,
        comments: Number.parseInt(item.metrics.comments, 10) || 0,
        reads: item.readCount ? `${item.readCount}` : item.metrics.saves,
        articleUrl: item.articleUrl || item.sourceUrl || item.shortLink,
        sourceUrl: item.sourceUrl || item.articleUrl || item.shortLink,
        source: "api" as const,
        sourceType,
        tag: keyword,
        rawOrderIndex: item.rawOrderIndex
      } satisfies ReplicaArticle;
    })
    .sort((left, right) => right.publishTimestamp - left.publishTimestamp);
}

export function getDefaultDateId(
  articles: ReplicaArticle[],
  anchorDateLike?: Date | number | string | null
) {
  if (articles.length === 0) {
    return formatLocalDate(resolveTimelineAnchor([], anchorDateLike));
  }

  return [...articles]
    .sort((left, right) => right.publishTimestamp - left.publishTimestamp)[0]
    ?.publishedAt.slice(0, 10);
}

export function createReplicaCategory(input: string) {
  const normalized = normalizeCategoryInput(input);
  const keyword = normalized.toLowerCase();
  const slug = createSlug(normalized);
  const keywordTargets = [createReplicaKeywordTarget(keyword, ["wechat"], { id: `${slug}-keyword-1` })];

  return syncLegacyKeywords({
    ...initialReplicaCategories[0],
    id: slug,
    name: normalized,
    description: `围绕 ${normalized} 的关键词监控、案例收集与选题分析。`,
    count: 0,
    keyword,
    keywords: [keyword],
    keywordTargets,
    reports:
      initialReplicaCategories[0]?.reports.map((report) => ({
        ...report,
        id: `${slug}-${report.date}`,
        hotSummary: report.hotSummary.replace(/claude code/gi, normalized),
        focusSummary: report.focusSummary.replace(/claude code/gi, normalized),
        suggestions: report.suggestions.map((suggestion) => ({
          ...suggestion,
          id: `${slug}-${suggestion.id}`,
          title: suggestion.title.replace(/claude code/gi, normalized),
          intro: suggestion.intro.replace(/claude code/gi, normalized)
        }))
      })) || []
  } satisfies ReplicaCategory);
}

export function renameReplicaCategory(
  categories: ReplicaCategory[],
  categoryId: string,
  nextName: string
) {
  const normalized = normalizeCategoryInput(nextName);

  return categories.map((category) =>
    category.id === categoryId ? { ...category, name: normalized } : category
  );
}

export function removeReplicaCategory(categories: ReplicaCategory[], categoryId: string) {
  return categories.filter((category) => category.id !== categoryId);
}

export function addKeywordToCategory(category: ReplicaCategory, keyword: string): ReplicaCategory {
  return addKeywordTargetToCategory(category, {
    keyword,
    platformIds: ["wechat"]
  });
}

export function addKeywordTargetToCategory(
  category: ReplicaCategory,
  input: {
    keyword: string;
    platformIds: ReplicaTrackedPlatformId[];
  }
): ReplicaCategory {
  const normalized = normalizeCategoryInput(input.keyword).toLowerCase();

  if (!normalized || category.keywordTargets.some((item) => item.keyword === normalized)) {
    return category;
  }

  return syncLegacyKeywords({
    ...category,
    keywordTargets: [
      ...category.keywordTargets,
      createReplicaKeywordTarget(normalized, input.platformIds, {
        id: `${category.id}-keyword-${category.keywordTargets.length + 1}`
      })
    ]
  });
}

export function removeKeywordFromCategory(
  category: ReplicaCategory,
  keyword: string
): ReplicaCategory {
  return syncLegacyKeywords({
    ...category,
    keywordTargets: category.keywordTargets.filter((item) => item.keyword !== keyword),
    keywords: category.keywords.filter((item) => item !== keyword)
  });
}

export function addCreatorToCategory(category: ReplicaCategory, name: string): ReplicaCategory {
  const normalized = normalizeCategoryInput(name);

  if (!normalized) {
    return category;
  }

  return {
    ...category,
    creators: [
      ...category.creators,
      {
        id: `${category.id}-creator-${category.creators.length + 1}`,
        name: normalized,
        platformId: "wechat" as const
      }
    ]
  };
}

export function removeCreatorFromCategory(
  category: ReplicaCategory,
  creatorId: string
): ReplicaCategory {
  return {
    ...category,
    creators: category.creators.filter((creator) => creator.id !== creatorId)
  };
}
