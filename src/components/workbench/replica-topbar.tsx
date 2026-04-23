import type { ReplicaCategory, ReplicaTabId } from "@/lib/replica-workbench-data";

interface ReplicaTopbarProps {
  category: ReplicaCategory;
  activeTab: ReplicaTabId;
  currentCount: number;
  currentUpdatedAt: string;
  onSelectTab: (tabId: ReplicaTabId) => void;
}

const TABS: Array<{ id: ReplicaTabId; label: string }> = [
  { id: "content", label: "内容" },
  { id: "analysis", label: "选题分析" },
  { id: "history", label: "搜索历史" },
  { id: "settings", label: "监控设置" }
];

export function ReplicaTopbar({
  category,
  activeTab,
  currentCount,
  currentUpdatedAt,
  onSelectTab
}: ReplicaTopbarProps) {
  const platformCount = category.platforms.filter((item) => item.enabled).length;

  return (
    <div className="replica-shell__topbar">
      <div className="replica-shell__topbar-head">
        <div>
          <div className="replica-shell__eyebrow">ContentPulse / 监控分类</div>
          <div className="replica-shell__topbar-title">
            <span aria-hidden="true">{category.icon}</span>
            <span>{category.name}</span>
          </div>
        </div>
        <span className="replica-shell__topbar-updated">更新于 {currentUpdatedAt}</span>
      </div>

      <p className="replica-shell__topbar-description">{category.description}</p>

      <div className="replica-shell__summary-row">
        <span>今日抓取 {currentCount}</span>
        <span>覆盖平台 {platformCount}</span>
        <span>日报状态 已生成</span>
      </div>

      <div className="replica-shell__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`replica-shell__tab ${activeTab === tab.id ? "is-active" : ""}`}
            type="button"
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default ReplicaTopbar;
