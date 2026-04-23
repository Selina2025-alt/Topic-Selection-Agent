import { afterEach, describe, expect, it, vi } from "vitest";

import {
  addKeywordTargetToCategory,
  buildDateOptions,
  buildReplicaArticles,
  createReplicaKeywordTarget,
  filterReplicaArticles,
  getDefaultDateId
} from "@/lib/replica-workbench";
import { initialReplicaCategories } from "@/lib/replica-workbench-data";

describe("replica workbench selectors", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds screenshot-style articles from the active keyword", () => {
    const articles = buildReplicaArticles(initialReplicaCategories[0], "claude code");

    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0]?.title).toContain("Claude Code");
  });

  it("filters by platform and date slot", () => {
    const articles = buildReplicaArticles(initialReplicaCategories[0], "claude code");
    const firstDate = getDefaultDateId(articles);
    const filtered = filterReplicaArticles(articles, "wechat", firstDate);

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((item) => item.platformId === "wechat")).toBe(true);
    expect(filtered.every((item) => item.publishedAt.startsWith(firstDate || ""))).toBe(true);
  });

  it("keeps a seven-day date timeline anchored to today even when fetched content is older", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:30:00+08:00"));

    const [singleArticle] = buildReplicaArticles(initialReplicaCategories[0], "claude code");
    const dateOptions = buildDateOptions(singleArticle ? [singleArticle] : []);

    expect(dateOptions.length).toBeGreaterThanOrEqual(7);
    expect(dateOptions[0]?.id).toBe("2026-04-03");
  });

  it("keeps the date timeline anchored to the latest run date when it is newer than the content", () => {
    const [singleArticle] = buildReplicaArticles(initialReplicaCategories[0], "claude code");
    const dateOptions = buildDateOptions(singleArticle ? [singleArticle] : [], "2026-04-03T09:30:00+08:00");

    expect(dateOptions[0]?.id).toBe("2026-04-03");
  });

  it("keeps the default selected date on the latest available content date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:30:00+08:00"));

    const [singleArticle] = buildReplicaArticles(initialReplicaCategories[0], "claude code");

    expect(getDefaultDateId(singleArticle ? [singleArticle] : [])).toBe(
      singleArticle?.publishedAt.slice(0, 10)
    );
  });

  it("uses the latest run date as the default selected date when there is no content yet", () => {
    expect(getDefaultDateId([], "2026-04-03T09:30:00+08:00")).toBe("2026-04-03");
  });

  it("creates keyword targets with multiple platform bindings", () => {
    const keywordTarget = createReplicaKeywordTarget("openclaw", ["wechat", "xiaohongshu"]);

    expect(keywordTarget.keyword).toBe("openclaw");
    expect(keywordTarget.platformIds).toEqual(["wechat", "xiaohongshu"]);
    expect(keywordTarget.lastRunStatus).toBe("idle");
    expect(keywordTarget.lastResultCount).toBe(0);
  });

  it("keeps legacy keywords in sync when adding a keyword target", () => {
    const category = addKeywordTargetToCategory(initialReplicaCategories[0], {
      keyword: "openclaw",
      platformIds: ["wechat", "xiaohongshu"]
    });

    expect(category.keywordTargets.some((item) => item.keyword === "openclaw")).toBe(true);
    expect(category.keywords).toContain("openclaw");
  });
});
