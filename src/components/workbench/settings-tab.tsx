"use client";

import type { ReactNode } from "react";

import type {
  CreatorTarget,
  KeywordTarget,
  MonitorCategory,
  PlatformSetting
} from "@/lib/types";

interface SettingsTabProps {
  activeCategory: MonitorCategory;
  draftTarget?: "keyword" | "account" | null;
  onAddKeyword?: () => void;
  onAddAccount?: () => void;
  onClearDraft?: () => void;
}

function getPlatformFeedback(platform: PlatformSetting) {
  if (platform.successRate >= 85 && platform.qualityRate >= 84) {
    return "推荐继续放大";
  }

  if (platform.successRate >= 78 && platform.qualityRate >= 75) {
    return "稳定采样";
  }

  return "建议收缩";
}

function getKeywordFeedback(keyword: KeywordTarget) {
  if (keyword.hitCount >= 15 && keyword.qualityRate >= 85) {
    return "覆盖稳定";
  }

  if (keyword.hitCount <= 10) {
    return "偏窄";
  }

  return "命中正常";
}

function getCreatorFeedback(creator: CreatorTarget) {
  if (creator.weeklyUpdateCount >= 4 && creator.hotSampleContribution >= 3) {
    return "活跃且高贡献";
  }

  if (creator.weeklyUpdateCount <= 2) {
    return "更新偏少";
  }

  return "活动正常";
}

function getScheduleFeedback(activeCategory: MonitorCategory) {
  const { platformCount, keywordCount, creatorCount } = activeCategory.overview;

  if (platformCount >= 4 && keywordCount >= 4 && creatorCount >= 3) {
    return "规则反馈: 覆盖完整，适合继续放大有效样本。";
  }

  return "规则反馈: 先补齐覆盖，再扩大采样。";
}

function Card({
  eyebrow,
  title,
  summary,
  detail,
  footer,
  action
}: {
  eyebrow: string;
  title: string;
  summary: string;
  detail: string;
  footer?: string;
  action?: ReactNode;
}) {
  return (
    <article className="workbench-shell__settings-card">
      <span className="workbench-shell__settings-card-eyebrow">{eyebrow}</span>
      <strong>{title}</strong>
      <p>{summary}</p>
      <div className="workbench-shell__settings-card-feedback">{detail}</div>
      {footer ? <small>{footer}</small> : null}
      {action ? <div className="workbench-shell__settings-card-actions">{action}</div> : null}
    </article>
  );
}

