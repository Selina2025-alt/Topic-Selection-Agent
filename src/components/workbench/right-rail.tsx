import { MiniMetrics } from "@/components/workbench/mini-metrics";
import type { MonitorCategory } from "@/lib/types";

interface RightRailProps {
  activeCategory: MonitorCategory;
}

export function RightRail({ activeCategory }: RightRailProps) {
  const priorityMetrics = [
    { label: "P1", value: activeCategory.actionItems.filter((item) => item.priority === "P1").length },
    { label: "P2", value: activeCategory.actionItems.filter((item) => item.priority === "P2").length },
    { label: "P3", value: activeCategory.actionItems.filter((item) => item.priority === "P3").length }
  ];
  const platformMetrics = activeCategory.settings.platforms.map((platform) => ({
    label: platform.label,
    value: platform.qualityRate
  }));

  return (
    <aside
      className="workbench-shell__panel workbench-shell__panel--right"
      aria-label="右侧面板"
    >
      <section className="workbench-shell__panel-block">
        <div className="workbench-shell__panel-kicker">判断辅助信息</div>
        <p className="workbench-shell__panel-note">
          右侧只放辅助判断，不跟主内容抢焦点。
        </p>
      </section>

      <section className="workbench-shell__panel-block">
        <div className="workbench-shell__insight-stack">
          <MiniMetrics
            title="优先级分布"
            subtitle="先看哪些方向最值得跟进"
            items={priorityMetrics}
          />
          <MiniMetrics
            title="平台波动"
            subtitle="轻量判断今天哪边更热"
            items={platformMetrics}
          />

          <section className="workbench-shell__signal-card">
            <span>连续上升话题</span>
            <strong>值得继续跟 2 到 3 天的方向</strong>
            <div className="workbench-shell__signal-list" aria-label="连续上升话题">
              {activeCategory.decisionSignals.risingTopics.map((signal) => (
                <p key={signal}>{signal}</p>
              ))}
            </div>
          </section>

          <section className="workbench-shell__signal-card">
            <span>人工待确认项</span>
            <strong>今天需要人为判断的点</strong>
            <div className="workbench-shell__signal-list" aria-label="人工待确认项">
              {activeCategory.decisionSignals.reviewItems.map((signal) => (
                <p key={signal}>{signal}</p>
              ))}
            </div>
          </section>
        </div>
      </section>
    </aside>
  );
}

export default RightRail;
