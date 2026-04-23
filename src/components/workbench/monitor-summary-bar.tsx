import type { MonitorCategory } from "@/lib/types";

interface MonitorSummaryBarProps {
  activeCategory: MonitorCategory;
}

function formatCompactNames(labels: string[], visibleCount: number) {
  const visible = labels.slice(0, visibleCount);
  const remaining = labels.length - visible.length;

  return remaining > 0 ? `${visible.join(" / ")} +${remaining}` : visible.join(" / ");
}

export function MonitorSummaryBar({ activeCategory }: MonitorSummaryBarProps) {
  const platformLabels = activeCategory.settings.platforms
    .filter((platform) => platform.enabled)
    .map((platform) => platform.label);
  const keywordLabels = activeCategory.settings.keywords
    .slice()
    .sort((left, right) => right.hitCount - left.hitCount)
    .map((keyword) => keyword.label);
  const creatorLabels = activeCategory.settings.creators
    .slice()
    .sort((left, right) => right.hotSampleContribution - left.hotSampleContribution)
    .map((creator) => creator.name);

  return (
    <section className="workbench-shell__summary-bar" role="region" aria-label="监控对象摘要">
      <article className="workbench-shell__summary-chip">
        <span>覆盖平台</span>
        <strong>{formatCompactNames(platformLabels, 4)}</strong>
      </article>
      <article className="workbench-shell__summary-chip">
        <span>重点关键词</span>
        <strong>{formatCompactNames(keywordLabels, 3)}</strong>
      </article>
      <article className="workbench-shell__summary-chip">
        <span>目标账号</span>
        <strong>{formatCompactNames(creatorLabels, 3)}</strong>
      </article>
    </section>
  );
}

export default MonitorSummaryBar;
