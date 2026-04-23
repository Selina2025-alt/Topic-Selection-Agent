import type { CSSProperties } from "react";

import type { ReplicaCategory } from "@/lib/replica-workbench-data";

interface CategoryMenuState {
  categoryId: string;
  x: number;
  y: number;
}

interface ReplicaSidebarProps {
  categories: ReplicaCategory[];
  activeCategoryId: string;
  createDraft: string;
  showCreateForm: boolean;
  menuState: CategoryMenuState | null;
  renamingCategoryId: string | null;
  renameDraft: string;
  onSelectCategory: (categoryId: string) => void;
  onToggleCreateForm: () => void;
  onCreateDraftChange: (value: string) => void;
  onCreateCategory: () => void;
  onOpenMenu: (categoryId: string, x: number, y: number) => void;
  onCloseMenu: () => void;
  onStartRename: (categoryId: string) => void;
  onRenameDraftChange: (value: string) => void;
  onSubmitRename: () => void;
  onCancelRename: () => void;
  onDeleteCategory: (categoryId: string) => void;
}

export function ReplicaSidebar({
  categories,
  activeCategoryId,
  createDraft,
  showCreateForm,
  menuState,
  renamingCategoryId,
  renameDraft,
  onSelectCategory,
  onToggleCreateForm,
  onCreateDraftChange,
  onCreateCategory,
  onOpenMenu,
  onCloseMenu,
  onStartRename,
  onRenameDraftChange,
  onSubmitRename,
  onCancelRename,
  onDeleteCategory
}: ReplicaSidebarProps) {
  const menuStyle = menuState
    ? ({
        left: menuState.x,
        top: menuState.y
      } satisfies CSSProperties)
    : undefined;

  return (
    <aside className="replica-shell__sidebar">
      <div className="replica-shell__brand">
        <div className="replica-shell__brand-logo">C</div>
        <div>
          <div className="replica-shell__brand-title">ContentPulse</div>
          <div className="replica-shell__brand-sub">内容监控台</div>
        </div>
      </div>

      <div className="replica-shell__sidebar-head">
        <span>监控分类</span>
        <button
          className="replica-shell__sidebar-plus"
          type="button"
          aria-label="展开新增分类"
          onClick={onToggleCreateForm}
        >
          +
        </button>
      </div>

      {showCreateForm ? (
        <div className="replica-shell__create-box">
          <input
            className="replica-shell__create-input"
            placeholder="输入分类名称或关键词"
            value={createDraft}
            onChange={(event) => onCreateDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateCategory();
              }
            }}
          />
          <div className="replica-shell__create-actions">
            <button className="replica-shell__create-button" type="button" onClick={onCreateCategory}>
              新增分类
            </button>
            <button className="replica-shell__create-cancel" type="button" onClick={onToggleCreateForm}>
              收起
            </button>
          </div>
        </div>
      ) : null}

      <div className="replica-shell__category-list">
        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          const isRenaming = renamingCategoryId === category.id;

          return (
            <div
              key={category.id}
              className={`replica-shell__category-card ${isActive ? "is-active" : ""}`}
              onContextMenu={(event) => {
                event.preventDefault();
                onOpenMenu(category.id, event.clientX, event.clientY);
              }}
            >
              <button
                className={`replica-shell__category-main ${isActive ? "is-active" : ""}`}
                type="button"
                onClick={() => onSelectCategory(category.id)}
              >
                <div className="replica-shell__category-icon" aria-hidden="true">
                  {category.icon}
                </div>
                <div className="replica-shell__category-copy">
                  {isRenaming ? (
                    <div
                      className="replica-shell__rename-box"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <input
                        className="replica-shell__rename-input"
                        value={renameDraft}
                        onChange={(event) => onRenameDraftChange(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onSubmitRename();
                          }

                          if (event.key === "Escape") {
                            event.preventDefault();
                            onCancelRename();
                          }
                        }}
                      />
                      <div className="replica-shell__rename-actions">
                        <button type="button" onClick={onSubmitRename}>
                          保存
                        </button>
                        <button type="button" onClick={onCancelRename}>
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="replica-shell__category-title">{category.name}</div>
                      <div className="replica-shell__category-meta">{category.count} 条内容</div>
                    </>
                  )}
                </div>
              </button>

              <button
                className="replica-shell__category-more"
                type="button"
                aria-label="更多操作"
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  onOpenMenu(category.id, rect.left, rect.bottom + 8);
                }}
              >
                ⋯
              </button>
            </div>
          );
        })}
      </div>

      <div className="replica-shell__status-card">
        <div className="replica-shell__status-title">每日 08:00 自动运行</div>
        <div className="replica-shell__status-row">
          <div className="replica-shell__status-avatar">N</div>
          <div className="replica-shell__status-dot" />
          <div className="replica-shell__status-copy">
            <strong>运行正常</strong>
            <span>最近一次同步 08:03</span>
          </div>
        </div>
      </div>

      {menuState ? (
        <div className="replica-shell__menu" role="menu" style={menuStyle}>
          <button
            className="replica-shell__menu-item"
            role="menuitem"
            type="button"
            onClick={() => onStartRename(menuState.categoryId)}
          >
            重命名分类
          </button>
          <button
            className="replica-shell__menu-item replica-shell__menu-item--danger"
            role="menuitem"
            type="button"
            onClick={() => onDeleteCategory(menuState.categoryId)}
          >
            删除分类
          </button>
          <button className="replica-shell__menu-item" role="menuitem" type="button" onClick={onCloseMenu}>
            取消
          </button>
        </div>
      ) : null}
    </aside>
  );
}

export default ReplicaSidebar;
