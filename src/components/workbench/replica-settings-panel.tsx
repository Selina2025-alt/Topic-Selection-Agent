import { useEffect, useMemo, useState } from "react";

import { DEFAULT_SILICONFLOW_MODEL } from "@/lib/analysis-models";
import type { ReplicaCategory, ReplicaTrackedPlatformId } from "@/lib/replica-workbench-data";
import { replicaPlatforms } from "@/lib/replica-workbench-data";

export interface ReplicaGlobalAnalysisSettings {
  enabled: boolean;
  time: string;
  provider: string;
  model: string;
}

const DEFAULT_GLOBAL_ANALYSIS_SETTINGS: ReplicaGlobalAnalysisSettings = {
  enabled: true,
  time: "08:00",
  provider: "SiliconFlow",
  model: DEFAULT_SILICONFLOW_MODEL
};

interface ReplicaSettingsPanelProps {
  category: ReplicaCategory;
  globalAnalysisSettings?: ReplicaGlobalAnalysisSettings;
  isSavingAnalysisSettings?: boolean;
  analysisSettingsMessage?: string;
  onTogglePlatform: (platformId: string) => void;
  onAddKeywordTarget: (input: { keyword: string; platformIds: ReplicaTrackedPlatformId[] }) => void;
  onRemoveKeywordTarget: (keywordTargetId: string) => void;
  onAddCreator: (creator: string) => void;
  onRemoveCreator: (creatorId: string) => void;
  onSaveGlobalAnalysisSettings?: (settings: ReplicaGlobalAnalysisSettings) => void;
  onDeleteCategory: () => void;
}

function isKeywordPlatformDisabled(
  platformId: ReplicaTrackedPlatformId,
  enabledPlatformIds: ReplicaTrackedPlatformId[]
) {
  return !enabledPlatformIds.includes(platformId);
}

