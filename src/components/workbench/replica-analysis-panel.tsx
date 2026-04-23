import type {
  ReplicaAnalysisMode,
  ReplicaDailyReport
} from "@/lib/replica-workbench-data";

export interface ReplicaAnalysisEvidenceItem {
  id: string;
  snapshotId: string;
  contentId: string;
  keyword: string;
  platformId: string;
  title: string;
  briefSummary: string;
  keyFacts: string[];
  keywords: string[];
  highlights: string[];
  attentionSignals: string[];
  topicAngles: string[];
  createdAt: string;
}

export interface ReplicaAnalysisDetail {
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

interface ReplicaAnalysisPanelProps {
  reports: ReplicaDailyReport[];
  selectedReportId: string;
  analysisMode: ReplicaAnalysisMode;
  reportWindow: 7 | 14;
  isRunning: boolean;
  statusMessage: string;
  detail: ReplicaAnalysisDetail | null;
  selectedSupportTopicId: string | null;
  onSelectReport: (reportId: string) => void;
  onSelectMode: (mode: ReplicaAnalysisMode) => void;
  onSelectWindow: (window: 7 | 14) => void;
  onRunAnalysis: () => void;
  onViewSupportContent: (topicId: string) => void;
}

function getVisibleEvidenceItems(
  detail: ReplicaAnalysisDetail | null,
  selectedSupportTopicId: string | null
) {
  if (!detail) {
    return [];
  }

  if (!selectedSupportTopicId) {
    return detail.evidenceItems;
  }

  const topic = detail.topics.find((item) => item.id === selectedSupportTopicId);

  if (!topic) {
    return detail.evidenceItems;
  }

  return detail.evidenceItems.filter((item) => topic.supportContentIds.includes(item.contentId));
}

export function ReplicaAnalysisPanel({
  reports,
  selectedReportId,
  analysisMode,
  reportWindow,
  isRunning,
  statusMessage,
  detail,
  selectedSupportTopicId,
  onSelectReport,
  onSelectMode,
  onSelectWindow,
  onRunAnalysis,
  onViewSupportContent
}: ReplicaAnalysisPanelProps) {
  const visibleReports = reports.slice(0, reportWindow);
  const activeReport = visibleReports.find((report) => report.id === selectedReportId) ?? visibleReports[0];
  const visibleEvidenceItems = getVisibleEvidenceItems(detail, selectedSupportTopicId);

  return (
    <div className="replica-shell__analysis-shell">
      <div className="replica-shell__analysis-toolbar">
        <div className="replica-shell__analysis-toolbar-head">
          <div className="replica-shell__analysis-dates">
            {visibleReports.map((report) => (
              <button
                key={report.id}
                className={`replica-shell__report-chip ${
                  report.id === activeReport?.id ? "is-active" : ""
                }`}
                type="button"
                onClick={() => onSelectReport(report.id)}
              >
                <span className="replica-shell__report-date">{report.date}</span>
              </button>
            ))}
          </div>

          <button
            className="replica-shell__action-button replica-shell__action-button--primary replica-shell__analysis-run"
            type="button"
            disabled={isRunning}
            onClick={onRunAnalysis}
          >
            {isRunning ? "分析中..." : "立即分析"}
          </button>
        </div>

        <div className="replica-shell__analysis-actions">
          <div className="replica-shell__mini-switch">
            <button
              className={analysisMode === "daily" ? "is-active" : ""}
              type="button"
              onClick={() => onSelectMode("daily")}
            >
              日报
            </button>
            <button
              className={analysisMode === "summary" ? "is-active" : ""}
              type="button"
              onClick={() => onSelectMode("summary")}
            >
              汇总
            </button>
          </div>

          <div className="replica-shell__mini-switch">
            <button
              className={reportWindow === 7 ? "is-active" : ""}
              type="button"
              onClick={() => onSelectWindow(7)}
            >
              最近 7 天
            </button>
            <button
              className={reportWindow === 14 ? "is-active" : ""}
              type="button"
              onClick={() => onSelectWindow(14)}
            >
              最近 14 天
            </button>
          </div>
        </div>

        {statusMessage ? <p className="replica-shell__analysis-status">{statusMessage}</p> : null}
      </div>

      {analysisMode === "daily" && activeReport ? (
        <div className="replica-shell__analysis-grid">
          <section className="replica-shell__analysis-card">
            <h4>今日热点摘要</h4>
            <p>{activeReport.hotSummary}</p>
          </section>
          <section className="replica-shell__analysis-card">
            <h4>前一天用户关注焦点</h4>
            <p>{activeReport.focusSummary}</p>
          </section>
          <section className="replica-shell__analysis-card">
            <h4>爆款内容共性拆解</h4>
            <p>{activeReport.patternSummary}</p>
          </section>
          <section className="replica-shell__analysis-card">
            <h4>洞察建议</h4>
            <p>{activeReport.insightSummary}</p>
          </section>

          <section className="replica-shell__analysis-card replica-shell__analysis-card--full">
            <h4>选题建议</h4>
            <div className="replica-shell__topic-list">
              {activeReport.suggestions.map((suggestion) => (
                <article key={suggestion.id} className="replica-shell__topic-card">
                  <h5>{suggestion.title}</h5>
                  <p>{suggestion.intro}</p>
                  <dl>
                    <div>
                      <dt>为什么做这个选题</dt>
                      <dd>{suggestion.whyNow}</dd>
                    </div>
                    <div>
                      <dt>爆点在哪里</dt>
                      <dd>{suggestion.hook}</dd>
                    </div>
                    <div>
                      <dt>增长空间在哪里</dt>
                      <dd>{suggestion.growth}</dd>
                    </div>
                  </dl>
                  <button type="button" onClick={() => onViewSupportContent(suggestion.id)}>
                    查看支撑内容
                  </button>
                </article>
              ))}
            </div>
          </section>

          {detail?.evidenceItems.length ? (
            <section className="replica-shell__analysis-card replica-shell__analysis-card--full">
              <h4>文章摘录证据</h4>
              <div className="replica-shell__evidence-list">
                {visibleEvidenceItems.map((item) => (
                  <article key={item.id} className="replica-shell__evidence-card">
                    <div className="replica-shell__evidence-head">
                      <strong>{item.title}</strong>
                      <span>{item.platformId}</span>
                    </div>
                    <p>{item.briefSummary}</p>
                    {item.keywords.length ? (
                      <div className="replica-shell__tag-list">
                        {item.keywords.map((keyword) => (
                          <span key={`${item.id}-${keyword}`} className="replica-shell__tag-item">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {item.highlights.length ? (
                      <ul className="replica-shell__evidence-points">
                        {item.highlights.map((highlight) => (
                          <li key={`${item.id}-${highlight}`}>{highlight}</li>
                        ))}
                      </ul>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="replica-shell__summary-shell">
          <h4>最近 {reportWindow} 天选题方向汇总</h4>
          <div className="replica-shell__topic-list">
            {visibleReports.flatMap((report) =>
              report.suggestions.map((suggestion) => (
                <article key={suggestion.id} className="replica-shell__topic-card">
                  <div className="replica-shell__topic-meta">{report.date}</div>
                  <h5>{suggestion.title}</h5>
                  <p>{suggestion.intro}</p>
                  <button type="button" onClick={() => onViewSupportContent(suggestion.id)}>
                    查看支撑内容
                  </button>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReplicaAnalysisPanel;
