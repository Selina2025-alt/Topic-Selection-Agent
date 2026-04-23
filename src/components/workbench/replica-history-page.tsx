"use client";

import {
  replicaPlatforms,
  type ReplicaPlatformId,
  type ReplicaTrackedPlatformId
} from "@/lib/replica-workbench-data";
import type { ReplicaAnalysisEvidenceItem } from "@/components/workbench/replica-analysis-panel";
import type { ContentItem } from "@/lib/types";

export interface ReplicaHistoryQuery {
  id: string;
  categoryId: string;
  keywordTargetId: string | null;
  keyword: string;
  platformScope: string;
  triggerType: string;
  status: string;
  fetchedCount: number;
  cappedCount: number;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export interface ReplicaHistoryDetail {
  query: ReplicaHistoryQuery;
  analysis:
    | {
        snapshot: {
          id: string;
          searchQueryId: string;
          categoryId: string;
          keyword: string;
          generatedAt: string;
          hotSummary: string;
          focusSummary: string;
          patternSummary: string;
          insightSummary: string;
        };
        topics: Array<{
          id: string;
          snapshotId: string;
          title: string;
          intro: string;
          whyNow: string;
          hook: string;
          growth: string;
          supportContentIds: string[];
        }>;
        evidenceItems: ReplicaAnalysisEvidenceItem[];
      }
    | null;
  items: ContentItem[];
}

interface ReplicaHistoryPageProps {
  loading: boolean;
  detailLoading: boolean;
  errorMessage: string;
  queries: ReplicaHistoryQuery[];
  selectedQueryId: string | null;
  detail: ReplicaHistoryDetail | null;
  platformFilter: ReplicaPlatformId;
  keywordFilter: string;
  onPlatformFilterChange: (platformId: ReplicaPlatformId) => void;
  onKeywordFilterChange: (keyword: string) => void;
  onSelectQuery: (queryId: string) => void;
  onRestoreContent: (queryId: string) => void;
  onRestoreAnalysis: (queryId: string) => void;
  onRerun: (queryId: string) => void;
}

function formatPlatformLabel(platformId: ReplicaTrackedPlatformId) {
  return replicaPlatforms.find((item) => item.id === platformId)?.label ?? platformId;
}

function parsePlatformScope(platformScope: string): ReplicaTrackedPlatformId[] {
  return platformScope
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ReplicaTrackedPlatformId[];
}

function formatPlatformScope(platformScope: string) {
  const platformIds = parsePlatformScope(platformScope);

  if (platformIds.length === 0) {
    return "未记录平台";
  }

  return platformIds.map(formatPlatformLabel).join(" / ");
}

function getPrimaryPlatform(platformScope: string) {
  return parsePlatformScope(platformScope)[0] ?? null;
}

function formatHistoryTime(value: string | null) {
  if (!value) {
    return "--";
  }

  return value.slice(5, 16).replace("T", " ");
}

function formatMetricLine(item: ContentItem) {
  const author = item.authorName || item.author || "未知作者";
  const likes = item.metrics.likes || "0";
  const comments = item.metrics.comments || "0";

  return `${author} · 赞 ${likes} · 评 ${comments}`;
}

export function ReplicaHistoryPage({
  loading,
  detailLoading,
  errorMessage,
  queries,
  selectedQueryId,
  detail,
  platformFilter,
  keywordFilter,
  onPlatformFilterChange,
  onKeywordFilterChange,
  onSelectQuery,
  onRestoreContent,
  onRestoreAnalysis,
  onRerun
}: ReplicaHistoryPageProps) {
  return (
    <section className="replica-shell__history-page">
      <div className="replica-shell__history-page-head">
        <div>
          <h2>搜索历史</h2>
          <p>查看之前搜索过的关键词、当次抓取结果，以及对应保存下来的选题快照。</p>
        </div>
      </div>

      <div className="replica-shell__history-toolbar">
        <label className="replica-shell__history-filter">
          <span>平台</span>
          <select
            aria-label="平台筛选"
            value={platformFilter}
            onChange={(event) => onPlatformFilterChange(event.target.value as ReplicaPlatformId)}
          >
            {replicaPlatforms.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.label}
              </option>
            ))}
          </select>
        </label>

        <label className="replica-shell__history-filter replica-shell__history-filter--keyword">
          <span>关键词</span>
          <input
            aria-label="关键词筛选"
            placeholder="搜索关键词..."
            value={keywordFilter}
            onChange={(event) => onKeywordFilterChange(event.target.value)}
          />
        </label>

        <div className="replica-shell__history-total">共 {queries.length} 条记录</div>
      </div>

      {loading ? <div className="replica-shell__history-page-state">正在读取搜索历史...</div> : null}
      {!loading && errorMessage ? (
        <div className="replica-shell__history-page-state">{errorMessage}</div>
      ) : null}

      {!loading && !errorMessage ? (
        <div className="replica-shell__history-page-list">
          {queries.length > 0 ? (
            queries.map((query) => {
              const isSelected = query.id === selectedQueryId;
              const primaryPlatform = getPrimaryPlatform(query.platformScope);
              const isDetailReady = isSelected && detail?.query.id === query.id;

              return (
                <article
                  key={query.id}
                  className={`replica-shell__history-page-record ${isSelected ? "is-active" : ""}`}
                >
                  <button
                    className="replica-shell__history-page-summary"
                    type="button"
                    onClick={() => onSelectQuery(query.id)}
                  >
                    <div className="replica-shell__history-page-summary-main">
                      <div className="replica-shell__history-page-chip-row">
                        {primaryPlatform ? (
                          <span className="replica-shell__history-page-chip">
                            {formatPlatformLabel(primaryPlatform)}
                          </span>
                        ) : null}
                        <strong>{query.keyword}</strong>
                      </div>
                    </div>

                    <div className="replica-shell__history-page-summary-meta">
                      <span className="replica-shell__history-page-result">{query.cappedCount} 条结果</span>
                      <small>{formatHistoryTime(query.finishedAt ?? query.startedAt)}</small>
                    </div>
                  </button>

                  {isSelected ? (
                    <div className="replica-shell__history-page-expanded">
                      <div className="replica-shell__history-page-expanded-head">
                        <span>来源平台：{formatPlatformScope(query.platformScope)}</span>
                        <span>状态：{query.status}</span>
                      </div>

                      {detailLoading ? (
                        <div className="replica-shell__history-page-state">正在读取本次查询详情...</div>
                      ) : null}

                      {isDetailReady ? (
                        <>
                          <ol className="replica-shell__history-preview-list">
                            {detail.items.length > 0 ? (
                              detail.items.slice(0, 8).map((item, index) => (
                                <li key={item.id} className="replica-shell__history-preview-item">
                                  <span className="replica-shell__history-preview-order">{index + 1}</span>
                                  <div className="replica-shell__history-preview-copy">
                                    <strong>{item.title}</strong>
                                    <span>{formatMetricLine(item)}</span>
                                  </div>
                                </li>
                              ))
                            ) : (
                              <li className="replica-shell__history-preview-item is-empty">
                                <div className="replica-shell__history-preview-copy">
                                  <strong>本次查询没有抓到内容</strong>
                                  <span>你可以重新抓取，或者检查该关键词在当前平台下是否确实有新数据。</span>
                                </div>
                              </li>
                            )}
                          </ol>

                          <div className="replica-shell__history-analysis-card">
                            <h3>选题快照</h3>
                            {detail.analysis ? (
                              <>
                                <p>{detail.analysis.snapshot.hotSummary || "暂无热点摘要"}</p>
                                {detail.analysis.topics.length > 0 ? (
                                  <ul className="replica-shell__history-topic-list">
                                    {detail.analysis.topics.slice(0, 3).map((topic) => (
                                      <li key={topic.id}>
                                        <strong>{topic.title}</strong>
                                        <span>{topic.intro}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </>
                            ) : (
                              <p>当前查询还没有保存选题快照。</p>
                            )}
                          </div>

                          <div className="replica-shell__history-page-actions">
                            <button type="button" onClick={() => onRestoreContent(query.id)}>
                              查看内容
                            </button>
                            <button type="button" onClick={() => onRestoreAnalysis(query.id)}>
                              查看选题
                            </button>
                            <button type="button" onClick={() => onRerun(query.id)}>
                              重新抓取
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="replica-shell__history-page-state">
              还没有搜索历史，先去内容页执行一次抓取吧。
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

export default ReplicaHistoryPage;
