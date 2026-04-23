import type { ReactNode } from "react";

import type { MonitorCategory } from "@/lib/types";

interface GlobalToolbarProps {
  categories: MonitorCategory[];
  isScanning: boolean;
  isCreateCategoryOpen: boolean;
  onOpenCreateCategory: () => void;
  onToggleScan: () => void;
  draftForm?: ReactNode;
}

function getLatestRunAt(categories: MonitorCategory[]) {
  return categories.find((category) => category.lastRunAt)?.lastRunAt ?? "--";
}

export function GlobalToolbar({
  categories,
  isScanning,
  isCreateCategoryOpen,
  onOpenCreateCategory,
  onToggleScan,
  draftForm
}: GlobalToolbarProps) {
  const reportCount = categories.filter((category) => category.reports.length > 0).length;
  const contentCount = categories.reduce(
    (total, category) => total + category.todayCollectionCount,
    0
  );
  const reviewCount = categories.reduce(
    (total, category) => total + category.decisionSignals.reviewItems.length,
    0
  );

  return (
    <section className="workbench-shell__global-toolbar">
      <div className="workbench-shell__global-toolbar-copy">
        <div className="workbench-shell__panel-kicker">系统级操作</div>
        <strong>内容监控与选题决策工作台</strong>
        <p>{`已覆盖 ${categories.length} 个监控分类，当前累计 ${contentCount} 条内容信号，${reviewCount} 个待人工确认项。`}</p>
      </div>

      <div className="workbench-shell__global-toolbar-status" aria-label="全局状态">
        <span>{`最近扫描 ${getLatestRunAt(categories)}`}</span>
        <span>{`日报状态 ${reportCount}/${categories.length}`}</span>
        <span>{isScanning ? "手动扫描中" : "系统待命中"}</span>
      </div>

      <div className="workbench-shell__global-toolbar-actions">
        <button
          type="button"
          className={isCreateCategoryOpen ? "workbench-shell__ghost-button is-active" : "workbench-shell__ghost-button"}
          aria-pressed={isCreateCategoryOpen}
          onClick={onOpenCreateCategory}
        >
          新建监控分类
        </button>
        <button
          type="button"
          className="workbench-shell__action-button"
          aria-pressed={isScanning}
          onClick={onToggleScan}
        >
          {isScanning ? "扫描中..." : "开始手动扫描"}
        </button>
      </div>

      {isCreateCategoryOpen ? draftForm : null}
    </section>
  );
}

export default GlobalToolbar;
