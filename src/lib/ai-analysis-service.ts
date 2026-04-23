import type { ContentItem } from "@/lib/types";

export interface AnalysisEvidenceDraft {
  contentId: string;
  title: string;
  platform: string;
  author: string;
  briefSummary: string;
  keyFacts: string[];
  keywords: string[];
  highlights: string[];
  attentionSignals: string[];
  topicAngles: string[];
}

export interface AnalysisTopicDraft {
  title: string;
  intro: string;
  whyNow: string;
  hook: string;
  growth: string;
  coreKeywords: string[];
  supportContentIds: string[];
  evidenceSummary: string;
}

export interface AnalysisSnapshotDraft {
  hotSummary: string;
  focusSummary: string;
  patternSummary: string;
  insightSummary: string;
  topics: AnalysisTopicDraft[];
}

interface AnalysisClient {
  completeJson(input: { system: string; user: string }): Promise<unknown>;
}

export async function buildTopicAnalysis(input: {
  keyword: string;
  items: ContentItem[];
  client: AnalysisClient;
}): Promise<{
  evidenceItems: AnalysisEvidenceDraft[];
  snapshot: AnalysisSnapshotDraft;
} | null> {
  if (input.items.length === 0) {
    return null;
  }

  const evidencePayload = (await input.client.completeJson({
    system:
      "You extract structured evidence from monitored content. Return valid JSON only.",
    user: JSON.stringify({
      keyword: input.keyword,
      items: input.items.map((item) => ({
        contentId: item.id,
        title: item.title,
        platform: item.platformId,
        author: item.authorName ?? item.author,
        summary: item.summary ?? item.aiSummary ?? "",
        publishedAt: item.publishedAt
      }))
    })
  })) as { items: AnalysisEvidenceDraft[] };

  const snapshotPayload = (await input.client.completeJson({
    system:
      "You generate a structured daily topic analysis report. Return valid JSON only with at least five topic suggestions.",
    user: JSON.stringify({
      keyword: input.keyword,
      evidenceItems: evidencePayload.items
    })
  })) as AnalysisSnapshotDraft;

  return {
    evidenceItems: evidencePayload.items,
    snapshot: snapshotPayload
  };
}
