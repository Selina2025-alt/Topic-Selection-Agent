import type { PersistedAnalysisSnapshotDetail } from "@/lib/db/monitoring-repository";
import type { ReplicaDailyReport, ReplicaTopicSuggestion } from "@/lib/replica-workbench-data";
import { formatLocalDate, formatLocalDateTime } from "@/lib/time-utils";
import type { ContentItem } from "@/lib/types";

function titleCaseKeyword(keyword: string) {
  return keyword
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizePlatforms(items: ContentItem[]) {
  const labels = Array.from(new Set(items.map((item) => item.platformId)));

  if (labels.length === 0) {
    return "多平台";
  }

  return labels.join(" / ");
}

function buildTopicSuggestions(keyword: string, items: ContentItem[]): ReplicaTopicSuggestion[] {
  const displayKeyword = titleCaseKeyword(keyword);
  const topItems = items.slice(0, 3);
  const supportContentIds = topItems.map((item) => item.id);
  const leadTitle = topItems[0]?.title || `${displayKeyword} 最新案例`;

  return [
    {
      id: `${formatLocalDate(new Date())}-${keyword}-workflow`,
      title: `${displayKeyword} 工作流拆解`,
      intro: `围绕 ${leadTitle} 这类高热案例，整理 ${displayKeyword} 在真实生产流程里的落地方式。`,
      whyNow: `${displayKeyword} 相关讨论已经从功能介绍转向真实效果验证，工作流型内容更容易建立信任。`,
      hook: "优先展示真实前后对比、任务拆解步骤和可复制模板。",
      growth: "后续可以自然延展到团队协作规范、提示词模板和风险复盘内容。",
      supportContentIds
    },
    {
      id: `${formatLocalDate(new Date())}-${keyword}-evidence`,
      title: `${displayKeyword} 结果证明型选题`,
      intro: `把 ${displayKeyword} 的真实结果、成本变化和踩坑经验整理成案例型内容。`,
      whyNow: "用户更关注具体结果和适用边界，而不是抽象能力介绍。",
      hook: "用真实标题、作者案例和互动数据做证据，会更容易驱动点击和收藏。",
      growth: "可以继续扩展到行业案例、岗位模板和不同平台内容打法。",
      supportContentIds
    }
  ];
}

export function buildFreshAnalysisReport(keyword: string, items: ContentItem[], generatedAt: Date | string = new Date()) {
  const generatedDate = formatLocalDate(generatedAt);
  const generatedDateTime = formatLocalDateTime(generatedAt);
  const displayKeyword = titleCaseKeyword(keyword);
  const topItem = items[0];
  const platformSummary = summarizePlatforms(items);

  if (items.length === 0) {
    return {
      id: `report-${keyword}-${generatedDate}`,
      date: generatedDate,
      label: generatedDate,
      hotSummary: `今天围绕 ${displayKeyword} 暂无新增高热内容，建议继续观察跨平台变化。`,
      focusSummary: `${generatedDateTime} 这次刷新没有拿到新的有效样本，用户关注点仍需通过后续更新继续验证。`,
      patternSummary: "当前样本不足，暂时无法形成新的爆款共性拆解。",
      insightSummary: "可以继续观察同关键词在不同平台的发酵节奏，必要时扩大关键词覆盖范围。",
      suggestions: buildTopicSuggestions(keyword, items)
    } satisfies ReplicaDailyReport;
  }

  return {
    id: `report-${keyword}-${generatedDate}`,
    date: generatedDate,
    label: generatedDate,
    hotSummary: `${displayKeyword} 最新高热样本主要集中在 ${platformSummary}，最值得优先拆解的是《${topItem?.title || `${displayKeyword} 最新案例`}》。`,
    focusSummary: `用户昨天更关注 ${displayKeyword} 是否真的能接入日常生产流，而不是单纯的功能演示。`,
    patternSummary: "高热内容普遍采用强结论标题、真实案例和可复用步骤，且会给出明确的前后对比。",
    insightSummary: "优先做结果证明型和工作流拆解型选题，再补充团队协作、边界风险和落地模版。",
    suggestions: buildTopicSuggestions(keyword, items)
  } satisfies ReplicaDailyReport;
}

export function mergeFreshReportIntoReports(
  reports: ReplicaDailyReport[],
  freshReport: ReplicaDailyReport,
  limit = 14
) {
  return [freshReport, ...reports.filter((report) => report.id !== freshReport.id && report.date !== freshReport.date)]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}

export function mapPersistedAnalysisSnapshotToReport(
  detail: PersistedAnalysisSnapshotDetail
): ReplicaDailyReport {
  return {
    id: detail.snapshot.id,
    date: formatLocalDate(detail.snapshot.generatedAt),
    label: formatLocalDate(detail.snapshot.generatedAt),
    hotSummary: detail.snapshot.hotSummary,
    focusSummary: detail.snapshot.focusSummary,
    patternSummary: detail.snapshot.patternSummary,
    insightSummary: detail.snapshot.insightSummary,
    suggestions: detail.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      intro: topic.intro,
      whyNow: topic.whyNow,
      hook: topic.hook,
      growth: topic.growth,
      supportContentIds: topic.supportContentIds
    }))
  };
}

export function mergePersistedReportsIntoReports(
  reports: ReplicaDailyReport[],
  persistedReports: ReplicaDailyReport[],
  limit = 14
) {
  return persistedReports.reduce(
    (current, report) => mergeFreshReportIntoReports(current, report, limit),
    reports
  );
}
