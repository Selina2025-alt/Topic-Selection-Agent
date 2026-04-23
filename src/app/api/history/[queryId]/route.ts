import { NextResponse } from "next/server";

import {
  createMonitoringRepository,
  getAnalysisEvidenceItemsBySnapshotId,
  getAnalysisSnapshotBySearchQuery,
  getSearchQueryById,
  listCollectedContentsBySearchQuery
} from "@/lib/db/monitoring-repository";

export async function GET(
  _request: Request,
  context: { params: Promise<{ queryId: string }> }
) {
  const { queryId } = await context.params;
  const repository = createMonitoringRepository();

  try {
    const query = getSearchQueryById(repository, queryId);

    if (!query) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    const analysisSnapshot = getAnalysisSnapshotBySearchQuery(repository, queryId);
    const analysis = analysisSnapshot
      ? {
          ...analysisSnapshot,
          evidenceItems: getAnalysisEvidenceItemsBySnapshotId(repository, analysisSnapshot.snapshot.id)
        }
      : null;
    const items = listCollectedContentsBySearchQuery(repository, { searchQueryId: queryId });

    return NextResponse.json({ query, analysis, items });
  } finally {
    repository.database.close();
  }
}
