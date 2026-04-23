import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  HISTORY_LIMIT,
  loadSearchHistory,
  saveSearchHistoryEntry,
  type SearchHistoryEntry
} from "@/lib/search-history";

describe("search history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves the latest search first and trims to the configured limit", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T10:00:00+08:00"));

    for (let index = 0; index < HISTORY_LIMIT + 3; index += 1) {
      saveSearchHistoryEntry({
        keyword: `keyword-${index}`,
        categoryId: `category-${index}`,
        categoryName: `Category ${index}`
      });
    }

    const history = loadSearchHistory();

    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]?.keyword).toBe(`keyword-${HISTORY_LIMIT + 2}`);
    expect(history.at(-1)?.keyword).toBe("keyword-3");
  });

  it("moves an existing category-keyword pair to the top instead of duplicating it", () => {
    const first: SearchHistoryEntry = {
      id: "history-1",
      keyword: "openclaw",
      categoryId: "claude",
      categoryName: "Claude Code 选题监控",
      searchedAt: "2026-03-30 09:00"
    };

    localStorage.setItem("replica-search-history", JSON.stringify([first]));

    saveSearchHistoryEntry({
      keyword: "openclaw",
      categoryId: "claude",
      categoryName: "Claude Code 选题监控"
    });

    const history = loadSearchHistory();

    expect(history).toHaveLength(1);
    expect(history[0]?.keyword).toBe("openclaw");
    expect(history[0]?.categoryId).toBe("claude");
    expect(history[0]?.searchedAt).not.toBe("2026-03-30 09:00");
  });
});
