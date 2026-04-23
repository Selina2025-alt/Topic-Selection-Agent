// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createMonitoringRepository,
  getAnalysisEvidenceItemsBySnapshotId,
  getGlobalAnalysisSettings,
  initializeMonitoringDatabase,
  saveGlobalAnalysisSettings,
  upsertAnalysisEvidenceItems
} from "@/lib/db/monitoring-repository";

describe("analysis settings and evidence persistence", () => {
  it("stores and reloads the global analysis schedule", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    saveGlobalAnalysisSettings(repository, {
      enabled: true,
      time: "09:30",
      provider: "SiliconFlow",
      model: "zai-org/GLM-5"
    });

    expect(getGlobalAnalysisSettings(repository)).toEqual({
      enabled: true,
      time: "09:30",
      provider: "SiliconFlow",
      model: "Pro/zai-org/GLM-5"
    });

    database.close();
  });

  it("stores and reads stage-one evidence items by snapshot id", () => {
    const database = initializeMonitoringDatabase(":memory:");
    const repository = createMonitoringRepository(database);

    upsertAnalysisEvidenceItems(repository, {
      snapshotId: "snapshot-1",
      items: [
        {
          id: "evidence-1",
          snapshotId: "snapshot-1",
          contentId: "content-1",
          keyword: "claude code",
          platformId: "wechat",
          title: "Article title",
          briefSummary: "Short summary",
          keyFacts: ["fact"],
          keywords: ["Claude Code"],
          highlights: ["highlight"],
          attentionSignals: ["signal"],
          topicAngles: ["angle"],
          createdAt: "2026-04-03T08:00:00.000Z"
        }
      ]
    });

    expect(getAnalysisEvidenceItemsBySnapshotId(repository, "snapshot-1")).toEqual([
      {
        id: "evidence-1",
        snapshotId: "snapshot-1",
        contentId: "content-1",
        keyword: "claude code",
        platformId: "wechat",
        title: "Article title",
        briefSummary: "Short summary",
        keyFacts: ["fact"],
        keywords: ["Claude Code"],
        highlights: ["highlight"],
        attentionSignals: ["signal"],
        topicAngles: ["angle"],
        createdAt: "2026-04-03T08:00:00.000Z"
      }
    ]);

    database.close();
  });
});