export function SettingsTab({
  activeCategory,
  draftTarget,
  onAddKeyword,
  onAddAccount,
  onClearDraft
}: SettingsTabProps) {
  return (
    <section
      className="workbench-shell__hero-card workbench-shell__settings-shell"
      aria-label={`${activeCategory.name} 监控设置`}
    >
      <div className="workbench-shell__panel-kicker">监控设置</div>
      <h2>{`${activeCategory.name} 配置回报`}</h2>
      <p>
        {`当前配置覆盖 ${activeCategory.overview.platformCount} 个平台、${activeCategory.overview.keywordCount} 个关键词、${activeCategory.overview.creatorCount} 个账号，看的质量回报，不是编辑表单。`}
      </p>

      {draftTarget ? (
        <article className="workbench-shell__settings-draft" aria-live="polite">
          <span className="workbench-shell__settings-card-eyebrow">新增草稿</span>
          <strong>{draftTarget === "keyword" ? "关键词监控草稿" : "对标账号监控草稿"}</strong>
          <p>
            {draftTarget === "keyword"
              ? "下一步建议先补齐平台范围、命中预期和排重规则，再决定是否需要扩充关键词簇。"
              : "下一步建议先补齐平台、账号定位和近 7 天活跃度，再决定是否纳入长期监控。"}
          </p>
          <div className="workbench-shell__settings-card-actions">
            {onClearDraft ? (
              <button type="button" className="workbench-shell__tab" onClick={onClearDraft}>
                收起草稿
              </button>
            ) : null}
          </div>
        </article>
      ) : null}

      <div className="workbench-shell__settings-grid">
        <section className="workbench-shell__settings-section" aria-label="platform-settings">
          <div className="workbench-shell__settings-section-header">
            <div>
              <h3>平台配置</h3>
              <p>平台卡片同时展示成功率、有效样本质量和推荐动作。</p>
            </div>
          </div>
          <div className="workbench-shell__settings-card-grid">
            {activeCategory.settings.platforms.map((platform) => (
              <Card
                key={platform.id}
                eyebrow={platform.enabled ? "已启用" : "已停用"}
                title={platform.label}
                summary={`最近同步 ${platform.syncedAt} · 关键词 ${platform.keywordCount} · 账号 ${platform.creatorCount}`}
                detail={`${getPlatformFeedback(platform)} · 成功率 ${platform.successRate}% · 高质量样本率 ${platform.qualityRate}%`}
                footer={platform.recommendation}
              />
            ))}
          </div>
        </section>

        <section className="workbench-shell__settings-section" aria-label="keyword-settings">
          <div className="workbench-shell__settings-section-header">
            <div>
              <h3>关键词配置</h3>
              <p>关键词卡片显示命中数、高质量命中率和过宽/过窄/重叠提示。</p>
            </div>
            <button type="button" className="workbench-shell__action-button" onClick={onAddKeyword}>
              添加关键词
            </button>
          </div>
          <div className="workbench-shell__settings-card-grid">
            {activeCategory.settings.keywords.map((keyword) => (
              <Card
                key={keyword.id}
                eyebrow={keyword.platformIds.join(" / ")}
                title={keyword.label}
                summary={`命中数 ${keyword.hitCount} · 高质量命中率 ${keyword.qualityRate}%`}
                detail={`${getKeywordFeedback(keyword)} · ${keyword.qualityHint}`}
                footer={keyword.overlapHint}
              />
            ))}
          </div>
        </section>

        <section className="workbench-shell__settings-section" aria-label="creator-account-settings">
          <div className="workbench-shell__settings-section-header">
            <div>
              <h3>创作者 / 账号</h3>
              <p>账号卡片展示画像、爆款样本贡献和健康活跃提示。</p>
            </div>
            <button type="button" className="workbench-shell__action-button" onClick={onAddAccount}>
              添加账号
            </button>
          </div>
          <div className="workbench-shell__settings-card-grid">
            {activeCategory.settings.creators.map((creator) => (
              <Card
                key={creator.id}
                eyebrow={creator.platformId}
                title={creator.name}
                summary={creator.profile}
                detail={`${getCreatorFeedback(creator)} · 爆款样本贡献 ${creator.hotSampleContribution}`}
                footer={`${creator.hotContentStatus} · ${creator.healthHint} · 最近更新 ${creator.updatedAt}`}
              />
            ))}
          </div>
        </section>

        <section className="workbench-shell__settings-section" aria-label="schedule-rules-settings">
          <div className="workbench-shell__settings-section-header">
            <div>
              <h3>排期 / 规则</h3>
              <p>排期卡片说明采集节奏，规则卡片解释当前配置质量反馈。</p>
            </div>
          </div>
          <div className="workbench-shell__settings-card-grid">
            <Card
              eyebrow="排期"
              title={activeCategory.settings.schedule.frequency}
              summary={`采集时间 ${activeCategory.settings.schedule.time} · 模型 ${activeCategory.settings.schedule.model}`}
              detail={`覆盖范围 · ${activeCategory.settings.schedule.analysisScope}`}
              footer="排期稳定，适合保持当前采样节奏。"
            />
            <Card
              eyebrow="规则反馈"
              title="当前质量信号"
              summary={getScheduleFeedback(activeCategory)}
              detail="配置越完整，越容易把热点内容转成可复用的选题线索。"
              footer={activeCategory.decisionSignals.reviewItems.join(" · ")}
            />
          </div>
        </section>
      </div>
    </section>
  );
}

export default SettingsTab;
