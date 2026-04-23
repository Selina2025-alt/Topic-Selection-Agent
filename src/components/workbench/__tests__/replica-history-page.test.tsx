import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import MonitoringWorkbench from "@/components/workbench/monitoring-workbench";

describe("replica history page", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it("shows search history as a top-level tab page", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/keyword-targets?categoryId=claude") {
          return { ok: true, json: async () => ({ keywordTargets: [] }) };
        }

        if (url === "/api/history?categoryId=claude") {
          return {
            ok: true,
            json: async () => ({
              queries: [
                {
                  id: "query-1",
                  categoryId: "claude",
                  keywordTargetId: "claude-keyword-1",
                  keyword: "claude code",
                  platformScope: "xiaohongshu",
                  triggerType: "manual_refresh",
                  status: "success",
                  fetchedCount: 18,
                  cappedCount: 18,
                  startedAt: "2026-04-01T10:00:00.000Z",
                  finishedAt: "2026-04-01T10:01:00.000Z",
                  errorMessage: null
                }
              ]
            })
          };
        }

        throw new Error(`Unexpected fetch url: ${url}`);
      })
    );

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));

    expect(await screen.findByRole("heading", { name: "搜索历史" })).toBeInTheDocument();
    expect(screen.getByText("共 1 条记录")).toBeInTheDocument();
    expect(screen.getByLabelText("平台筛选")).toBeInTheDocument();
    expect(screen.getByLabelText("关键词筛选")).toBeInTheDocument();
  });

  it("filters persisted history records by platform and keyword in the page view", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/keyword-targets?categoryId=claude") {
          return { ok: true, json: async () => ({ keywordTargets: [] }) };
        }

        if (url === "/api/history?categoryId=claude") {
          return {
            ok: true,
            json: async () => ({
              queries: [
                {
                  id: "query-1",
                  categoryId: "claude",
                  keywordTargetId: "claude-keyword-1",
                  keyword: "claude code",
                  platformScope: "xiaohongshu",
                  triggerType: "manual_refresh",
                  status: "success",
                  fetchedCount: 18,
                  cappedCount: 18,
                  startedAt: "2026-04-01T10:00:00.000Z",
                  finishedAt: "2026-04-01T10:01:00.000Z",
                  errorMessage: null
                },
                {
                  id: "query-2",
                  categoryId: "claude",
                  keywordTargetId: "claude-keyword-2",
                  keyword: "mcp",
                  platformScope: "wechat",
                  triggerType: "manual_refresh",
                  status: "success",
                  fetchedCount: 10,
                  cappedCount: 10,
                  startedAt: "2026-04-01T09:00:00.000Z",
                  finishedAt: "2026-04-01T09:01:00.000Z",
                  errorMessage: null
                }
              ]
            })
          };
        }

        throw new Error(`Unexpected fetch url: ${url}`);
      })
    );

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));
    await user.selectOptions(screen.getByLabelText("平台筛选"), "xiaohongshu");
    await user.clear(screen.getByLabelText("关键词筛选"));
    await user.type(screen.getByLabelText("关键词筛选"), "claude");

    await waitFor(() => {
      expect(screen.getByText("共 1 条记录")).toBeInTheDocument();
    });

    expect(screen.getByText("claude code")).toBeInTheDocument();
    expect(screen.queryByText(/^mcp$/i)).not.toBeInTheDocument();
  });

  it("keeps history records collapsed until a specific entry is opened", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/keyword-targets?categoryId=claude") {
        return { ok: true, json: async () => ({ keywordTargets: [] }) };
      }

      if (url === "/api/history?categoryId=claude") {
        return {
          ok: true,
          json: async () => ({
            queries: [
              {
                id: "query-1",
                categoryId: "claude",
                keywordTargetId: "claude-keyword-1",
                keyword: "claude code",
                platformScope: "xiaohongshu",
                triggerType: "manual_refresh",
                status: "success",
                fetchedCount: 18,
                cappedCount: 18,
                startedAt: "2026-04-01T10:00:00.000Z",
                finishedAt: "2026-04-01T10:01:00.000Z",
                errorMessage: null
              }
            ]
          })
        };
      }

      if (url === "/api/history/query-1") {
        return {
          ok: true,
          json: async () => ({
            query: {
              id: "query-1",
              categoryId: "claude",
              keywordTargetId: "claude-keyword-1",
              keyword: "claude code",
              platformScope: "xiaohongshu",
              triggerType: "manual_refresh",
              status: "success",
              fetchedCount: 18,
              cappedCount: 18,
              startedAt: "2026-04-01T10:00:00.000Z",
              finishedAt: "2026-04-01T10:01:00.000Z",
              errorMessage: null
            },
            analysis: null,
            items: [
              {
                id: "xhs-history-1",
                date: "2026-04-01",
                timeOfDay: "morning",
                title: "Historical xiaohongshu note",
                platformId: "xiaohongshu",
                author: "History Author",
                authorName: "History Author",
                authorId: "history-author",
                publishedAt: "2026-04-01 10:00:00",
                publishTime: "2026-04-01 10:00:00",
                publishTimestamp: 1711965600,
                heatScore: 88,
                metrics: { likes: "10", comments: "3", saves: "5" },
                matchedTargets: ["claude code"],
                aiSummary: "history summary",
                summary: "history summary",
                linkedTopicIds: [],
                includedInDailyReport: false,
                inTopicPool: false,
                keyword: "claude code",
                articleUrl: "https://example.com/history",
                sourceUrl: "https://example.com/history",
                rawOrderIndex: 0
              }
            ]
          })
        };
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));

    expect(await screen.findByText("claude code")).toBeInTheDocument();
    expect(screen.queryByText("Historical xiaohongshu note")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith("/api/history/query-1");

    await user.click(screen.getByText("claude code").closest("button") as HTMLButtonElement);

    expect(await screen.findByText("Historical xiaohongshu note")).toBeInTheDocument();
  });

  it("restores archived content and analysis from the history page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/keyword-targets?categoryId=claude") {
        return { ok: true, json: async () => ({ keywordTargets: [] }) };
      }

      if (url === "/api/history?categoryId=claude") {
        return {
          ok: true,
          json: async () => ({
            queries: [
              {
                id: "query-1",
                categoryId: "claude",
                keywordTargetId: "claude-keyword-1",
                keyword: "claude code",
                platformScope: "wechat",
                triggerType: "manual_refresh",
                status: "success",
                fetchedCount: 1,
                cappedCount: 1,
                startedAt: "2026-04-01T10:00:00.000Z",
                finishedAt: "2026-04-01T10:01:00.000Z",
                errorMessage: null
              }
            ]
          })
        };
      }

      if (url === "/api/history/query-1") {
        return {
          ok: true,
          json: async () => ({
            query: {
              id: "query-1",
              categoryId: "claude",
              keywordTargetId: "claude-keyword-1",
              keyword: "claude code",
              platformScope: "wechat",
              triggerType: "manual_refresh",
              status: "success",
              fetchedCount: 1,
              cappedCount: 1,
              startedAt: "2026-04-01T10:00:00.000Z",
              finishedAt: "2026-04-01T10:01:00.000Z",
              errorMessage: null
            },
            analysis: {
              snapshot: {
                id: "query-1-analysis",
                searchQueryId: "query-1",
                categoryId: "claude",
                keyword: "claude code",
                generatedAt: "2026-04-01T10:01:00.000Z",
                hotSummary: "历史热点摘要",
                focusSummary: "历史焦点",
                patternSummary: "历史共性",
                insightSummary: "历史洞察"
              },
              topics: [
                {
                  id: "topic-1",
                  snapshotId: "query-1-analysis",
                  title: "历史选题",
                  intro: "历史简介",
                  whyNow: "为什么做",
                  hook: "爆点",
                  growth: "增长空间",
                  supportContentIds: ["wx-history-1"]
                }
              ]
            },
            items: [
              {
                id: "wx-history-1",
                date: "2026-04-01",
                timeOfDay: "上午",
                title: "Historical wechat article",
                platformId: "wechat",
                author: "History Author",
                authorName: "History Author",
                authorId: "history-author",
                publishedAt: "2026-04-01 10:00:00",
                publishTime: "2026-04-01 10:00:00",
                publishTimestamp: 1711965600,
                heatScore: 88,
                metrics: { likes: "10", comments: "3", saves: "5" },
                matchedTargets: ["claude code"],
                aiSummary: "history summary",
                summary: "history summary",
                linkedTopicIds: [],
                includedInDailyReport: false,
                inTopicPool: false,
                keyword: "claude code",
                articleUrl: "https://example.com/history",
                sourceUrl: "https://example.com/history",
                rawOrderIndex: 0
              }
            ]
          })
        };
      }

      throw new Error(`Unexpected fetch url: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));
    await user.click(screen.getByText("claude code").closest("button") as HTMLButtonElement);
    await user.click(await screen.findByRole("button", { name: /查看内容/ }));

    expect(screen.getByRole("button", { name: "内容" }).className).toContain("is-active");
    expect(await screen.findByText("Historical wechat article")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "搜索历史" }));
    await user.click(screen.getByText("claude code").closest("button") as HTMLButtonElement);
    await user.click(await screen.findByRole("button", { name: /查看选题/ }));

    expect(screen.getByRole("button", { name: "选题分析" }).className).toContain("is-active");
    expect(await screen.findByText("历史热点摘要")).toBeInTheDocument();
  });

  it("does not fall back to legacy localStorage history when sqlite returns an empty list", async () => {
    const user = userEvent.setup();

    window.localStorage.setItem(
      "replica-search-history",
      JSON.stringify([
        {
          id: "legacy-1",
          keyword: "claude code",
          categoryId: "claude",
          categoryName: "Claude Code",
          searchedAt: "2026-04-01 10:00"
        }
      ])
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/keyword-targets?categoryId=claude") {
          return { ok: true, json: async () => ({ keywordTargets: [] }) };
        }

        if (url === "/api/history?categoryId=claude") {
          return { ok: true, json: async () => ({ queries: [] }) };
        }

        throw new Error(`Unexpected fetch url: ${url}`);
      })
    );

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));

    expect(await screen.findByText("共 0 条记录")).toBeInTheDocument();
    expect(screen.getByText("还没有搜索历史，先去内容页执行一次抓取吧。")).toBeInTheDocument();
    expect(screen.queryByText("Query not found")).not.toBeInTheDocument();
  });

  it("shows twitter/x history records with the twitter/x platform label", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();

        if (url === "/api/keyword-targets?categoryId=claude") {
          return { ok: true, json: async () => ({ keywordTargets: [] }) };
        }

        if (url === "/api/history?categoryId=claude") {
          return {
            ok: true,
            json: async () => ({
              queries: [
                {
                  id: "query-twitter-1",
                  categoryId: "claude",
                  keywordTargetId: "claude-keyword-1",
                  keyword: "claude code",
                  platformScope: "twitter",
                  triggerType: "manual_refresh",
                  status: "success",
                  fetchedCount: 6,
                  cappedCount: 6,
                  startedAt: "2026-04-01T10:00:00.000Z",
                  finishedAt: "2026-04-01T10:01:00.000Z",
                  errorMessage: null
                }
              ]
            })
          };
        }

        if (url === "/api/history/query-twitter-1") {
          return {
            ok: true,
            json: async () => ({
              query: {
                id: "query-twitter-1",
                categoryId: "claude",
                keywordTargetId: "claude-keyword-1",
                keyword: "claude code",
                platformScope: "twitter",
                triggerType: "manual_refresh",
                status: "success",
                fetchedCount: 6,
                cappedCount: 6,
                startedAt: "2026-04-01T10:00:00.000Z",
                finishedAt: "2026-04-01T10:01:00.000Z",
                errorMessage: null
              },
              analysis: null,
              items: [
                {
                  id: "twitter-history-1",
                  date: "2026-04-01",
                  timeOfDay: "上午",
                  title: "Twitter/X history post",
                  platformId: "twitter",
                  author: "History Author",
                  authorName: "History Author",
                  authorId: "history-author",
                  publishedAt: "2026-04-01 10:00:00",
                  publishTime: "2026-04-01 10:00:00",
                  publishTimestamp: 1711965600,
                  heatScore: 88,
                  metrics: { likes: "10", comments: "3", saves: "5" },
                  matchedTargets: ["claude code"],
                  aiSummary: "history summary",
                  summary: "history summary",
                  linkedTopicIds: [],
                  includedInDailyReport: false,
                  inTopicPool: false,
                  keyword: "claude code",
                  articleUrl: "https://x.com/example/status/2",
                  sourceUrl: "https://x.com/example/status/2",
                  rawOrderIndex: 0
                }
              ]
            })
          };
        }

        throw new Error(`Unexpected fetch url: ${url}`);
      })
    );

    render(<MonitoringWorkbench />);

    await user.click(screen.getByRole("button", { name: "搜索历史" }));
    await user.click(screen.getByText("claude code").closest("button") as HTMLButtonElement);

    expect(await screen.findByText("Twitter/X history post")).toBeInTheDocument();
    expect(screen.getAllByText("Twitter/X").length).toBeGreaterThan(0);
  });
});
