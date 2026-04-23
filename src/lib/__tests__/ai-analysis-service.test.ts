// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { buildTopicAnalysis } from "@/lib/ai-analysis-service";
import type { ContentItem } from "@/lib/types";

describe("ai analysis service", () => {
  it("returns structured evidence items and at least five topic suggestions", async () => {
    const completeJson = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            contentId: "content-1",
            title: "Article title",
            platform: "wechat",
            author: "author",
            briefSummary: "summary",
            keyFacts: ["fact"],
            keywords: ["Claude Code"],
            highlights: ["highlight"],
            attentionSignals: ["signal"],
            topicAngles: ["angle"]
          }
        ]
      })
      .mockResolvedValueOnce({
        hotSummary: "hot",
        focusSummary: "focus",
        patternSummary: "pattern",
        insightSummary: "insight",
        topics: new Array(5).fill(null).map((_, index) => ({
          title: `Topic ${index + 1}`,
          intro: "intro",
          whyNow: "why",
          hook: "hook",
          growth: "growth",
          coreKeywords: ["Claude Code"],
          supportContentIds: ["content-1"],
          evidenceSummary: "evidence"
        }))
      });

    const result = await buildTopicAnalysis({
      keyword: "claude code",
      items: [buildContentItem()],
      client: { completeJson } as never
    });

    expect(result?.evidenceItems).toHaveLength(1);
    expect(result?.snapshot.topics).toHaveLength(5);
  });
});

function buildContentItem(): ContentItem {
  return {
    id: "content-1",
    date: "2026-04-03",
    timeOfDay: "涓婂崍",
    title: "Article title",
    platformId: "wechat",
    author: "author",
    summary: "body",
    authorName: "author",
    authorId: "author-1",
    publishedAt: "2026-04-03 08:00:00",
    publishTime: "2026-04-03 08:00:00",
    publishTimestamp: 1712102400,
    heatScore: 98,
    metrics: {
      likes: "100",
      comments: "20",
      saves: "30"
    },
    matchedTargets: ["claude code"],
    aiSummary: "body",
    linkedTopicIds: [],
    includedInDailyReport: false,
    inTopicPool: false,
    keyword: "claude code",
    articleUrl: "https://example.com/article",
    sourceUrl: "https://example.com/article"
  };
}
