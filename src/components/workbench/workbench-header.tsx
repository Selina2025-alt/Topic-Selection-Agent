import type { MonitorCategory, TabId } from "@/lib/types";

interface WorkbenchHeaderProps {
  activeCategory: MonitorCategory;
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "content", label: "内容" },
  { id: "report", label: "选题分析与报告" },
  { id: "settings", label: "监控设置" }
];

export function WorkbenchHeader({
  activeCategory,
  activeTab,
  onTabChange
}: WorkbenchHeaderProps) {
  return (
    <header className="workbench-shell__header">
      <div className="workbench-shell__header-topline">
        <div className="workbench-shell__header-copy">
          <div className="workbench-shell__eyebrow">当前分类总览</div>
          <h1 className="workbench-shell__title">{activeCategory.name}</h1>
          <p className="workbench-shell__description">{activeCategory.description}</p>
        </div>

        <div className="workbench-shell__header-stats" aria-label="当前分类状态">
          <article className="workbench-shell__header-stat">
            <span>最后更新</span>
            <strong>{activeCategory.overview.updatedAt}</strong>
          </article>
          <article className="workbench-shell__header-stat">
            <span>今日抓取</span>
            <strong>{`${activeCategory.todayCollectionCount} 条`}</strong>
          </article>
          <article className="workbench-shell__header-stat">
            <span>覆盖平台</span>
            <strong>{`${activeCategory.overview.platformCount} 个`}</strong>
          </article>
          <article className="workbench-shell__header-stat">
            <span>日报状态</span>
            <strong>{activeCategory.reportStatus}</strong>
          </article>
        </div>
      </div>

      <nav className="workbench-shell__tabs" role="tablist" aria-label="工作台视图">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === activeTab}
            className={
              tab.id === activeTab ? "workbench-shell__tab is-active" : "workbench-shell__tab"
            }
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default WorkbenchHeader;