export function ReplicaSettingsPanel({
  category,
  globalAnalysisSettings,
  isSavingAnalysisSettings,
  analysisSettingsMessage,
  onTogglePlatform,
  onAddKeywordTarget,
  onRemoveKeywordTarget,
  onAddCreator,
  onRemoveCreator,
  onSaveGlobalAnalysisSettings,
  onDeleteCategory
}: ReplicaSettingsPanelProps) {
  const resolvedGlobalAnalysisSettings = globalAnalysisSettings ?? DEFAULT_GLOBAL_ANALYSIS_SETTINGS;
  const [keywordDraft, setKeywordDraft] = useState("");
  const [creatorDraft, setCreatorDraft] = useState("");
  const [selectedKeywordPlatforms, setSelectedKeywordPlatforms] = useState<ReplicaTrackedPlatformId[]>([
    "wechat"
  ]);
  const [analysisSettingsDraft, setAnalysisSettingsDraft] = useState(resolvedGlobalAnalysisSettings);

  const enabledPlatforms = useMemo(
    () => category.platforms.filter((platform) => platform.enabled).map((platform) => platform.id),
    [category.platforms]
  );
  const keywordPlatforms = useMemo(
    () =>
      replicaPlatforms.filter(
        (platform): platform is (typeof replicaPlatforms)[number] & { id: ReplicaTrackedPlatformId } =>
          platform.id !== "all"
      ),
    []
  );

  const canSubmitKeyword =
    keywordDraft.trim().length > 0 &&
    selectedKeywordPlatforms.some((platformId) => enabledPlatforms.includes(platformId));

  useEffect(() => {
    setAnalysisSettingsDraft(resolvedGlobalAnalysisSettings);
  }, [resolvedGlobalAnalysisSettings]);

  function handleToggleKeywordPlatform(platformId: ReplicaTrackedPlatformId) {
    setSelectedKeywordPlatforms((current) =>
      current.includes(platformId)
        ? current.filter((item) => item !== platformId)
        : [...current, platformId]
    );
  }

  function handleSubmitKeyword() {
    const normalized = keywordDraft.trim();

    if (!normalized) {
      return;
    }

    const nextPlatformIds = selectedKeywordPlatforms.filter((platformId) => enabledPlatforms.includes(platformId));

    if (nextPlatformIds.length === 0) {
      return;
    }

    onAddKeywordTarget({
      keyword: normalized,
      platformIds: nextPlatformIds
    });
    setKeywordDraft("");
    setSelectedKeywordPlatforms(["wechat"]);
  }

  return (
    <div className="replica-shell__settings-grid">
      <section className="replica-shell__settings-card">
        <h4>监控平台</h4>
        <div className="replica-shell__settings-platforms">
          {category.platforms.map((platform) => (
            <button
              key={platform.id}
              className={`replica-shell__platform-setting ${platform.enabled ? "is-enabled" : ""}`}
              data-testid={`settings-platform-${platform.id}`}
              type="button"
              onClick={() => onTogglePlatform(platform.id)}
            >
              <span>
                {platform.icon} {platform.label}
              </span>
              <strong>{platform.enabled ? "已启用" : "已停用"}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="replica-shell__settings-card">
        <div className="replica-shell__settings-card-head">
          <h4>关键词</h4>
          <button type="button" onClick={handleSubmitKeyword} disabled={!canSubmitKeyword}>
            新增关键词
          </button>
        </div>
        <input
          className="replica-shell__settings-input"
          placeholder="输入新的监控关键词"
          value={keywordDraft}
          onChange={(event) => setKeywordDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmitKeyword();
            }
          }}
        />
        <div className="replica-shell__settings-platform-picker">
          {keywordPlatforms.map((platform) => {
            const isSelected = selectedKeywordPlatforms.includes(platform.id);
            const isDisabled = isKeywordPlatformDisabled(platform.id, enabledPlatforms);

            return (
              <button
                key={platform.id}
                type="button"
                className={`replica-shell__keyword-platform-chip ${isSelected ? "is-selected" : ""}`}
                data-testid={`keyword-platform-${platform.id}`}
                aria-pressed={isSelected}
                disabled={isDisabled}
                onClick={() => handleToggleKeywordPlatform(platform.id)}
              >
                <span>
                  {platform.icon} {platform.label}
                </span>
              </button>
            );
          })}
        </div>
        <div className="replica-shell__keyword-target-list">
          {category.keywordTargets.map((target) => (
            <div key={target.id} className="replica-shell__keyword-target-item">
              <div className="replica-shell__keyword-target-head">
                <strong>{target.keyword}</strong>
                <button type="button" onClick={() => onRemoveKeywordTarget(target.id)}>
                  删除
                </button>
              </div>
              <div className="replica-shell__tag-list">
                {target.platformIds.map((platformId) => {
                  const platform = replicaPlatforms.find((item) => item.id === platformId);

                  return (
                    <span key={`${target.id}-${platformId}`} className="replica-shell__tag-item">
                      {platform?.icon} {platform?.label ?? platformId}
                    </span>
                  );
                })}
              </div>
              <div className="replica-shell__keyword-target-meta">
                <span>最近抓取：{target.lastRunAt ?? "未抓取"}</span>
                <span>状态：{target.lastRunStatus}</span>
                <span>结果数：{target.lastResultCount}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="replica-shell__settings-card">
        <div className="replica-shell__settings-card-head">
          <h4>对标账号</h4>
          <button
            type="button"
            onClick={() => {
              onAddCreator(creatorDraft);
              setCreatorDraft("");
            }}
          >
            新增账号
          </button>
        </div>
        <input
          className="replica-shell__settings-input"
          placeholder="输入账号名称"
          value={creatorDraft}
          onChange={(event) => setCreatorDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCreator(creatorDraft);
              setCreatorDraft("");
            }
          }}
        />
        <div className="replica-shell__creator-list">
          {category.creators.map((creator) => (
            <div key={creator.id} className="replica-shell__creator-item">
              <span>
                {creator.name} · {creator.platformId}
              </span>
              <button type="button" onClick={() => onRemoveCreator(creator.id)}>
                删除
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="replica-shell__settings-card">
        <h4>全局分析设置</h4>
        <div className="replica-shell__analysis-settings-form">
          <label className="replica-shell__analysis-settings-toggle">
            <input
              type="checkbox"
              checked={analysisSettingsDraft.enabled}
              onChange={(event) =>
                setAnalysisSettingsDraft((current) => ({
                  ...current,
                  enabled: event.target.checked
                }))
              }
            />
            <span>启用每日定时分析</span>
          </label>

          <label className="replica-shell__analysis-settings-field">
            <span>执行时间</span>
            <input
              className="replica-shell__settings-input"
              type="time"
              value={analysisSettingsDraft.time}
              onChange={(event) =>
                setAnalysisSettingsDraft((current) => ({
                  ...current,
                  time: event.target.value || "08:00"
                }))
              }
            />
          </label>

          <div className="replica-shell__rule-list">
            <span>AI 服务：{analysisSettingsDraft.provider}</span>
            <span>分析模型：{analysisSettingsDraft.model}</span>
            <span>到点后会先重抓所有监控关键词，再分析前一天有数据的关键词。</span>
          </div>

          <div className="replica-shell__settings-card-head">
            <span className="replica-shell__settings-tip">
              未自定义时默认每天 08:00 自动执行。
            </span>
            <button
              type="button"
              disabled={isSavingAnalysisSettings}
              onClick={() => onSaveGlobalAnalysisSettings?.(analysisSettingsDraft)}
            >
              {isSavingAnalysisSettings ? "保存中..." : "保存设置"}
            </button>
          </div>

          {analysisSettingsMessage ? (
            <p className="replica-shell__settings-feedback">{analysisSettingsMessage}</p>
          ) : null}
        </div>
      </section>

      <section className="replica-shell__settings-card">
        <h4>运行规则</h4>
        <div className="replica-shell__rule-list">
          <span>{category.runRule.scheduleLabel}</span>
          <span>运行时间 {category.runRule.runTime}</span>
          <span>分析范围 {category.runRule.analysisScope}</span>
        </div>
      </section>

      <section className="replica-shell__settings-card replica-shell__settings-card--danger">
        <h4>分类管理</h4>
        <p>删除当前分类后，左侧列表会同步移除该分类。</p>
        <button className="replica-shell__danger-button" type="button" onClick={onDeleteCategory}>
          删除当前分类
        </button>
      </section>
    </div>
  );
}

export default ReplicaSettingsPanel;
