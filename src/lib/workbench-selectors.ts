import {
  ContentItem,
  DailyReport,
  MonitorCategory,
  TopicIdea,
  WorkbenchState
} from "@/lib/types";

function getDefaultCategory(categories: MonitorCategory[]) {
  return categories[0];
}

function getLatestReport(reports: DailyReport[]) {
  return reports.reduce<DailyReport | undefined>((latest, report) => {
    if (!latest) {
      return report;
    }

    return report.date > latest.date ? report : latest;
  }, undefined);
}

function resolveCategory(categories: MonitorCategory[], categoryId: string) {
  return categories.find((category) => category.id === categoryId) ?? getDefaultCategory(categories);
}

function resolveReport(category: MonitorCategory, date: string) {
  return category.reports.find((report) => report.date === date) ?? getLatestReport(category.reports);
}

export function buildInitialWorkbenchState(categories: MonitorCategory[]): WorkbenchState {
  const firstCategory = getDefaultCategory(categories);

  if (!firstCategory) {
    return {
      selectedCategoryId: "",
      activeTab: "report",
      reportView: "daily",
      selectedReportDate: "",
      selectedContentDate: "",
      selectedPlatformId: "all",
      selectedContentRange: "7d",
      contentPoolView: "all",
      contentFocusMode: null,
      focusedTopicId: null,
      highlightedContentIds: [],
      pooledContentIds: [],
      pendingActionIds: []
    };
  }

  const latestReport = getLatestReport(firstCategory.reports);
  const focusedTopicId = latestReport?.topics[0]?.id ?? null;
  const selectedReportDate = latestReport?.date ?? "";

  return {
    selectedCategoryId: firstCategory.id,
    activeTab: "report",
    reportView: "daily",
    selectedReportDate,
    selectedContentDate: selectedReportDate,
    selectedPlatformId: "all",
    selectedContentRange: "7d",
    contentPoolView: "all",
    contentFocusMode: null,
    focusedTopicId,
    highlightedContentIds: [],
    pooledContentIds: firstCategory.content
      .filter((content) => content.inTopicPool)
      .map((content) => content.id),
    pendingActionIds: []
  };
}

export function getActiveCategory(categories: MonitorCategory[], categoryId: string) {
  return resolveCategory(categories, categoryId) ?? categories[0]!;
}

export function getCurrentDailyReport(category: MonitorCategory, date: string) {
  return resolveReport(category, date) ?? category.reports[0]!;
}

export function getLinkedContentIds(topic: TopicIdea) {
  const seen = new Set<string>();

  return topic.evidence.flatMap((item) => item.contentIds).filter((contentId) => {
    if (seen.has(contentId)) {
      return false;
    }

    seen.add(contentId);
    return true;
  });
}

export function getTopicById(category: MonitorCategory, topicId: string) {
  return category.reports.flatMap((report) => report.topics).find((topic) => topic.id === topicId);
}

export function getLinkedContent(category: MonitorCategory, topic: TopicIdea) {
  const linkedIds = getLinkedContentIds(topic);

  return category.content.filter((content) => linkedIds.includes(content.id));
}

export function getTopLinkedContent(category: MonitorCategory, topic: TopicIdea, limit = 3) {
  return getLinkedContent(category, topic)
    .slice()
    .sort((left, right) => right.heatScore - left.heatScore)
    .slice(0, limit);
}

export function getTimelineContent(category: MonitorCategory, topic: TopicIdea) {
  return category.content
    .filter((content) => content.linkedTopicIds.includes(topic.id))
    .slice()
    .sort((left, right) => {
      if (right.date === left.date) {
        return right.publishedAt.localeCompare(left.publishedAt);
      }

      return right.date.localeCompare(left.date);
    });
}

export function getLeadPlatformLabel(content: ContentItem[]) {
  const counts = new Map<ContentItem["platformId"], number>();

  for (const item of content) {
    counts.set(item.platformId, (counts.get(item.platformId) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "all";
}
