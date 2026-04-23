"use client";

import { useEffect, useMemo, useState } from "react";

import { ContentFilterBar } from "@/components/workbench/content-filter-bar";
import { ContentPool } from "@/components/workbench/content-pool";
import { ContentTrendStrip } from "@/components/workbench/content-trend-strip";
import type {
  ContentFocusMode,
  ContentItem,
  ContentPoolView,
  ContentRangeId,
  MonitorCategory,
  NonAggregatePlatformId,
  PlatformId,
  PlatformSetting
} from "@/lib/types";

interface ContentTabProps {
  activeCategory: MonitorCategory;
  selectedContentDate: string;
  selectedPlatformId: PlatformId;
  selectedContentRange: ContentRangeId;
  contentPoolView: ContentPoolView;
  contentFocusMode: ContentFocusMode;
  highlightedContentIds: string[];
  pooledContentIds: string[];
  onSelectContentDate: (date: string) => void;
  onSelectPlatformId: (platformId: PlatformId) => void;
  onSelectContentRange: (range: ContentRangeId) => void;
  onSelectContentPoolView: (view: ContentPoolView) => void;
  onOpenLinkedInsight: (content: ContentItem) => void;
  onTogglePool: (content: ContentItem) => void;
}

interface WechatArticlesResponse {
  error?: string;
  items?: ContentItem[];
}

function getSortedDates(content: ContentItem[]) {
  return [...new Set(content.map((item) => item.date))].sort((left, right) =>
    right.localeCompare(left)
  );
}

function getVisibleDates(content: ContentItem[], selectedRange: ContentRangeId) {
  const sortedDates = getSortedDates(content);
  const rangeLimit = selectedRange === "24h" ? 1 : selectedRange === "3d" ? 3 : 7;

  return sortedDates.slice(0, rangeLimit);
}

function ensureWechatPlatform(platforms: PlatformSetting[], keywordCount: number) {
  if (platforms.some((platform) => platform.id === "wechat")) {
    return platforms;
  }

  const wechatPlatform: PlatformSetting = {
    id: "wechat",
    label: "公众号",
    enabled: true,
    syncedAt: "刚刚",
    keywordCount,
    creatorCount: 0,
    successRate: 100,
    qualityRate: 80,
    recommendation: "公众号文章用于补充深度内容信号。"
  };

  return [...platforms, wechatPlatform];
}

function buildPlatformItems(activeCategory: MonitorCategory, visibleDates: string[]) {
  const visibleDateSet = new Set(visibleDates);
  const visibleContent = activeCategory.content.filter((content) =>
    visibleDateSet.has(content.date)
  );

  return [
    { id: "all" as const, label: "全部", count: visibleContent.length },
    ...activeCategory.settings.platforms.map((platform) => ({
      id: platform.id,
      label: platform.label,
      count: visibleContent.filter((content) => content.platformId === platform.id).length
    }))
  ];
}

