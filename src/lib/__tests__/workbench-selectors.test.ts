import { describe, expect, it } from "vitest";

import { monitorCategories } from "@/lib/mock-data";
import {
  buildInitialWorkbenchState,
  getActiveCategory,
  getCurrentDailyReport,
  getLinkedContentIds
} from "@/lib/workbench-selectors";

describe("workbench selectors", () => {
  it("builds the default workbench state from the first category and latest report date", () => {
    const state = buildInitialWorkbenchState(monitorCategories);

    expect(state.selectedCategoryId).toBe("claudecode");
    expect(state.activeTab).toBe("report");
    expect(state.selectedPlatformId).toBe("all");
    expect(state.selectedReportDate).toBe("2026-03-26");
    expect(state.selectedContentDate).toBe("2026-03-26");
  });

  it("uses the latest report date even when reports are not sorted and falls back to that date", () => {
    const reversedCategories = [
      {
        ...monitorCategories[0],
        reports: [...monitorCategories[0].reports].reverse()
      },
      monitorCategories[1]
    ];

    const state = buildInitialWorkbenchState(reversedCategories);
    const category = getActiveCategory(reversedCategories, "claudecode");
    const report = getCurrentDailyReport(category, "2026-03-20");

    expect(state.selectedReportDate).toBe("2026-03-26");
    expect(state.selectedContentDate).toBe("2026-03-26");
    expect(report.date).toBe("2026-03-26");
  });

  it("returns the expected linked content ids for the first ClaudeCode topic", () => {
    const category = getActiveCategory(monitorCategories, "claudecode");
    const report = getCurrentDailyReport(category, "2026-03-26");
    const topic = report.topics[0];

    expect(getLinkedContentIds(topic)).toEqual([
      "cc-xhs-0326-1",
      "cc-bili-0326-1",
      "cc-dy-0326-1"
    ]);
  });

  it("deduplicates linked content ids and keeps topic membership normalized", () => {
    const category = getActiveCategory(monitorCategories, "claudecode");
    const report = getCurrentDailyReport(category, "2026-03-26");
    const topic = {
      ...report.topics[0],
      evidence: [
        ...report.topics[0].evidence,
        {
          ...report.topics[0].evidence[0],
          id: "cc-evidence-duplicate",
          contentIds: [...report.topics[0].evidence[0].contentIds, "cc-xhs-0326-1"]
        }
      ]
    };

    expect(getLinkedContentIds(topic)).toEqual([
      "cc-xhs-0326-1",
      "cc-bili-0326-1",
      "cc-dy-0326-1"
    ]);
    expect(topic.sourcePlatforms).not.toContain("all");
    expect(report.topics[0].evidence[0].sourcePlatformIds).not.toContain("all");
  });

  it("keeps actionable category metadata numeric for UI consumers", () => {
    const category = monitorCategories[0];

    expect(category.overview.platformCount).toBe(category.settings.platforms.length);
    expect(category.overview.keywordCount).toBe(category.settings.keywords.length);
    expect(category.overview.creatorCount).toBe(category.settings.creators.length);
    expect(category.todayCollectionCount).toBe(category.content.length);
    expect(category.settings.platforms[0].successRate).toBe(81);
    expect(category.settings.platforms[0].qualityRate).toBe(78);
    expect(category.settings.keywords[0].platformIds).toEqual([
      "xiaohongshu",
      "bilibili",
      "douyin",
      "weibo"
    ]);
    expect(category.settings.creators[0].platformId).toBe("xiaohongshu");
    expect(category.settings.creators[0].weeklyUpdateCount).toBe(4);
  });

  it("keeps evidence content ids and linked topic ids consistent across the mock graph", () => {
    for (const category of monitorCategories) {
      const topicIds = new Set(
        category.reports.flatMap((report) => report.topics.map((topic) => topic.id))
      );
      const contentIds = new Set(category.content.map((content) => content.id));

      for (const report of category.reports) {
        for (const topic of report.topics) {
          for (const evidence of topic.evidence) {
            for (const contentId of evidence.contentIds) {
              expect(contentIds.has(contentId)).toBe(true);
            }
          }
        }
      }

      for (const content of category.content) {
        for (const linkedTopicId of content.linkedTopicIds) {
          expect(topicIds.has(linkedTopicId)).toBe(true);
        }
      }
    }
  });
});
