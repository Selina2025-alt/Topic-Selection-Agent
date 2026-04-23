"use client";

import type { CreateCategoryDraft, NonAggregatePlatformId } from "@/lib/types";

interface PlatformOption {
  id: NonAggregatePlatformId;
  label: string;
}

interface CreateCategoryDraftProps {
  draft: CreateCategoryDraft;
  platformOptions: PlatformOption[];
  onNameChange: (value: string) => void;
  onKeywordsChange: (value: string) => void;
  onCreatorsChange: (value: string) => void;
  onTogglePlatform: (platformId: NonAggregatePlatformId) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function CreateCategoryDraft({
  draft,
  platformOptions,
  onNameChange,
  onKeywordsChange,
  onCreatorsChange,
  onTogglePlatform,
  onSave,
  onCancel,
  onDelete
}: CreateCategoryDraftProps) {
  return (
    <section className="workbench-shell__draft-panel" role="region" aria-label="新建监控分类表单">
      <div className="workbench-shell__draft-head">
        <div>
          <div className="workbench-shell__panel-kicker">新建监控分类</div>
          <strong>先配置分类名称、监控平台、关键词和目标账号</strong>
          <p>保存后会自动切换到新分类，并直接展开内容监控页。</p>
        </div>
      </div>

      <div className="workbench-shell__draft-grid">
        <label className="workbench-shell__draft-field">
          <span>分类名称</span>
          <input
            aria-label="分类名称"
            className="workbench-shell__draft-input"
            placeholder="例如：公众号深度文章监控"
            type="text"
            value={draft.name}
            onChange={(event) => onNameChange(event.target.value)}
          />
        </label>

        <div className="workbench-shell__draft-field">
          <span>监控平台</span>
          <div className="workbench-shell__draft-platforms" role="group" aria-label="监控平台">
            {platformOptions.map((platform) => {
              const isSelected = draft.platformIds.includes(platform.id);

              return (
                <button
                  key={platform.id}
                  type="button"
                  className={isSelected ? "workbench-shell__tab is-active" : "workbench-shell__tab"}
                  aria-pressed={isSelected}
                  onClick={() => onTogglePlatform(platform.id)}
                >
                  {platform.label}
                </button>
              );
            })}
          </div>
        </div>

        <label className="workbench-shell__draft-field">
          <span>重点关键词</span>
          <textarea
            aria-label="重点关键词"
            className="workbench-shell__draft-textarea"
            placeholder="多个关键词可用逗号分隔，例如：人民日报, AI 应用"
            rows={3}
            value={draft.keywords}
            onChange={(event) => onKeywordsChange(event.target.value)}
          />
        </label>

        <label className="workbench-shell__draft-field">
          <span>目标账号</span>
          <textarea
            aria-label="目标账号"
            className="workbench-shell__draft-textarea"
            placeholder="多个账号可用逗号分隔，例如：人民日报, 少数派"
            rows={3}
            value={draft.creators}
            onChange={(event) => onCreatorsChange(event.target.value)}
          />
        </label>
      </div>

      <div className="workbench-shell__draft-actions">
        <button
          type="button"
          className="workbench-shell__action-button"
          disabled={!draft.name.trim()}
          onClick={onSave}
        >
          保存分类
        </button>
        <button type="button" className="workbench-shell__ghost-button" onClick={onCancel}>
          取消
        </button>
        <button type="button" className="workbench-shell__ghost-button" onClick={onDelete}>
          删除草稿
        </button>
      </div>
    </section>
  );
}

export default CreateCategoryDraft;
