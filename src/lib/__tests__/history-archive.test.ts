// @vitest-environment node

import { describe, expect, it } from "vitest";

import { buildAnalysisArchiveSnapshot } from "@/lib/history-archive";

describe("history archive", () => {
  it("creates a persisted analysis snapshot from the latest report", () => {
    const snapshotPayload = buildAnalysisArchiveSnapshot({
      searchQueryId: "query-1",
      categoryId: "claude",
      keyword: "claude code",
      reports: [
        {
          id: "report-older",
          date: "2026-03-31",
          label: "3月31日",
          hotSummary: "older hot",
          focusSummary: "older focus",
          patternSummary: "older pattern",
          insightSummary: "older insight",
          suggestions: [
            {
              id: "topic-older",
              title: "Older topic",
              intro: "older intro",
              whyNow: "older why",
              hook: "older hook",
              growth: "older growth",
              supportContentIds: ["content-1"]
            }
          ]
        },
        {
          id: "report-latest",
          date: "2026-04-01",
          label: "4月1日",
          hotSummary: "latest hot",
          focusSummary: "latest focus",
          patternSummary: "latest pattern",
          insightSummary: "latest insight",
          suggestions: [
            {
              id: "topic-latest",
              title: "Latest topic",
              intro: "latest intro",
              whyNow: "latest why",
              hook: "latest hook",
              growth: "latest growth",
              supportContentIds: ["content-2", "content-3"]
            }
          ]
        }
      ]
    });

    expect(snapshotPayload).toMatchObject({
      snapshot: {
        id: "query-1-analysis",
        searchQueryId: "query-1",
        categoryId: "claude",
        keyword: "claude code",
        hotSummary: "latest hot",
        focusSummary: "latest focus",
        patternSummary: "latest pattern",
        insightSummary: "latest insight"
      },
      topics: [
        {
          id: "topic-latest",
          snapshotId: "query-1-analysis",
          title: "Latest topic",
          supportContentIds: ["content-2", "content-3"]
        }
      ]
    });
  });

  it("returns empty summaries and topics when no reports are available", () => {
    const snapshotPayload = buildAnalysisArchiveSnapshot({
      searchQueryId: "query-2",
      categoryId: "claude",
      keyword: "claude code",
      reports: []
    });

    expect(snapshotPayload).toMatchObject({
      snapshot: {
        id: "query-2-analysis",
        searchQueryId: "query-2",
        categoryId: "claude",
        keyword: "claude code",
        hotSummary: "",
        focusSummary: "",
        patternSummary: "",
        insightSummary: ""
      },
      topics: []
    });
  });
});
