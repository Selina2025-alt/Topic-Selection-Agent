import { DateStrip, type DateStripItem } from "@/components/workbench/date-strip";
import { ReportTopicCard } from "@/components/workbench/report-topic-card";
import type { DailyReport, MonitorCategory, ReportView, TopicIdea } from "@/lib/types";

interface ReportTabProps {
  activeCategory: MonitorCategory;
  report: DailyReport;
  reportView: ReportView;
  onReportViewChange: (view: ReportView) => void;
  selectedReportDate: string;
  focusedTopicId: string | null;
  onSelectReportDate: (date: string) => void;
  onOpenEvidence: (topic: TopicIdea) => void;
  onOpenSamples: (topic: TopicIdea) => void;
  onOpenTimeline: (topic: TopicIdea) => void;
}

function buildDateItems(reports: DailyReport[]): DateStripItem[] {
  return [...reports]
    .sort((left, right) => right.date.localeCompare(left.date))
    .map((item) => ({
      date: item.date,
      label: item.topics[0]?.title ?? "暂无选题",
      detail: `${item.topicCount} 个选题 · ${item.platformsInvolved} 个平台`
    }));
}

export function ReportTab({
  activeCategory,
  report,
  reportView,
  onReportViewChange,
  selectedReportDate,
  focusedTopicId,
  onSelectReportDate,
  onOpenEvidence,
  onOpenSamples,
  onOpenTimeline
}: ReportTabProps) {
  const reportDates = buildDateItems(activeCategory.reports);

  return (
    <section
      className="workbench-shell__hero-card workbench-shell__hero-card--report"
      aria-label={`${activeCategory.name} 报告`}
    >
      <div className="workbench-shell__panel-kicker">选题分析与报告</div>
      <div className="workbench-shell__section-heading">
        <h2>最新日报与证据链</h2>
        <p>先扫最近几天，再点进最值得看的那一天。</p>
      </div>

      <DateStrip
        items={reportDates}
        selectedDate={selectedReportDate}
        onSelectDate={onSelectReportDate}
      />

      <div className="workbench-shell__header-meta" role="group" aria-label="报告视图切换">
        <button
          type="button"
          className={
            reportView === "daily"
              ? "workbench-shell__tab is-active"
              : "workbench-shell__tab"
          }
          aria-pressed={reportView === "daily"}
          onClick={() => onReportViewChange("daily")}
        >
          日报
        </button>
        <button
          type="button"
          className={
            reportView === "summary"
              ? "workbench-shell__tab is-active"
              : "workbench-shell__tab"
          }
          aria-pressed={reportView === "summary"}
          onClick={() => onReportViewChange("summary")}
        >
          汇总
        </button>
      </div>

      {reportView === "daily" ? (
        <div className="workbench-shell__report-summary-grid">
          <article className="workbench-shell__insight-card">
            <span>热度摘要</span>
            <strong>{report.hotSummary}</strong>
          </article>
          <article className="workbench-shell__insight-card">
            <span>关注摘要</span>
            <strong>{report.focusSummary}</strong>
          </article>
          <article className="workbench-shell__insight-card">
            <span>模式摘要</span>
            <strong>{report.patternSummary}</strong>
          </article>
          <article className="workbench-shell__insight-card">
            <span>洞察摘要</span>
            <strong>{report.insightSummary}</strong>
          </article>
        </div>
      ) : (
        <div className="workbench-shell__report-summary-grid">
          <article className="workbench-shell__insight-card">
            <span>汇总视图</span>
            <strong>
              {`${report.date} 共 ${report.topicCount} 个选题，覆盖 ${report.platformsInvolved} 个平台。`}
            </strong>
            <p>{report.hotSummary}</p>
          </article>
          <article className="workbench-shell__insight-card">
            <span>关键结论</span>
            <strong>{report.insightSummary}</strong>
          </article>
        </div>
      )}

      <div className="workbench-shell__topic-grid">
        {report.topics.map((topic) => (
          <ReportTopicCard
            key={topic.id}
            topic={topic}
            isFocused={focusedTopicId === topic.id}
            onOpenEvidence={onOpenEvidence}
            onOpenSamples={onOpenSamples}
            onOpenTimeline={onOpenTimeline}
          />
        ))}
      </div>
    </section>
  );
}

export default ReportTab;
