import {
  createMonitoringRepository,
  getGlobalAnalysisSettings,
  listAllKeywordTargets
} from "../src/lib/db/monitoring-repository";
import { runKeywordTopicAnalysis } from "../src/lib/analysis-orchestrator";

async function main() {
  const repository = createMonitoringRepository();

  try {
    const settings = getGlobalAnalysisSettings(repository);

    if (!settings.enabled) {
      console.log("Daily analysis disabled.");
      return;
    }

    const keywordTargets = listAllKeywordTargets(repository);

    if (keywordTargets.length === 0) {
      console.log("No keyword targets configured.");
      return;
    }

    for (const keywordTarget of keywordTargets) {
      const platformIds = keywordTarget.platformIds.filter(
        (platformId): platformId is "wechat" | "xiaohongshu" | "twitter" =>
          platformId === "wechat" || platformId === "xiaohongshu" || platformId === "twitter"
      );

      if (platformIds.length === 0) {
        continue;
      }

      const result = await runKeywordTopicAnalysis({
        repository,
        categoryId: keywordTarget.categoryId,
        keywordTarget,
        platformIds,
        mode: "scheduled"
      });

      if (result.skipped) {
        console.log(`[${keywordTarget.categoryId}] ${keywordTarget.keyword}: skipped (${result.reason})`);
        continue;
      }

      console.log(
        `[${keywordTarget.categoryId}] ${keywordTarget.keyword}: report generated (${result.report.id})`
      );
    }
  } finally {
    repository.database.close();
  }
}

void main();