function buildTrendItems(activeCategory: MonitorCategory, visibleDates: string[]) {
  const platformLabelMap = new Map<NonAggregatePlatformId, string>(
    activeCategory.settings.platforms.map((platform) => [platform.id, platform.label])
  );

  return visibleDates.map((date) => {
    const contentForDate = activeCategory.content.filter((content) => content.date === date);
    const hotCount = contentForDate.filter((content) => content.heatScore >= 85).length;
    const platformCounts = new Map<string, number>();

    for (const content of contentForDate) {
      platformCounts.set(content.platformId, (platformCounts.get(content.platformId) ?? 0) + 1);
    }

    const leadPlatformId =
      [...platformCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "all";

    return {
      date,
      contentCount: contentForDate.length,
      hotCount,
      leadPlatformLabel:
        leadPlatformId === "all"
          ? "全平台"
          : platformLabelMap.get(leadPlatformId as NonAggregatePlatformId) ?? "全平台"
    };
  });
}

function resolveSelectedDate(visibleDates: string[], selectedDate: string) {
  return visibleDates.includes(selectedDate) ? selectedDate : visibleDates[0] ?? "";
}

function buildVisibleContent({
  activeCategory,
  selectedDate,
  selectedPlatformId,
  contentPoolView,
  contentFocusMode,
  highlightedContentIds,
  pooledContentIds,
  visibleDates
}: {
  activeCategory: MonitorCategory;
  selectedDate: string;
  selectedPlatformId: PlatformId;
  contentPoolView: ContentPoolView;
  contentFocusMode: ContentFocusMode;
  highlightedContentIds: string[];
  pooledContentIds: string[];
  visibleDates: string[];
}) {
  const visibleDateSet = new Set(visibleDates);
  const highlightedIdSet = new Set(highlightedContentIds);
  const pooledIdSet = new Set(pooledContentIds);

  return activeCategory.content
    .filter((content) => {
      if (contentFocusMode === "timeline" && highlightedContentIds.length > 0) {
        return highlightedIdSet.has(content.id);
      }

      return content.date === selectedDate && visibleDateSet.has(content.date);
    })
    .filter((content) => {
      if (selectedPlatformId === "all") {
        return content.platformId !== "wechat";
      }

      return content.platformId === selectedPlatformId;
    })
    .filter((content) => {
      if (contentPoolView === "hot") {
        return content.heatScore >= 85;
      }

      if (contentPoolView === "pool") {
        return pooledIdSet.has(content.id);
      }

      return true;
    })
    .slice()
    .sort((left, right) => {
      if (contentFocusMode === "timeline" && right.date !== left.date) {
        return right.date.localeCompare(left.date);
      }

      if (right.heatScore !== left.heatScore) {
        return right.heatScore - left.heatScore;
      }

      return right.publishedAt.localeCompare(left.publishedAt);
    });
}

function buildFocusDescription(mode: ContentFocusMode, highlightedCount: number) {
  if (mode === "evidence" && highlightedCount > 0) {
    return `已聚焦 ${highlightedCount} 条支撑内容，可以直接判断这条洞察为什么成立。`;
  }

  if (mode === "samples" && highlightedCount > 0) {
    return `已定位 ${highlightedCount} 条原始爆款样本，先看最热素材，再决定要不要跟进。`;
  }

  if (mode === "timeline" && highlightedCount > 0) {
    return "已切换到同类内容时间线，先扫最近几天的连续信号，再深入看单条素材。";
  }

  return "先用平台、时间范围和内容池筛选缩小范围，再进入具体素材判断。";
}

function buildKeywordItems(
  activeCategory: MonitorCategory,
  selectedKeyword: string,
  customKeywords: string[],
  wechatContent: ContentItem[]
) {
  const builtInKeywords = activeCategory.settings.keywords.map((keyword) => keyword.label);
  const orderedKeywords = [...new Set([selectedKeyword, ...customKeywords, ...builtInKeywords])];

  return orderedKeywords.filter(Boolean).map((keyword) => ({
    id: keyword,
    label: keyword,
    count: wechatContent.filter((content) => content.keyword === keyword).length
  }));
}

function getWechatStatusLine(
  selectedKeyword: string,
  wechatStatus: "idle" | "loading" | "error",
  wechatCount: number,
  wechatError: string
) {
  if (!selectedKeyword) {
    return "";
  }

  if (wechatStatus === "loading") {
    return `正在根据关键词「${selectedKeyword}」获取公众号文章...`;
  }

  if (wechatStatus === "error") {
    return `公众号文章获取失败：${wechatError}`;
  }

  return `当前公众号关键词：${selectedKeyword}，已接入 ${wechatCount} 条公众号文章。`;
}

export function ContentTab({
  activeCategory,
  selectedContentDate,
  selectedPlatformId,
  selectedContentRange,
  contentPoolView,
  contentFocusMode,
  highlightedContentIds,
  pooledContentIds,
  onSelectContentDate,
  onSelectPlatformId,
  onSelectContentRange,
  onSelectContentPoolView,
  onOpenLinkedInsight,
  onTogglePool
}: ContentTabProps) {
  const initialKeyword = activeCategory.settings.keywords[0]?.label ?? "";
  const [selectedKeyword, setSelectedKeyword] = useState(initialKeyword);
  const [keywordDraft, setKeywordDraft] = useState(initialKeyword);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [wechatContent, setWechatContent] = useState<ContentItem[]>([]);
  const [wechatStatus, setWechatStatus] = useState<"idle" | "loading" | "error">("idle");
  const [wechatError, setWechatError] = useState("");

  useEffect(() => {
    setSelectedKeyword(initialKeyword);
    setKeywordDraft(initialKeyword);
    setCustomKeywords([]);
  }, [activeCategory.id, initialKeyword]);

  useEffect(() => {
    let cancelled = false;

    async function loadWechatArticles() {
      if (!selectedKeyword) {
        setWechatContent([]);
        setWechatStatus("idle");
        setWechatError("");
        return;
      }

      setWechatStatus("loading");
      setWechatError("");

      const period = selectedContentRange === "24h" ? 1 : selectedContentRange === "3d" ? 3 : 7;

      try {
        const response = await fetch(
          `/api/wechat/keyword-search?keyword=${encodeURIComponent(selectedKeyword)}&period=${period}&page=1`
        );
        const payload = (await response.json()) as WechatArticlesResponse;

        if (!response.ok) {
          throw new Error(payload.error || "公众号文章获取失败");
        }

        if (!cancelled) {
          setWechatContent(payload.items ?? []);
          setWechatStatus("idle");
        }
      } catch (error) {
        if (!cancelled) {
          setWechatContent([]);
          setWechatStatus("error");
          setWechatError(error instanceof Error ? error.message : "公众号文章获取失败");
        }
      }
    }

    void loadWechatArticles();

    return () => {
      cancelled = true;
    };
  }, [selectedContentRange, selectedKeyword]);

  const keywordItems = buildKeywordItems(
    activeCategory,
    selectedKeyword,
    customKeywords,
    wechatContent
  );

  const contentCategory = useMemo<MonitorCategory>(
    () => ({
      ...activeCategory,
      content: [...activeCategory.content, ...wechatContent],
      settings: {
        ...activeCategory.settings,
        platforms: ensureWechatPlatform(
          activeCategory.settings.platforms,
          activeCategory.settings.keywords.length
        )
      }
    }),
    [activeCategory, wechatContent]
  );

  const visibleDates = getVisibleDates(contentCategory.content, selectedContentRange);

  useEffect(() => {
    const latestDate = visibleDates[0];

    if (
      latestDate &&
      selectedContentDate &&
      latestDate > selectedContentDate &&
      contentFocusMode === null
    ) {
      onSelectContentDate(latestDate);
    }
  }, [contentFocusMode, onSelectContentDate, selectedContentDate, visibleDates]);

  const resolvedSelectedDate = resolveSelectedDate(visibleDates, selectedContentDate);
  const trendItems = buildTrendItems(contentCategory, visibleDates);
  const platformItems = buildPlatformItems(contentCategory, visibleDates);
  const selectedPlatformLabel =
    platformItems.find((platform) => platform.id === selectedPlatformId)?.label ?? "全部";
  const visibleContent = buildVisibleContent({
    activeCategory: contentCategory,
    selectedDate: resolvedSelectedDate,
    selectedPlatformId,
    contentPoolView,
    contentFocusMode,
    highlightedContentIds,
    pooledContentIds,
    visibleDates
  });
  const poolDescription = buildFocusDescription(contentFocusMode, highlightedContentIds.length);
  const poolTitle =
    contentFocusMode === "timeline"
      ? "同类内容时间线"
      : `${resolvedSelectedDate || "--"} · ${selectedPlatformLabel} · ${visibleContent.length} 条内容`;
  const wechatStatusLine = getWechatStatusLine(
    selectedKeyword,
    wechatStatus,
    wechatContent.length,
    wechatError
  );

  function handleSelectKeyword(keyword: string) {
    setKeywordDraft(keyword);
    setSelectedKeyword(keyword);
  }

  function handleSubmitKeywordSearch() {
    const normalizedKeyword = keywordDraft.trim();

    if (!normalizedKeyword) {
      return;
    }

    setSelectedKeyword(normalizedKeyword);
    setCustomKeywords((current) => {
      const nextKeywords = [
        normalizedKeyword,
        ...current.filter((item) => item !== normalizedKeyword)
      ];
      return nextKeywords.slice(0, 6);
    });
  }

  return (
    <section className="workbench-shell__hero-card workbench-shell__hero-card--content">
      <div className="workbench-shell__panel-kicker">内容</div>
      <div className="workbench-shell__section-heading">
        <h2>内容监控与素材池</h2>
        <p>{poolDescription}</p>
      </div>

      <ContentFilterBar
        platforms={platformItems}
        keywords={keywordItems}
        keywordDraft={keywordDraft}
        ranges={[
          { id: "24h", label: "近24小时" },
          { id: "3d", label: "近3天" },
          { id: "7d", label: "近7天" }
        ]}
        poolViews={[
          { id: "all", label: "全部内容" },
          { id: "hot", label: "只看热点" },
          { id: "pool", label: "只看选题池" }
        ]}
        selectedPlatformId={selectedPlatformId}
        selectedKeywordId={selectedKeyword}
        selectedRangeId={selectedContentRange}
        selectedPoolView={contentPoolView}
        onKeywordDraftChange={setKeywordDraft}
        onSelectPlatformId={onSelectPlatformId}
        onSelectKeywordId={handleSelectKeyword}
        onSelectRangeId={onSelectContentRange}
        onSelectPoolView={onSelectContentPoolView}
        onSubmitKeywordSearch={handleSubmitKeywordSearch}
      />

      {selectedKeyword ? <p className="workbench-shell__panel-note">{wechatStatusLine}</p> : null}

      <ContentTrendStrip
        items={trendItems}
        selectedDate={resolvedSelectedDate}
        onSelectDate={onSelectContentDate}
      />

      <ContentPool
        title={poolTitle}
        description={poolDescription}
        items={visibleContent}
        highlightedContentIds={highlightedContentIds}
        pooledContentIds={pooledContentIds}
        onOpenLinkedInsight={onOpenLinkedInsight}
        onTogglePool={onTogglePool}
        regionLabel="内容池"
      />

      <ContentPool
        title="公众号文章列表"
        description={selectedKeyword ? `按关键词“${selectedKeyword}”抓取的公众号文章样本。` : "先输入关键词后再抓取公众号文章。"}
        items={wechatContent}
        highlightedContentIds={[]}
        pooledContentIds={pooledContentIds}
        onOpenLinkedInsight={onOpenLinkedInsight}
        onTogglePool={onTogglePool}
        status={wechatStatus}
        statusMessage={
          wechatStatus === "loading"
            ? "正在获取公众号文章，请稍候..."
            : wechatStatus === "error"
              ? "公众号接口暂时不可用，请稍后重试。"
              : undefined
        }
        emptyTitle="公众号文章为空"
        regionLabel="公众号文章列表"
      />
    </section>
  );
}

export default ContentTab;
