import type {
  PersistedAnalysisSnapshot,
  PersistedAnalysisTopic
} from "@/lib/db/monitoring-repository";
import type { ReplicaDailyReport } from "@/lib/replica-workbench-data";
import { formatLocalDateTime } from "@/lib/time-utils";

export interface BuildAnalysisArchiveSnapshotInput {
  searchQueryId: string;
  categoryId: string;
  keyword: string;
  reports: ReplicaDailyReport[];
  generatedAt?: string;
}

function getLatestReport(reports: ReplicaDailyReport[]) {
  return reports.reduce<ReplicaDailyReport | undefined>((latest, report) => {
    if (!latest) {
      return report;
    }

    return report.date > latest.date ? report : latest;
  }, undefined);
}

export function buildAnalysisArchiveSnapshot(
  input: BuildAnalysisArchiveSnapshotInput
): { snapshot: PersistedAnalysisSnapshot; topics: PersistedAnalysisTopic[] } {
  const activeReport = getLatestReport(input.reports);
  const snapshotId = `${input.searchQueryId}-analysis`;

  const topics: PersistedAnalysisTopic[] = (activeReport?.suggestions ?? []).map((suggestion) => ({
    id: suggestion.id,
    snapshotId,
    title: suggestion.title,
    intro: suggestion.intro,
    whyNow: suggestion.whyNow,
    hook: suggestion.hook,
    growth: suggestion.growth,
    supportContentIds: suggestion.supportContentIds
  }));

  return {
    snapshot: {
    id: snapshotId,
    searchQueryId: input.searchQueryId,
    categoryId: input.categoryId,
    keyword: input.keyword,
    generatedAt: input.generatedAt ?? formatLocalDateTime(new Date()),
    hotSummary: activeReport?.hotSummary ?? "",
    focusSummary: activeReport?.focusSummary ?? "",
    patternSummary: activeReport?.patternSummary ?? "",
    insightSummary: activeReport?.insightSummary ?? ""
    },
    topics
  };
}
