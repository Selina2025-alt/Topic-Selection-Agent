import type { MonitorCategory } from "@/lib/types";

interface CategorySidebarProps {
  categories: MonitorCategory[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  onCreateCategory: () => void;
}

export function CategorySidebar({
  categories,
  selectedCategoryId,
  onSelectCategory,
  onCreateCategory
}: CategorySidebarProps) {
  const activeCategory =
    categories.find((category) => category.id === selectedCategoryId) ?? categories[0];

  if (!activeCategory) {
    return null;
  }

  const keyKeywords = activeCategory.settings.keywords
    .slice()
    .sort((left, right) => right.hitCount - left.hitCount)
    .slice(0, 3)
    .map((keyword) => keyword.label)
    .join(" / ");
  const keyCreators = activeCategory.settings.creators
    .slice()
    .sort((left, right) => right.hotSampleContribution - left.hotSampleContribution)
    .slice(0, 3)
    .map((creator) => creator.name)
    .join(" / ");

  return (
    <aside className="workbench-shell__panel workbench-shell__panel--left" aria-label="左侧面板">
      <section className="workbench-shell__panel-block">
        <div className="workbench-shell__sidebar-head">
          <div className="workbench-shell__panel-kicker">监控分类</div>
          <button
            type="button"
            className="workbench-shell__sidebar-action"
            aria-label="+ 新分类"
            onClick={onCreateCategory}
          >
            + 新分类
          </button>
        </div>
        <p className="workbench-shell__panel-note">先切分类，再看内容、报告和设置。</p>

        <div className="workbench-shell__category-stack" role="list">
          {categories.map((category) => {
            const isSelected = category.id === selectedCategoryId;

            return (
              <button
                key={category.id}
                type="button"
                aria-label={category.name}
                aria-pressed={isSelected}
                className={
                  isSelected
                    ? "workbench-shell__category-card is-active"
                    : "workbench-shell__category-card"
                }
                onClick={() => onSelectCategory(category.id)}
              >
                <div className="workbench-shell__category-card-head">
                  <strong>{category.name}</strong>
                  <span>{category.reportStatus}</span>
                </div>
                <p>{category.description}</p>
                <small>
                  {`${category.overview.platformCount} 平台 · ${category.overview.keywordCount} 关键词 · ${category.overview.creatorCount} 账号`}
                </small>
              </button>
            );
          })}
        </div>
      </section>

      <section className="workbench-shell__panel-block">
        <div className="workbench-shell__panel-kicker">监控摘要</div>
        <ul className="workbench-shell__list-stack">
          <li>
            <span>覆盖平台</span>
            <strong>{`${activeCategory.settings.platforms.length} 个`}</strong>
          </li>
          <li>
            <span>重点关键词</span>
            <strong>{keyKeywords || "待补充"}</strong>
          </li>
          <li>
            <span>目标账号</span>
            <strong>{keyCreators || "待补充"}</strong>
          </li>
        </ul>
      </section>
    </aside>
  );
}

export default CategorySidebar;
