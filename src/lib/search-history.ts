"use client";

export interface SearchHistoryEntry {
  id: string;
  keyword: string;
  categoryId: string;
  categoryName: string;
  searchedAt: string;
}

const STORAGE_KEY = "replica-search-history";

export const HISTORY_LIMIT = 12;

function formatSearchTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function loadSearchHistory() {
  if (typeof window === "undefined") {
    return [] as SearchHistoryEntry[];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [] as SearchHistoryEntry[];
  }

  try {
    const parsed = JSON.parse(rawValue) as SearchHistoryEntry[];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as SearchHistoryEntry[];
  }
}

export function saveSearchHistoryEntry(input: {
  keyword: string;
  categoryId: string;
  categoryName: string;
}) {
  if (typeof window === "undefined") {
    return [] as SearchHistoryEntry[];
  }

  const keyword = input.keyword.trim();

  if (!keyword) {
    return loadSearchHistory();
  }

  const nextEntry: SearchHistoryEntry = {
    id: `${input.categoryId}-${Date.now()}`,
    keyword,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    searchedAt: formatSearchTimestamp(new Date())
  };

  const nextHistory = [
    nextEntry,
    ...loadSearchHistory().filter(
      (item) =>
        !(
          item.categoryId === nextEntry.categoryId &&
          item.keyword.toLowerCase() === nextEntry.keyword.toLowerCase()
        )
    )
  ].slice(0, HISTORY_LIMIT);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));

  return nextHistory;
}
