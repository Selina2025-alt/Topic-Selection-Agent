"use client";

import { useEffect, useMemo, useState } from "react";

import { DEFAULT_SILICONFLOW_MODEL } from "@/lib/analysis-models";
import {
  ReplicaAnalysisPanel,
  type ReplicaAnalysisDetail
} from "@/components/workbench/replica-analysis-panel";
import { ReplicaContentList } from "@/components/workbench/replica-content-list";
import { ReplicaDateRow } from "@/components/workbench/replica-date-row";
import {
  ReplicaHistoryPage,
  type ReplicaHistoryDetail,
  type ReplicaHistoryQuery
} from "@/components/workbench/replica-history-page";
import { ReplicaKeywordBar } from "@/components/workbench/replica-keyword-bar";
import { ReplicaPlatformRow } from "@/components/workbench/replica-platform-row";
import {
  ReplicaSettingsPanel,
  type ReplicaGlobalAnalysisSettings
} from "@/components/workbench/replica-settings-panel";
import { ReplicaSidebar } from "@/components/workbench/replica-sidebar";
import { ReplicaTopbar } from "@/components/workbench/replica-topbar";
import {
  buildFreshAnalysisReport,
  mergeFreshReportIntoReports,
  mergePersistedReportsIntoReports
} from "@/lib/analysis-report";
import {
  initialReplicaCategories,
  replicaPlatforms,
  type ReplicaAnalysisMode,
  type ReplicaArticle,
  type ReplicaCategory,
  type ReplicaKeywordTarget,
  type ReplicaPlatformId,
  type ReplicaTrackedPlatformId,
  type ReplicaTabId
} from "@/lib/replica-workbench-data";
import {
  addCreatorToCategory,
  addKeywordTargetToCategory,
  buildDateOptions,
  buildReplicaArticles,
  createReplicaCategory,
  filterReplicaArticles,
  getDefaultDateId,
  mapContentItemsToReplicaArticles,
  mergeKeywordTargetsIntoCategory,
  normalizeCategoryInput,
  removeCreatorFromCategory,
  removeKeywordFromCategory,
  removeReplicaCategory,
  renameReplicaCategory
} from "@/lib/replica-workbench";
import {
  loadSearchHistory,
  saveSearchHistoryEntry,
  type SearchHistoryEntry
} from "@/lib/search-history";
import { formatLocalDateTime } from "@/lib/time-utils";
import type { ContentItem } from "@/lib/types";

interface ContentResponseMeta {
  source: string;
  sortedBy: string;
  persisted?: boolean;
  fetchedCount?: number;
  cappedCount?: number;
}

interface ContentResponsePayload {
  error?: string;
  items?: ContentItem[];
  rawItems?: ContentItem[];
  report?: ReplicaCategory["reports"][number] | null;
  meta?: ContentResponseMeta | null;
}

interface KeywordTargetsResponsePayload {
  error?: string;
  keywordTargets?: ReplicaKeywordTarget[];
}

interface HistoryListResponsePayload {
  error?: string;
  queries?: ReplicaHistoryQuery[];
}

interface HistoryDetailResponsePayload {
  error?: string;
  query?: ReplicaHistoryQuery;
  analysis?: ReplicaHistoryDetail["analysis"];
  items?: ContentItem[];
}

interface AnalysisReportsResponsePayload {
  error?: string;
  reports?: ReplicaCategory["reports"];
}

interface AnalysisRunResponsePayload {
  error?: string;
  report?: ReplicaCategory["reports"][number] | null;
  detail?: ReplicaAnalysisDetail | null;
  meta?: {
    refreshedPlatforms: ReplicaTrackedPlatformId[];
    skipped: boolean;
    reason?: string;
  };
}

interface AnalysisSettingsResponsePayload {
  error?: string;
  settings?: ReplicaGlobalAnalysisSettings;
  task?: {
    ok: boolean;
    taskName: string;
    message: string;
  };
}

interface ContentState {
  status: "idle" | "loading" | "success" | "error";
  keyword: string;
  keywordTargetId: string;
  platformId: ReplicaPlatformId;
  items: ReplicaArticle[];
  rawItems: ReplicaArticle[];
  error: string;
  meta: ContentResponseMeta | null;
}

interface CategoryMenuState {
  categoryId: string;
  x: number;
  y: number;
}

function debugContentFlow(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.debug(`[ContentPulse] ${label}`, payload);
}

function updateCategory(
  categories: ReplicaCategory[],
  categoryId: string,
  updater: (category: ReplicaCategory) => ReplicaCategory
) {
  return categories.map((category) => (category.id === categoryId ? updater(category) : category));
}

function buildContentStateKey(
  categoryId: string,
  keywordTargetId: string,
  platformId: ReplicaPlatformId
) {
  return `${categoryId}:${keywordTargetId}:${platformId}`;
}

function buildContentState(
  keywordTargetId: string,
  platformId: ReplicaPlatformId,
  keyword: string,
  current?: ContentState
): ContentState {
  return {
    status: current?.status ?? "idle",
    keyword,
    keywordTargetId,
    platformId,
    items: current?.items ?? [],
    rawItems: current?.rawItems ?? [],
    error: current?.error ?? "",
    meta: current?.meta ?? null
  };
}

function isCollectablePlatform(
  platformId: ReplicaTrackedPlatformId
): platformId is "wechat" | "xiaohongshu" | "twitter" {
  return platformId === "wechat" || platformId === "xiaohongshu" || platformId === "twitter";
}

function sortRawReplicaArticles(rawItems: ReplicaArticle[]) {
  return [...rawItems].sort((left, right) => (left.rawOrderIndex ?? 0) - (right.rawOrderIndex ?? 0));
}

function getEnabledCollectablePlatforms(category: ReplicaCategory): ReplicaTrackedPlatformId[] {
  const enabledPlatformIds = category.platforms
    .filter((platform) => platform.enabled)
    .map((platform) => platform.id);

  return enabledPlatformIds.filter(isCollectablePlatform);
}

function getCollectablePlatformsForTarget(
  category: ReplicaCategory,
  keywordTarget: ReplicaKeywordTarget,
  requestedPlatformId: ReplicaPlatformId
) {
  const enabledCollectablePlatforms = getEnabledCollectablePlatforms(category);

  if (requestedPlatformId === "all") {
    return keywordTarget.platformIds.filter(
      (platformId) => isCollectablePlatform(platformId) && enabledCollectablePlatforms.includes(platformId)
    );
  }

  return keywordTarget.platformIds.filter(
    (platformId) =>
      isCollectablePlatform(platformId) &&
      platformId === requestedPlatformId &&
      enabledCollectablePlatforms.includes(platformId)
  );
}

