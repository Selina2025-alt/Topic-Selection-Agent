import type { ActionItem, MonitorCategory } from "@/lib/types";

interface ActionDeckProps {
  activeCategory: MonitorCategory;
  pendingActionIds: string[];
  onViewEvidence: (actionItem: ActionItem) => void;
  onAddToPool: (actionItem: ActionItem) => void;
  onTogglePending: (actionItem: ActionItem) => void;
}

export function ActionDeck({
  activeCategory,
  pendingActionIds,
  onViewEvidence,
  onAddToPool,
  onTogglePending
}: ActionDeckProps) {
  const actionCount = activeCategory.actionItems.length;

  return (
    <section
      className="workbench-shell__hero-card workbench-shell__hero-card--action"
      aria-label={`今日最值得跟进的 ${actionCount} 个选题`}
    >
      <div className="workbench-shell__panel-kicker">今日建议动作区</div>
      <div className="workbench-shell__section-heading">
        <h2>今日该看什么</h2>
        <p>{`先跟进 ${actionCount} 个方向，再回看证据链和平台差异。`}</p>
      </div>

      <div className="workbench-shell__action-deck">
        {activeCategory.actionItems.map((item) => (
          <article key={item.id} className="workbench-shell__action-card">
            <div className="workbench-shell__action-card-topline">
              <span className="workbench-shell__priority-pill">{item.priority}</span>
              <small>{item.sourceLabel}</small>
            </div>
            <strong>{item.title}</strong>
            <p>{item.summary}</p>
            <small>{item.evidenceLabel}</small>
            <div className="workbench-shell__stacked-actions">
              <button
                type="button"
                className="workbench-shell__tab"
                aria-label={`查看证据：${item.title}`}
                onClick={() => onViewEvidence(item)}
              >
                查看证据
              </button>
              <button
                type="button"
                className="workbench-shell__tab"
                aria-label={`加入选题池：${item.title}`}
                onClick={() => onAddToPool(item)}
              >
                加入选题池
              </button>
              <button
                type="button"
                className={
                  pendingActionIds.includes(item.id)
                    ? "workbench-shell__tab is-active"
                    : "workbench-shell__tab"
                }
                aria-label={`${pendingActionIds.includes(item.id) ? "已标记待执行" : "标记待执行"}：${item.title}`}
                onClick={() => onTogglePending(item)}
              >
                {pendingActionIds.includes(item.id) ? "已标记待执行" : "标记待执行"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default ActionDeck;
