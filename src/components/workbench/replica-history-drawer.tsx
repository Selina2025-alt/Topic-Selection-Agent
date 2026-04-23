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
      }
    | null;
  items: ContentItem[];
}

interface ReplicaHistoryDrawerProps {
  open: boolean;
  view: "queries" | "keywords";
  loading: boolean;
  detailLoading: boolean;
  errorMessage: string;
  queries: ReplicaHistoryQuery[];
  selectedQueryId: string | null;
  detail: ReplicaHistoryDetail | null;
  onClose: () => void;
  onChangeView: (view: "queries" | "keywords") => void;
  onSelectQuery: (queryId: string) => void;
  onRestoreContent: (queryId: string) => void;
  onRestoreAnalysis: (queryId: string) => void;
  onRerun: (queryId: string) => void;
}

function formatPlatformScope(platformScope: string) {
  if (!platformScope) {
    return "未记录平台";
  }

  return platformScope
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" / ");
}

function formatStatus(status: string) {
  switch (status) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    case "running":
      return "进行中";
    default:
      return status;
  }
}

export function ReplicaHistoryDrawer({
  open,
  view,
  loading,
  detailLoading,
  errorMessage,
  queries,
  selectedQueryId,
  detail,
  onClose,
  onChangeView,
  onSelectQuery,
  onRestoreContent,
  onRestoreAnalysis,
  onRerun
}: ReplicaHistoryDrawerProps) {
  if (!open) {
    return null;
  }

  const groupedKeywords = Array.from(
    queries.reduce((map, query) => {
      const existing = map.get(query.keyword) ?? [];
      existing.push(query);
      map.set(query.keyword, existing);
      return map;
    }, new Map<string, ReplicaHistoryQuery[]>())
  );

  return (
    <div className="replica-shell__history-drawer-shell" onClick={onClose}>
      <aside
        className="replica-shell__history-drawer"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="replica-shell__history-drawer-head">
          <div>
            <h3>搜索历史</h3>
            <p>回看关键词查询、抓取结果和对应的选题快照。</p>
          </div>
          <button
            className="replica-shell__drawer-close"
            type="button"
            aria-label="关闭搜索历史"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="replica-shell__history-drawer-tabs">
          <button
            className={view === "queries" ? "is-active" : ""}
            type="button"
            onClick={() => onChangeView("queries")}
          >
            查询记录
          </button>
          <button
            className={view === "keywords" ? "is-active" : ""}
            type="button"
            onClick={() => onChangeView("keywords")}
          >
            关键词视图
          </button>
        </div>

        <div className="replica-shell__history-drawer-body">
          <div className="replica-shell__history-list-panel">
            {loading ? <div className="replica-shell__history-state">加载中...</div> : null}
            {!loading && errorMessage ? (
              <div className="replica-shell__history-state">{errorMessage}</div>
            ) : null}

            {!loading && !errorMessage && view === "queries" ? (
              <div className="replica-shell__history-list">
                {queries.length > 0 ? (
                  queries.map((query) => (
                    <button
                      key={query.id}
                      className={`replica-shell__history-record ${
                        query.id === selectedQueryId ? "is-active" : ""
                      }`}
                      type="button"
                      onClick={() => onSelectQuery(query.id)}
                    >
                      <strong>{query.keyword}</strong>
                      <span>{formatPlatformScope(query.platformScope)}</span>
                      <small>{query.finishedAt ?? query.startedAt}</small>
                    </button>
                  ))
                ) : (
                  <div className="replica-shell__history-state">暂无查询记录</div>
                )}
              </div>
            ) : null}

            {!loading && !errorMessage && view === "keywords" ? (
              <div className="replica-shell__history-list">
                <div className="replica-shell__history-section-title">按关键词查看</div>
                {groupedKeywords.length > 0 ? (
                  groupedKeywords.map(([keyword, keywordQueries]) => (
                    <button
                      key={keyword}
                      className="replica-shell__history-record"
                      type="button"
                      onClick={() => onSelectQuery(keywordQueries[0]!.id)}
                    >
                      <strong>{keyword}</strong>
                      <span>{keywordQueries.length} 次查询</span>
                      <small>{keywordQueries[0]?.finishedAt ?? keywordQueries[0]?.startedAt}</small>
                    </button>
                  ))
                ) : (
                  <div className="replica-shell__history-state">暂无关键词历史</div>
                )}
              </div>
            ) : null}
          </div>

          <div className="replica-shell__history-detail-panel">
            {detailLoading ? <div className="replica-shell__history-state">正在读取详情...</div> : null}

            {!detailLoading && detail ? (
              <div className="replica-shell__history-detail">
                <div className="replica-shell__history-detail-head">
                  <h4>{detail.query.keyword}</h4>
                  <p>
                    {formatPlatformScope(detail.query.platformScope)} ·{" "}
                    {detail.query.finishedAt ?? detail.query.startedAt}
                  </p>
                </div>

                <div className="replica-shell__history-detail-metrics">
                  <span>结果 {detail.query.cappedCount}</span>
                  <span>状态 {formatStatus(detail.query.status)}</span>
                </div>

                <div className="replica-shell__history-detail-actions">
                  <button type="button" onClick={() => onRestoreContent(detail.query.id)}>
                    查看内容
                  </button>
                  <button type="button" onClick={() => onRestoreAnalysis(detail.query.id)}>
                    查看选题
                  </button>
                  <button type="button" onClick={() => onRerun(detail.query.id)}>
                    重新抓取
                  </button>
                </div>

                {detail.analysis ? (
                  <div className="replica-shell__history-detail-section">
                    <h5>选题快照</h5>
                    <p>{detail.analysis.snapshot.hotSummary || "暂无热点摘要"}</p>
                    {detail.analysis.topics.length > 0 ? (
                      <ul className="replica-shell__history-topic-list">
                        {detail.analysis.topics.map((topic) => (
                          <li key={topic.id}>
                            <strong>{topic.title}</strong>
                            <span>{topic.intro}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <div className="replica-shell__history-detail-section">
                    <h5>选题快照</h5>
                    <p>当前查询还没有保存选题快照。</p>
                  </div>
                )}
              </div>
            ) : null}

            {!detailLoading && !detail ? (
              <div className="replica-shell__history-state">选择一条历史记录查看详情。</div>
            ) : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

export default ReplicaHistoryDrawer;