function ensureKeywordTargetPlatform(
  category: ReplicaCategory,
  keywordTargetId: string,
  platformId: ReplicaTrackedPlatformId
) {
  return {
    ...category,
    platforms: category.platforms.map((platform) =>
      platform.id === platformId ? { ...platform, enabled: true } : platform
    ),
    keywordTargets: category.keywordTargets.map((target) =>
      target.id === keywordTargetId && !target.platformIds.includes(platformId)
        ? {
            ...target,
            platformIds: [...target.platformIds, platformId]
          }
        : target
    )
  };
}

function findKeywordTargetByKeyword(category: ReplicaCategory, keyword: string) {
  const normalized = normalizeCategoryInput(keyword).toLowerCase();
  return category.keywordTargets.find((item) => item.keyword === normalized);
}

function parseQueryPlatformScope(platformScope: string): ReplicaTrackedPlatformId[] {
  const trackedPlatforms = new Set(replicaPlatforms.filter((item) => item.id !== "all").map((item) => item.id));

  return platformScope
    .split(",")
    .map((part) => part.trim())
    .filter((part): part is ReplicaTrackedPlatformId => trackedPlatforms.has(part as ReplicaTrackedPlatformId));
}

function buildArchivedReports(detail: NonNullable<ReplicaHistoryDetail["analysis"]>): ReplicaCategory["reports"] {
  return [
    {
      id: detail.snapshot.id,
      date: detail.snapshot.generatedAt.slice(0, 10),
      label: detail.snapshot.generatedAt.slice(0, 10),
      hotSummary: detail.snapshot.hotSummary,
      focusSummary: detail.snapshot.focusSummary,
      patternSummary: detail.snapshot.patternSummary,
      insightSummary: detail.snapshot.insightSummary,
      suggestions: detail.topics.map((topic) => ({
        id: topic.id,
        title: topic.title,
        intro: topic.intro,
        whyNow: topic.whyNow,
        hook: topic.hook,
        growth: topic.growth,
        supportContentIds: topic.supportContentIds
      }))
    }
  ];
}

export function MonitoringWorkbench() {
  const [categories, setCategories] = useState(initialReplicaCategories);
  const [activeCategoryId, setActiveCategoryId] = useState(initialReplicaCategories[0]?.id ?? "claude");
  const [activeTab, setActiveTab] = useState<ReplicaTabId>("content");
  const [analysisMode, setAnalysisMode] = useState<ReplicaAnalysisMode>("daily");
  const [reportWindow, setReportWindow] = useState<7 | 14>(7);
  const [activePlatformId, setActivePlatformId] = useState<ReplicaPlatformId>("wechat");
  const [activeDateId, setActiveDateId] = useState("");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [activeKeywordTargetId, setActiveKeywordTargetId] = useState(
    initialReplicaCategories[0]?.keywordTargets[0]?.id ?? ""
  );
  const [keywordDraft, setKeywordDraft] = useState(initialReplicaCategories[0]?.keyword ?? "");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDraft, setCreateDraft] = useState("");
  const [menuState, setMenuState] = useState<CategoryMenuState | null>(null);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [historyEntries, setHistoryEntries] = useState<SearchHistoryEntry[]>([]);
  const [historyQueries, setHistoryQueries] = useState<ReplicaHistoryQuery[]>([]);
  const [selectedHistoryQueryId, setSelectedHistoryQueryId] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<ReplicaHistoryDetail | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [historyErrorMessage, setHistoryErrorMessage] = useState("");
  const [historyPlatformFilter, setHistoryPlatformFilter] = useState<ReplicaPlatformId>("all");
  const [historyKeywordFilter, setHistoryKeywordFilter] = useState("");
  const [contentStates, setContentStates] = useState<Record<string, ContentState>>({});
  const [archivedReports, setArchivedReports] = useState<ReplicaCategory["reports"] | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState("");
  const [selectedSupportTopicId, setSelectedSupportTopicId] = useState<string | null>(null);
  const [analysisDetailsByReportId, setAnalysisDetailsByReportId] = useState<
    Record<string, ReplicaAnalysisDetail>
  >({});
  const [globalAnalysisSettings, setGlobalAnalysisSettings] = useState<ReplicaGlobalAnalysisSettings>({
    enabled: true,
    time: "08:00",
    provider: "SiliconFlow",
    model: DEFAULT_SILICONFLOW_MODEL
  });
  const [isSavingAnalysisSettings, setIsSavingAnalysisSettings] = useState(false);
  const [analysisSettingsMessage, setAnalysisSettingsMessage] = useState("");

  const activeCategory =
    categories.find((item) => item.id === activeCategoryId) ?? categories[0] ?? initialReplicaCategories[0];

  const activeKeywordTarget =
    activeCategory.keywordTargets.find((item) => item.id === activeKeywordTargetId) ??
    findKeywordTargetByKeyword(activeCategory, keywordDraft) ??
    activeCategory.keywordTargets[0];
  const activeKeywordTargetKeyword = activeKeywordTarget?.keyword ?? "";
  const analysisReports = archivedReports ?? activeCategory.reports;
  const activeAnalysisDetail = analysisDetailsByReportId[selectedReportId] ?? null;

  const activeKeyword = activeKeywordTarget?.keyword ?? normalizeCategoryInput(keywordDraft).toLowerCase();
  const currentStateKey = buildContentStateKey(
    activeCategory.id,
    activeKeywordTarget?.id ?? "draft",
    activePlatformId
  );
  const currentContentState = contentStates[currentStateKey];

  const mockArticles = useMemo(
    () => buildReplicaArticles(activeCategory, activeKeyword || activeCategory.keyword),
    [activeCategory, activeKeyword]
  );

  const hasPersistedRun = Boolean(activeKeywordTarget?.lastRunAt);
  const currentArticles = useMemo(
    () =>
      currentContentState
        ? currentContentState.items
        : hasPersistedRun
          ? []
          : mockArticles,
    [currentContentState, hasPersistedRun, mockArticles]
  );
  const latestReportDate = analysisReports[0]?.date ?? "";
  const latestArticlePublishedAt = currentArticles[0]?.publishedAt ?? "";
  const timelineAnchorDate = useMemo(
    () =>
      activeKeywordTarget?.lastRunAt ||
      latestReportDate ||
      latestArticlePublishedAt ||
      new Date().toISOString(),
    [activeKeywordTarget?.lastRunAt, latestArticlePublishedAt, latestReportDate]
  );
  const currentUpdatedAt = timelineAnchorDate;

  const dateOptions = useMemo(
    () => buildDateOptions(currentArticles, timelineAnchorDate),
    [currentArticles, timelineAnchorDate]
  );
  const visibleArticles = useMemo(
    () => filterReplicaArticles(currentArticles, activePlatformId, activeDateId),
    [activeDateId, activePlatformId, currentArticles]
  );
  const displayedCount = visibleArticles.length;
  const sidebarCategories = useMemo(
    () =>
      categories.map((category) =>
        category.id === activeCategory.id ? { ...category, count: displayedCount } : category
      ),
    [activeCategory.id, categories, displayedCount]
  );
  const platformCounts = useMemo(
    () =>
      replicaPlatforms.reduce<Record<string, number>>((result, platform) => {
        if (platform.id === "all") {
          result[platform.id] = currentArticles.length;
          return result;
        }

        result[platform.id] = currentArticles.filter((item) => item.platformId === platform.id).length;
        return result;
      }, {}),
    [currentArticles]
  );
  const filteredHistoryQueries = useMemo(() => {
    const normalizedKeyword = historyKeywordFilter.trim().toLowerCase();

    return historyQueries.filter((query) => {
      const matchesKeyword =
        !normalizedKeyword || query.keyword.toLowerCase().includes(normalizedKeyword);
      const queryPlatforms = parseQueryPlatformScope(query.platformScope);
      const matchesPlatform =
        historyPlatformFilter === "all" ||
        queryPlatforms.includes(historyPlatformFilter as ReplicaTrackedPlatformId);

      return matchesKeyword && matchesPlatform;
    });
  }, [historyKeywordFilter, historyPlatformFilter, historyQueries]);

  useEffect(() => {
    setHistoryEntries(loadSearchHistory());
  }, []);

  useEffect(() => {
    void loadGlobalAnalysisSettings();
  }, []);

  useEffect(() => {
    if (!analysisReports.some((item) => item.id === selectedReportId)) {
      setSelectedReportId(analysisReports[0]?.id ?? "");
    }

    if (!activeCategory.keywordTargets.some((item) => item.id === activeKeywordTargetId)) {
      setActiveKeywordTargetId(activeCategory.keywordTargets[0]?.id ?? "");
    }
  }, [
    activeCategory.id,
    analysisReports,
    activeCategory.keywordTargets,
    selectedReportId,
    activeKeywordTargetId
  ]);

  useEffect(() => {
    if (activeKeywordTargetKeyword) {
      setKeywordDraft(activeKeywordTargetKeyword);
    }
  }, [activeKeywordTargetId, activeKeywordTargetKeyword]);

  useEffect(() => {
    const nextDateId = getDefaultDateId(currentArticles, timelineAnchorDate) ?? "";

    if (!activeDateId || !dateOptions.some((item) => item.id === activeDateId)) {
      setActiveDateId(nextDateId);
    }
  }, [activeDateId, currentArticles, dateOptions, timelineAnchorDate]);

  useEffect(() => {
    if (!selectedCardId || !visibleArticles.some((item) => item.id === selectedCardId)) {
      setSelectedCardId(visibleArticles[0]?.id ?? "");
    }
  }, [selectedCardId, visibleArticles]);

  useEffect(() => {
    debugContentFlow("render-state", {
      activeKeyword,
      activePlatform: activePlatformId,
      fetchedCount: currentContentState?.meta?.fetchedCount ?? currentArticles.length,
      cappedCount: currentContentState?.meta?.cappedCount ?? currentArticles.length,
      renderedCount: displayedCount,
      platformCounts,
      renderedPlatforms: Array.from(new Set(visibleArticles.map((item) => item.platformId)))
    });
  }, [
    activeKeyword,
    activePlatformId,
    currentArticles.length,
    currentContentState?.meta?.cappedCount,
    currentContentState?.meta?.fetchedCount,
    displayedCount,
    platformCounts,
    visibleArticles
  ]);

  useEffect(() => {
    function handleWindowClick() {
      setMenuState(null);
    }

    window.addEventListener("click", handleWindowClick);

    return () => {
      window.removeEventListener("click", handleWindowClick);
    };
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      return;
    }

    if (selectedHistoryQueryId || historyDetail) {
      setSelectedHistoryQueryId(null);
      setHistoryDetail(null);
    }
  }, [activeTab, historyDetail, selectedHistoryQueryId]);

  useEffect(() => {
    if (typeof fetch !== "function") {
      return;
    }

    let cancelled = false;

    async function loadKeywordTargetsFromPersistence() {
      try {
        const response = await fetch(`/api/keyword-targets?categoryId=${activeCategory.id}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as KeywordTargetsResponsePayload;

        if (!response.ok || cancelled || !payload.keywordTargets) {
          return;
        }

        setCategories((current) =>
          updateCategory(current, activeCategory.id, (category) =>
            mergeKeywordTargetsIntoCategory(category, payload.keywordTargets ?? [])
          )
        );
      } catch {
        // Keep local mock state when persistence is unavailable.
      }
    }

    void loadKeywordTargetsFromPersistence();

    return () => {
      cancelled = true;
    };
  }, [activeCategory.id]);

  useEffect(() => {
    if (!activeKeywordTarget?.lastRunAt) {
      return;
    }

    if (contentStates[currentStateKey]) {
      return;
    }

    void loadStoredContent(activeCategory, activeKeywordTarget, activePlatformId);
  }, [
    activeCategory,
    activeKeywordTarget,
    activePlatformId,
    currentStateKey,
    contentStates
  ]);

  useEffect(() => {
    if (activeTab !== "analysis" || typeof fetch !== "function" || !activeKeywordTargetKeyword) {
      return;
    }

    let cancelled = false;

    async function loadLatestAnalysisReports() {
      try {
        const params = new URLSearchParams({
          categoryId: activeCategory.id,
          keyword: activeKeywordTargetKeyword,
          limit: "14"
        });
        const response = await fetch(`/api/analysis/reports?${params.toString()}`, {
          cache: "no-store"
        });
        const payload = (await response.json()) as AnalysisReportsResponsePayload;

        if (!response.ok || cancelled || !payload.reports?.length) {
          return;
        }

        setCategories((current) =>
          updateCategory(current, activeCategory.id, (category) => ({
            ...category,
            reports: mergePersistedReportsIntoReports(category.reports, payload.reports ?? [])
          }))
        );
        setSelectedReportId(payload.reports[0]?.id ?? "");
        setArchivedReports(null);
      } catch {
        // Keep local reports when analysis history is unavailable.
      }
    }

    void loadLatestAnalysisReports();

    return () => {
      cancelled = true;
    };
  }, [activeCategory.id, activeKeywordTarget?.lastRunAt, activeKeywordTargetKeyword, activeTab]);

  useEffect(() => {
    if (activeTab !== "analysis" || !selectedReportId || analysisDetailsByReportId[selectedReportId]) {
      return;
    }

    void loadAnalysisDetail(selectedReportId);
  }, [activeTab, analysisDetailsByReportId, selectedReportId]);

  useEffect(() => {
    setSelectedSupportTopicId(null);
  }, [selectedReportId]);

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    void loadHistoryQueries(activeCategory.id);
  // loadHistoryQueries intentionally closes over the latest fallback history state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory.id, activeTab]);

  useEffect(() => {
    if (activeTab !== "history") {
      return;
    }

    if (filteredHistoryQueries.length === 0) {
      setSelectedHistoryQueryId(null);
      setHistoryDetail(null);
      return;
    }

    if (!selectedHistoryQueryId) {
      return;
    }

    if (!filteredHistoryQueries.some((entry) => entry.id === selectedHistoryQueryId)) {
      setSelectedHistoryQueryId(null);
      setHistoryDetail(null);
    }
  }, [activeTab, filteredHistoryQueries, selectedHistoryQueryId]);

  function patchKeywordTargetState(
    categoryId: string,
    keywordTargetId: string,
    updater: (target: ReplicaKeywordTarget) => ReplicaKeywordTarget
  ) {
    setCategories((current) =>
      updateCategory(current, categoryId, (category) => ({
        ...category,
        keywordTargets: category.keywordTargets.map((target) =>
          target.id === keywordTargetId ? updater(target) : target
        )
      }))
    );
  }

  async function loadStoredContent(
    category: ReplicaCategory,
    keywordTarget: ReplicaKeywordTarget,
    platformId: ReplicaPlatformId,
    options?: { quiet?: boolean }
  ) {
    if (typeof fetch !== "function") {
      return;
    }

    const key = buildContentStateKey(category.id, keywordTarget.id, platformId);

    if (!options?.quiet) {
      setContentStates((current) => ({
        ...current,
        [key]: {
          ...buildContentState(keywordTarget.id, platformId, keywordTarget.keyword, current[key]),
          status: "loading",
          error: ""
        }
      }));
    }

    try {
      const params = new URLSearchParams({
        categoryId: category.id,
        keywordTargetId: keywordTarget.id
      });

      if (platformId !== "all") {
        params.set("platformId", platformId);
      }

      const response = await fetch(`/api/content/list?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as ContentResponsePayload;

      if (!response.ok) {
        throw new Error(payload.error || "内容读取失败");
      }

      const items = mapContentItemsToReplicaArticles(payload.items ?? [], keywordTarget.keyword);

      setContentStates((current) => ({
        ...current,
        [key]: {
          status: "success",
          keyword: keywordTarget.keyword,
          keywordTargetId: keywordTarget.id,
          platformId,
          items,
          rawItems: [],
          error: "",
          meta: payload.meta ?? null
        }
      }));

      debugContentFlow("stored-content-loaded", {
        activeKeyword: keywordTarget.keyword,
        activePlatform: platformId,
        fetchedCount: payload.meta?.fetchedCount ?? items.length,
        cappedCount: payload.meta?.cappedCount ?? items.length,
        renderedCount: items.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "内容读取失败";

      setContentStates((current) => ({
        ...current,
        [key]: {
          ...buildContentState(keywordTarget.id, platformId, keywordTarget.keyword, current[key]),
          status: "error",
          error: message
        }
      }));

      debugContentFlow("stored-content-load-failed", {
        activeKeyword: keywordTarget.keyword,
        activePlatform: platformId,
        error: message
      });
    }
  }

  async function loadHistoryQueries(categoryId: string) {
    if (typeof fetch !== "function") {
      return;
    }

    setHistoryLoading(true);
    setHistoryErrorMessage("");

    try {
      const response = await fetch(`/api/history?categoryId=${encodeURIComponent(categoryId)}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as HistoryListResponsePayload;

      if (!response.ok) {
        throw new Error(payload.error || "History load failed");
      }

      const queries = payload.queries ?? [];

      setHistoryQueries(queries);

      if (queries.length === 0) {
        setSelectedHistoryQueryId(null);
        setHistoryDetail(null);
        return;
      }

      if (selectedHistoryQueryId && queries.some((entry) => entry.id === selectedHistoryQueryId)) {
        await loadHistoryDetail(selectedHistoryQueryId);
      } else {
        setSelectedHistoryQueryId(null);
        setHistoryDetail(null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "History load failed";
      setHistoryQueries([]);
      setHistoryErrorMessage(message);
      setSelectedHistoryQueryId(null);
      setHistoryDetail(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadHistoryDetail(queryId: string) {
    if (typeof fetch !== "function") {
      return;
    }

    setHistoryDetailLoading(true);
    setHistoryErrorMessage("");

    try {
      const response = await fetch(`/api/history/${queryId}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as HistoryDetailResponsePayload;

      if (!response.ok || !payload.query) {
        throw new Error(payload.error || "历史详情读取失败");
      }

      setHistoryDetail({
        query: payload.query,
        analysis: payload.analysis ?? null,
        items: payload.items ?? []
      });
      setSelectedHistoryQueryId(queryId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "历史详情读取失败";
      setHistoryErrorMessage(message);
      setHistoryDetail(null);
    } finally {
      setHistoryDetailLoading(false);
    }
  }

  async function loadGlobalAnalysisSettings() {
    if (typeof fetch !== "function") {
      return;
    }

    try {
      const response = await fetch("/api/analysis/settings", {
        cache: "no-store"
      });
      const payload = (await response.json()) as AnalysisSettingsResponsePayload;

      if (!response.ok || !payload.settings) {
        return;
      }

      setGlobalAnalysisSettings(payload.settings);
    } catch {
      // Keep default settings when the API is unavailable.
    }
  }

  async function saveGlobalAnalysisSettings(settings: ReplicaGlobalAnalysisSettings) {
    if (typeof fetch !== "function") {
      return;
    }

    setIsSavingAnalysisSettings(true);
    setAnalysisSettingsMessage("");

    try {
      const response = await fetch("/api/analysis/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      const payload = (await response.json()) as AnalysisSettingsResponsePayload;

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "保存分析设置失败");
      }

      setGlobalAnalysisSettings(payload.settings);
      setAnalysisSettingsMessage(payload.task?.message ?? "分析设置已保存");
    } catch (error) {
      setAnalysisSettingsMessage(error instanceof Error ? error.message : "保存分析设置失败");
    } finally {
      setIsSavingAnalysisSettings(false);
    }
  }

  async function loadAnalysisDetail(reportId: string) {
    if (typeof fetch !== "function") {
      return;
    }

    try {
      const response = await fetch(`/api/analysis/report/${reportId}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ReplicaAnalysisDetail;

      if (!payload?.snapshot?.id) {
        return;
      }

      setAnalysisDetailsByReportId((current) => ({
        ...current,
        [payload.snapshot.id]: payload
      }));
    } catch {
      // Keep the existing report shell when detail lookup is unavailable.
    }
  }

  function ensureHistoryKeywordTarget(category: ReplicaCategory, query: ReplicaHistoryQuery) {
    const existingTarget =
      category.keywordTargets.find((entry) => entry.id === query.keywordTargetId) ??
      findKeywordTargetByKeyword(category, query.keyword);

    if (existingTarget) {
      return { nextCategory: category, keywordTarget: existingTarget };
    }

    const platformIds = parseQueryPlatformScope(query.platformScope);
    const nextCategory = addKeywordTargetToCategory(category, {
      keyword: query.keyword,
      platformIds: platformIds.length > 0 ? platformIds : ["wechat"]
    });
    const nextTarget = findKeywordTargetByKeyword(nextCategory, query.keyword) ?? nextCategory.keywordTargets[0]!;

    return { nextCategory, keywordTarget: nextTarget };
  }

  function applyHistoricalContent(detail: ReplicaHistoryDetail) {
    const targetCategory =
      categories.find((category) => category.id === detail.query.categoryId) ?? activeCategory;
    const { nextCategory, keywordTarget } = ensureHistoryKeywordTarget(targetCategory, detail.query);
    const nextPlatformIds = parseQueryPlatformScope(detail.query.platformScope);
    const nextPlatformId =
      nextPlatformIds.length > 1
        ? "all"
        : (nextPlatformIds[0] as ReplicaPlatformId | undefined) ?? "wechat";
    const items = mapContentItemsToReplicaArticles(detail.items, detail.query.keyword);
    const stateKey = buildContentStateKey(nextCategory.id, keywordTarget.id, nextPlatformId);

    if (nextCategory !== targetCategory) {
      setCategories((current) => updateCategory(current, targetCategory.id, () => nextCategory));
    }

    setContentStates((current) => ({
      ...current,
      [stateKey]: {
        status: "success",
        keyword: detail.query.keyword,
        keywordTargetId: keywordTarget.id,
        platformId: nextPlatformId,
        items,
        rawItems: [],
        error: "",
        meta: {
          source: "history",
          sortedBy: "publish_time_desc",
          persisted: true,
          fetchedCount: detail.query.fetchedCount,
          cappedCount: detail.query.cappedCount
        }
      }
    }));

    setActiveCategoryId(nextCategory.id);
    setActiveKeywordTargetId(keywordTarget.id);
    setKeywordDraft(detail.query.keyword);
    setActivePlatformId(nextPlatformId);
    setActiveDateId("");
    setSelectedCardId("");
    setActiveTab("content");
    setArchivedReports(null);
    setStatusMessage(`已恢复 ${detail.query.keyword} 的历史内容快照。`);
  }

  function applyHistoricalAnalysis(detail: ReplicaHistoryDetail) {
    if (!detail.analysis) {
      setStatusMessage("当前历史记录还没有选题快照。");
      return;
    }

    const analysisDetail: ReplicaAnalysisDetail = {
      ...detail.analysis,
      evidenceItems: detail.analysis.evidenceItems ?? []
    };

    setAnalysisDetailsByReportId((current) => ({
      ...current,
      [analysisDetail.snapshot.id]: analysisDetail
    }));
    setArchivedReports(buildArchivedReports(analysisDetail));
    setSelectedReportId(analysisDetail.snapshot.id);
    setActiveTab("analysis");
    setStatusMessage(`已恢复 ${detail.query.keyword} 的历史选题快照。`);
  }

  async function refreshKeywordTarget(
    category: ReplicaCategory,
    keywordTarget: ReplicaKeywordTarget,
    requestedPlatformId: ReplicaPlatformId,
    options?: { saveHistory?: boolean; refreshPlatforms?: ReplicaTrackedPlatformId[] }
  ) {
    if (typeof fetch !== "function") {
      setStatusMessage("当前环境无法发起更新，请在浏览器中重试。");
      return;
    }

    const refreshPlatforms =
      options?.refreshPlatforms ??
      getCollectablePlatformsForTarget(category, keywordTarget, requestedPlatformId);

    if (refreshPlatforms.length === 0) {
      const unavailablePlatformId =
        requestedPlatformId === "all"
          ? "all"
          : (requestedPlatformId as ReplicaPlatformId);
      const unavailableKey = buildContentStateKey(
        category.id,
        keywordTarget.id,
        unavailablePlatformId
      );
      const unavailableMessage =
        "当前关键词没有可更新的平台，请先在监控设置里启用公众号、小红书或 Twitter/X。";

      setContentStates((current) => ({
        ...current,
        [unavailableKey]: {
          ...buildContentState(
            keywordTarget.id,
            unavailablePlatformId,
            keywordTarget.keyword,
            current[unavailableKey]
          ),
          status: "error",
          error: unavailableMessage
        }
      }));
      setStatusMessage("当前关键词没有可更新的平台，请先在监控设置里启用公众号、小红书或 Twitter/X。");
      return;
    }

    debugContentFlow("refresh-start", {
      activeKeyword: keywordTarget.keyword,
      activePlatform: requestedPlatformId,
      refreshPlatforms
    });

    setIsUpdating(true);
    setStatusMessage("");

    patchKeywordTargetState(category.id, keywordTarget.id, (target) => ({
      ...target,
      lastRunStatus: "running"
    }));

    let lastError = "";
    let failedPlatformId: ReplicaTrackedPlatformId | null = null;
    let latestReport: ReplicaCategory["reports"][number] | null = null;
    let latestRunLabel = "";
    const refreshedContentItems: ContentItem[] = [];

    try {
      for (const platformId of refreshPlatforms) {
        failedPlatformId = platformId;
        const stateKey = buildContentStateKey(category.id, keywordTarget.id, platformId);

        setContentStates((current) => ({
          ...current,
          [stateKey]: {
            ...buildContentState(keywordTarget.id, platformId, keywordTarget.keyword, current[stateKey]),
            status: "loading",
            error: ""
          }
        }));

        const response = await fetch("/api/content/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            categoryId: category.id,
            keywordTargetId: keywordTarget.id,
            keyword: keywordTarget.keyword,
            platformId,
            platformIds: keywordTarget.platformIds,
            createdAt: keywordTarget.createdAt,
            lastRunAt: keywordTarget.lastRunAt,
            lastRunStatus: keywordTarget.lastRunStatus,
            lastResultCount: keywordTarget.lastResultCount,
            reports: category.reports
          })
        });
        const payload = (await response.json()) as ContentResponsePayload;

        if (!response.ok) {
          throw new Error(payload.error || "内容更新失败");
        }

        const items = mapContentItemsToReplicaArticles(payload.items ?? [], keywordTarget.keyword);
        const rawItems = sortRawReplicaArticles(
          mapContentItemsToReplicaArticles(payload.rawItems ?? [], keywordTarget.keyword)
        );
        const finishedAt = new Date();
        const finishedAtIso = finishedAt.toISOString();

        latestRunLabel = formatLocalDateTime(finishedAt);
        latestReport = payload.report ?? latestReport;
        refreshedContentItems.push(...(payload.items ?? []));

        setContentStates((current) => ({
          ...current,
          [stateKey]: {
            status: "success",
            keyword: keywordTarget.keyword,
            keywordTargetId: keywordTarget.id,
            platformId,
            items,
            rawItems,
            error: "",
            meta: payload.meta ?? null
          }
        }));

        debugContentFlow("refresh-success", {
          activeKeyword: keywordTarget.keyword,
          activePlatform: platformId,
          fetchedCount: payload.meta?.fetchedCount ?? items.length,
          cappedCount: payload.meta?.cappedCount ?? items.length,
          renderedCount: items.length,
          sourcePlatforms: Array.from(new Set(items.map((item) => item.platformId)))
        });

        patchKeywordTargetState(category.id, keywordTarget.id, (target) => ({
          ...target,
          lastRunAt: finishedAtIso,
          lastRunStatus: "success",
          lastResultCount: items.length
        }));
        setArchivedReports(null);
      }

      const freshReport =
        refreshPlatforms.length > 1
          ? buildFreshAnalysisReport(keywordTarget.keyword, refreshedContentItems, latestRunLabel || new Date())
          : latestReport ??
            buildFreshAnalysisReport(keywordTarget.keyword, refreshedContentItems, latestRunLabel || new Date());

      setCategories((current) =>
        updateCategory(current, category.id, (item) => ({
          ...item,
          reports: mergeFreshReportIntoReports(item.reports, freshReport)
        }))
      );
      setSelectedReportId(freshReport.id);
      setArchivedReports(null);

      const refreshedReplicaArticles = mapContentItemsToReplicaArticles(
        refreshedContentItems,
        keywordTarget.keyword
      );

      setActiveDateId(getDefaultDateId(refreshedReplicaArticles, latestReport?.date || new Date()) ?? "");
      setSelectedCardId("");

      if (requestedPlatformId === "all" || refreshPlatforms.length > 1) {
        await loadStoredContent(category, keywordTarget, "all", { quiet: true });
      }

      if (options?.saveHistory !== false) {
        setHistoryEntries(
          saveSearchHistoryEntry({
            keyword: keywordTarget.keyword,
            categoryId: category.id,
            categoryName: category.name
          })
        );
      }

      setStatusMessage(`已更新 ${keywordTarget.keyword} 的 ${refreshPlatforms.join(" / ")} 内容。`);
    } catch (error) {
      lastError = error instanceof Error ? error.message : "内容更新失败";

      patchKeywordTargetState(category.id, keywordTarget.id, (target) => ({
        ...target,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: "failed"
      }));

      const failedPlatform = failedPlatformId ?? refreshPlatforms[0] ?? requestedPlatformId;
      const failedKey = buildContentStateKey(category.id, keywordTarget.id, failedPlatform);

      setContentStates((current) => ({
        ...current,
        [failedKey]: {
          ...buildContentState(keywordTarget.id, failedPlatform, keywordTarget.keyword, current[failedKey]),
          status: "error",
          error: lastError
        }
      }));

      debugContentFlow("refresh-failed", {
        activeKeyword: keywordTarget.keyword,
        activePlatform: failedPlatform,
        error: lastError
      });
    } finally {
      setIsUpdating(false);
      if (lastError) {
        setStatusMessage(lastError);
      }
    }
  }

  async function handleRunAnalysis() {
    if (typeof fetch !== "function") {
      setAnalysisStatusMessage("当前环境无法发起分析，请在浏览器中重试。");
      return;
    }

    if (!activeKeywordTarget) {
      setAnalysisStatusMessage("当前没有可分析的关键词。");
      return;
    }

    const platformIds = getCollectablePlatformsForTarget(activeCategory, activeKeywordTarget, "all");

    if (platformIds.length === 0) {
      setAnalysisStatusMessage("当前关键词还没有启用可分析的平台，请先在监控设置中开启。");
      return;
    }

    setAnalysisRunning(true);
    setAnalysisStatusMessage("");

    try {
      const response = await fetch("/api/analysis/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          categoryId: activeCategory.id,
          keywordTargetId: activeKeywordTarget.id,
          keyword: activeKeywordTarget.keyword,
          platformIds,
          createdAt: activeKeywordTarget.createdAt,
          lastRunAt: activeKeywordTarget.lastRunAt,
          lastRunStatus: activeKeywordTarget.lastRunStatus,
          lastResultCount: activeKeywordTarget.lastResultCount,
          mode: "manual"
        })
      });
      const payload = (await response.json()) as AnalysisRunResponsePayload;

      if (!response.ok) {
        throw new Error(payload.error || "立即分析失败");
      }

      if (payload.meta?.skipped || !payload.report) {
        setAnalysisStatusMessage(payload.meta?.reason ?? "当前没有可分析的有效内容。");
        return;
      }

      setCategories((current) =>
        updateCategory(current, activeCategory.id, (category) => ({
          ...category,
          reports: mergeFreshReportIntoReports(category.reports, payload.report!)
        }))
      );

      if (payload.detail?.snapshot?.id) {
        setAnalysisDetailsByReportId((current) => ({
          ...current,
          [payload.detail!.snapshot.id]: payload.detail!
        }));
      }

      patchKeywordTargetState(activeCategory.id, activeKeywordTarget.id, (target) => ({
        ...target,
        lastRunAt: new Date().toISOString(),
        lastRunStatus: "success"
      }));

      setSelectedReportId(payload.report.id);
      setSelectedSupportTopicId(null);
      setArchivedReports(null);

      const shouldReloadAll = activePlatformId === "all";
      const shouldReloadCurrent =
        activePlatformId !== "all" &&
        isCollectablePlatform(activePlatformId) &&
        platformIds.includes(activePlatformId);

      if (shouldReloadAll) {
        await loadStoredContent(activeCategory, activeKeywordTarget, "all", { quiet: true });
      } else if (shouldReloadCurrent) {
        await loadStoredContent(activeCategory, activeKeywordTarget, activePlatformId, { quiet: true });
      }

      void loadHistoryQueries(activeCategory.id);
      setAnalysisStatusMessage(`已完成 ${activeKeywordTarget.keyword} 的即时分析。`);
      setStatusMessage(`已完成 ${activeKeywordTarget.keyword} 的即时分析。`);
    } catch (error) {
      setAnalysisStatusMessage(error instanceof Error ? error.message : "立即分析失败");
    } finally {
      setAnalysisRunning(false);
    }
  }

  function handleSelectCategory(categoryId: string) {
    const nextCategory = categories.find((item) => item.id === categoryId);

    if (!nextCategory) {
      return;
    }

    setActiveCategoryId(categoryId);
    setActiveTab("content");
    setActivePlatformId("wechat");
    setAnalysisMode("daily");
    setMenuState(null);
    setArchivedReports(null);
    setSelectedSupportTopicId(null);
    setSelectedHistoryQueryId(null);
    setHistoryDetail(null);
    setHistoryPlatformFilter("all");
    setHistoryKeywordFilter("");
  }

  function handleCreateCategory() {
    const normalized = normalizeCategoryInput(createDraft);

    if (!normalized) {
      return;
    }

    const baseCategory = createReplicaCategory(normalized);
    const duplicateCount = categories.filter((item) => item.id === baseCategory.id).length;
    const nextCategory =
      duplicateCount > 0
        ? { ...baseCategory, id: `${baseCategory.id}-${duplicateCount + 1}` }
        : baseCategory;

    setCategories((current) => [...current, nextCategory]);
    setActiveCategoryId(nextCategory.id);
    setActiveKeywordTargetId(nextCategory.keywordTargets[0]?.id ?? "");
    setActiveTab("content");
    setActivePlatformId("wechat");
    setShowCreateForm(false);
    setCreateDraft("");
    setKeywordDraft(nextCategory.keywordTargets[0]?.keyword ?? nextCategory.keyword);
    setArchivedReports(null);

    const firstKeywordTarget = nextCategory.keywordTargets[0];

    if (firstKeywordTarget) {
      void refreshKeywordTarget(nextCategory, firstKeywordTarget, "wechat", {
        saveHistory: false,
        refreshPlatforms: ["wechat"]
      });
    }
  }

  function handleDeleteCategory(categoryId: string) {
    if (categories.length <= 1) {
      setMenuState(null);
      return;
    }

    const nextCategories = removeReplicaCategory(categories, categoryId);

    setCategories(nextCategories);
    setMenuState(null);
    setRenamingCategoryId(null);
    setContentStates((current) => {
      const next = { ...current };

      Object.keys(next).forEach((key) => {
        if (key.startsWith(`${categoryId}:`)) {
          delete next[key];
        }
      });

      return next;
    });

    if (activeCategoryId === categoryId) {
      const nextActive = nextCategories[0];

      if (nextActive) {
        setActiveCategoryId(nextActive.id);
        setActiveKeywordTargetId(nextActive.keywordTargets[0]?.id ?? "");
        setKeywordDraft(nextActive.keywordTargets[0]?.keyword ?? nextActive.keyword);
      }
    }
  }

  function handleDeleteCurrentCategory() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`确认删除「${activeCategory.name}」吗？`)
    ) {
      return;
    }

    handleDeleteCategory(activeCategory.id);
  }

  function handleStartRename(categoryId: string) {
    const targetCategory = categories.find((item) => item.id === categoryId);

    setMenuState(null);
    setRenamingCategoryId(categoryId);
    setRenameDraft(targetCategory?.name ?? "");
  }

  function handleSubmitRename() {
    if (!renamingCategoryId) {
      return;
    }

    const normalized = normalizeCategoryInput(renameDraft);

    if (!normalized) {
      return;
    }

    setCategories((current) => renameReplicaCategory(current, renamingCategoryId, normalized));
    setHistoryEntries((current) =>
      current.map((entry) =>
        entry.categoryId === renamingCategoryId ? { ...entry, categoryName: normalized } : entry
      )
    );
    setRenamingCategoryId(null);
    setRenameDraft("");
  }

  async function handleQuickUpdate() {
    const normalizedKeyword = normalizeCategoryInput(keywordDraft).toLowerCase();

    if (!normalizedKeyword) {
      return;
    }

    const existingTarget = findKeywordTargetByKeyword(activeCategory, normalizedKeyword);
    const enabledCollectablePlatforms = getEnabledCollectablePlatforms(activeCategory);
    const requestedSinglePlatform =
      activePlatformId !== "all" && isCollectablePlatform(activePlatformId) ? activePlatformId : null;
    const requestedPlatforms =
      requestedSinglePlatform
        ? [requestedSinglePlatform]
        : enabledCollectablePlatforms.length > 0
          ? enabledCollectablePlatforms
          : activeKeywordTarget?.platformIds.filter(isCollectablePlatform) ?? ["wechat"];

    let nextCategory = existingTarget
      ? activeCategory
      : addKeywordTargetToCategory(activeCategory, {
          keyword: normalizedKeyword,
          platformIds: requestedPlatforms
        });
    let nextKeywordTarget =
      findKeywordTargetByKeyword(nextCategory, normalizedKeyword) ??
      existingTarget ??
      activeKeywordTarget;

    if (!nextKeywordTarget) {
      return;
    }

    if (requestedSinglePlatform) {
      nextCategory = ensureKeywordTargetPlatform(nextCategory, nextKeywordTarget.id, requestedSinglePlatform);
      nextKeywordTarget =
        nextCategory.keywordTargets.find((target) => target.id === nextKeywordTarget.id) ?? nextKeywordTarget;
    }

    if (nextCategory !== activeCategory) {
      setCategories((current) => updateCategory(current, activeCategory.id, () => nextCategory));
    }

    setActiveKeywordTargetId(nextKeywordTarget.id);
    setKeywordDraft(nextKeywordTarget.keyword);

    await refreshKeywordTarget(nextCategory, nextKeywordTarget, activePlatformId);
  }

  function handleRerunHistoryQuery(queryId: string) {
    const detail = historyDetail?.query.id === queryId ? historyDetail : null;

    if (!detail) {
      return;
    }

    const targetCategory =
      categories.find((category) => category.id === detail.query.categoryId) ?? activeCategory;
    const { nextCategory, keywordTarget } = ensureHistoryKeywordTarget(targetCategory, detail.query);
    const platformIds = parseQueryPlatformScope(detail.query.platformScope);
    const rerunPlatformId =
      platformIds.length > 1
        ? "all"
        : (platformIds[0] as ReplicaPlatformId | undefined) ?? "wechat";

    if (nextCategory !== targetCategory) {
      setCategories((current) => updateCategory(current, targetCategory.id, () => nextCategory));
    }

    setActiveCategoryId(nextCategory.id);
    setActiveKeywordTargetId(keywordTarget.id);
    setKeywordDraft(detail.query.keyword);
    setActivePlatformId(rerunPlatformId);
    void refreshKeywordTarget(nextCategory, keywordTarget, rerunPlatformId);
  }

  return (
    <section className="replica-shell">
      <ReplicaSidebar
        categories={sidebarCategories}
        activeCategoryId={activeCategory.id}
        createDraft={createDraft}
        showCreateForm={showCreateForm}
        menuState={menuState}
        renamingCategoryId={renamingCategoryId}
        renameDraft={renameDraft}
        onSelectCategory={handleSelectCategory}
        onToggleCreateForm={() => {
          setShowCreateForm((current) => !current);
          setMenuState(null);
        }}
        onCreateDraftChange={setCreateDraft}
        onCreateCategory={handleCreateCategory}
        onOpenMenu={(categoryId, x, y) => {
          setMenuState({ categoryId, x, y });
        }}
        onCloseMenu={() => setMenuState(null)}
        onStartRename={handleStartRename}
        onRenameDraftChange={setRenameDraft}
        onSubmitRename={handleSubmitRename}
        onCancelRename={() => {
          setRenamingCategoryId(null);
          setRenameDraft("");
        }}
        onDeleteCategory={handleDeleteCategory}
      />

      <main className="replica-shell__main">
        <div className="replica-shell__workspace">
          <ReplicaTopbar
            category={activeCategory}
            activeTab={activeTab}
            currentCount={activeTab === "history" ? filteredHistoryQueries.length : displayedCount}
            currentUpdatedAt={formatLocalDateTime(currentUpdatedAt)}
            onSelectTab={setActiveTab}
          />

          <section className="replica-shell__workspace-body">
            {activeTab !== "history" ? (
              <ReplicaKeywordBar
                keyword={keywordDraft}
                isUpdating={isUpdating}
                statusMessage={statusMessage}
                onKeywordChange={setKeywordDraft}
                onUpdate={() => void handleQuickUpdate()}
                onToggleHistory={() => setActiveTab("history")}
              />
            ) : null}

            {activeTab === "content" ? (
              <>
                <div className="replica-shell__filters">
                  <ReplicaPlatformRow
                    platforms={replicaPlatforms}
                    activePlatformId={activePlatformId}
                    onSelectPlatform={(platformId) => {
                      debugContentFlow("platform-selected", {
                        activeKeyword,
                        previousPlatform: activePlatformId,
                        nextPlatform: platformId
                      });
                      setActivePlatformId(platformId);
                      setSelectedCardId("");
                    }}
                  />

                  <ReplicaDateRow
                    dates={dateOptions}
                    activeDateId={activeDateId}
                    onSelectDate={(dateId) => {
                      setActiveDateId(dateId);
                      setSelectedCardId("");
                    }}
                  />
                </div>

                <ReplicaContentList
                  keyword={activeKeyword || activeCategory.keyword}
                  articles={visibleArticles}
                  activePlatformId={activePlatformId}
                  selectedCardId={selectedCardId}
                  isLoading={isUpdating}
                  errorMessage={currentContentState?.status === "error" ? currentContentState.error : ""}
                  isApiSource={currentContentState?.status === "success"}
                  onSelectCard={setSelectedCardId}
                />
              </>
            ) : null}

            {activeTab === "history" ? (
              <ReplicaHistoryPage
                loading={historyLoading}
                detailLoading={historyDetailLoading}
                errorMessage={historyErrorMessage}
                queries={filteredHistoryQueries}
                selectedQueryId={selectedHistoryQueryId}
                detail={historyDetail}
                platformFilter={historyPlatformFilter}
                keywordFilter={historyKeywordFilter}
                onPlatformFilterChange={setHistoryPlatformFilter}
                onKeywordFilterChange={setHistoryKeywordFilter}
                onSelectQuery={(queryId) => {
                  if (selectedHistoryQueryId === queryId) {
                    setSelectedHistoryQueryId(null);
                    setHistoryDetail(null);
                    return;
                  }

                  void loadHistoryDetail(queryId);
                }}
                onRestoreContent={(queryId) => {
                  if (historyDetail?.query.id === queryId) {
                    applyHistoricalContent(historyDetail);
                  }
                }}
                onRestoreAnalysis={(queryId) => {
                  if (historyDetail?.query.id === queryId) {
                    applyHistoricalAnalysis(historyDetail);
                  }
                }}
                onRerun={handleRerunHistoryQuery}
              />
            ) : null}

            {activeTab === "analysis" ? (
              <ReplicaAnalysisPanel
                reports={analysisReports}
                selectedReportId={selectedReportId}
                analysisMode={analysisMode}
                reportWindow={reportWindow}
                isRunning={analysisRunning}
                statusMessage={analysisStatusMessage}
                detail={activeAnalysisDetail}
                selectedSupportTopicId={selectedSupportTopicId}
                onSelectReport={setSelectedReportId}
                onSelectMode={setAnalysisMode}
                onSelectWindow={setReportWindow}
                onRunAnalysis={() => void handleRunAnalysis()}
                onViewSupportContent={setSelectedSupportTopicId}
              />
            ) : null}

            {activeTab === "settings" ? (
              <ReplicaSettingsPanel
                category={activeCategory}
                globalAnalysisSettings={globalAnalysisSettings}
                isSavingAnalysisSettings={isSavingAnalysisSettings}
                analysisSettingsMessage={analysisSettingsMessage}
                onTogglePlatform={(platformId) =>
                  setCategories((current) =>
                    updateCategory(current, activeCategory.id, (item) => ({
                      ...item,
                      platforms: item.platforms.map((platform) =>
                        platform.id === platformId
                          ? { ...platform, enabled: !platform.enabled }
                          : platform
                      )
                    }))
                  )
                }
                onAddKeywordTarget={({ keyword, platformIds }) => {
                  const nextCategory = addKeywordTargetToCategory(activeCategory, {
                    keyword,
                    platformIds
                  });
                  const nextTarget = findKeywordTargetByKeyword(nextCategory, keyword);

                  setCategories((current) => updateCategory(current, activeCategory.id, () => nextCategory));

                  if (!nextTarget) {
                    return;
                  }

                  setActiveKeywordTargetId(nextTarget.id);
                  setKeywordDraft(nextTarget.keyword);
                  setActivePlatformId(platformIds[0] ?? "wechat");

                  const refreshPlatforms = platformIds.filter((platformId) =>
                    activeCategory.platforms.some(
                      (platform) => platform.id === platformId && platform.enabled && isCollectablePlatform(platformId)
                    )
                  );

                  if (refreshPlatforms.length > 0) {
                    void refreshKeywordTarget(nextCategory, nextTarget, "all", {
                      saveHistory: false,
                      refreshPlatforms
                    });
                  }
                }}
                onRemoveKeywordTarget={(keywordTargetId) =>
                  setCategories((current) =>
                    updateCategory(current, activeCategory.id, (item) => {
                      const target = item.keywordTargets.find((entry) => entry.id === keywordTargetId);
                      const nextCategory = removeKeywordFromCategory(item, target?.keyword ?? "");

                      if (activeKeywordTargetId === keywordTargetId) {
                        setActiveKeywordTargetId(nextCategory.keywordTargets[0]?.id ?? "");
                        setKeywordDraft(nextCategory.keywordTargets[0]?.keyword ?? "");
                      }

                      return nextCategory;
                    })
                  )
                }
                onAddCreator={(creator) =>
                  setCategories((current) =>
                    updateCategory(current, activeCategory.id, (item) => addCreatorToCategory(item, creator))
                  )
                }
                onRemoveCreator={(creatorId) =>
                  setCategories((current) =>
                    updateCategory(current, activeCategory.id, (item) =>
                      removeCreatorFromCategory(item, creatorId)
                    )
                  )
                }
                onSaveGlobalAnalysisSettings={(settings) => void saveGlobalAnalysisSettings(settings)}
                onDeleteCategory={handleDeleteCurrentCategory}
              />
            ) : null}
          </section>
        </div>
      </main>
    </section>
  );
}

export default MonitoringWorkbench;
