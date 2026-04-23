import { useMemo } from "react";

import type { ReplicaArticle, ReplicaPlatformId } from "@/lib/replica-workbench-data";

interface ReplicaContentListProps {
  keyword: string;
  articles: ReplicaArticle[];
  activePlatformId: ReplicaPlatformId;
  selectedCardId: string;
  isLoading: boolean;
  errorMessage: string;
  isApiSource: boolean;
  onSelectCard: (cardId: string) => void;
}

function buildRatio(value: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.max(12, Math.round((value / total) * 100));
}

function buildEmptySourceSummary(activePlatformId: ReplicaPlatformId) {
  if (activePlatformId === "wechat") {
    return {
      listLabel: "公众号实时结果",
      proofLabel: "当前来源：公众号原文",
      verifyLabel: "来源类型 公众号实时结果"
    };
  }

  if (activePlatformId === "xiaohongshu") {
    return {
      listLabel: "小红书实时结果",
      proofLabel: "当前来源：小红书原文",
      verifyLabel: "来源类型 小红书实时结果"
    };
  }

  if (activePlatformId === "twitter") {
    return {
      listLabel: "Twitter/X 实时结果",
      proofLabel: "当前来源：Twitter/X 原文",
      verifyLabel: "来源类型 Twitter/X 实时结果"
    };
  }

  if (activePlatformId === "all") {
    return {
      listLabel: "多平台实时结果",
      proofLabel: "当前来源：多平台混合结果",
      verifyLabel: "来源类型 多平台混合结果"
    };
  }

  return {
    listLabel: "当前平台暂无结果",
    proofLabel: `当前来源：${activePlatformId} 暂无结果`,
    verifyLabel: `来源类型 ${activePlatformId} 暂无结果`
  };
}

function buildSourceSummary(articles: ReplicaArticle[], isApiSource: boolean) {
  if (!isApiSource) {
    return {
      listLabel: "本地原型示例内容",
      proofLabel: "当前来源：本地示例",
      verifyLabel: "来源类型 本地示例"
    };
  }

  const hasWechat = articles.some((item) => item.platformId === "wechat");
  const hasXiaohongshu = articles.some((item) => item.platformId === "xiaohongshu");
  const hasTwitter = articles.some((item) => item.platformId === "twitter");

  if (hasWechat && !hasXiaohongshu && !hasTwitter) {
    return {
      listLabel: "公众号实时结果",
      proofLabel: "当前来源：公众号原文",
      verifyLabel: "来源类型 公众号实时结果"
    };
  }

  if (hasXiaohongshu && !hasWechat && !hasTwitter) {
    return {
      listLabel: "小红书实时结果",
      proofLabel: "当前来源：小红书原文",
      verifyLabel: "来源类型 小红书实时结果"
    };
  }

  if (hasTwitter && !hasWechat && !hasXiaohongshu) {
    return {
      listLabel: "Twitter/X 实时结果",
      proofLabel: "当前来源：Twitter/X 原文",
      verifyLabel: "来源类型 Twitter/X 实时结果"
    };
  }

  return {
    listLabel: "多平台实时结果",
    proofLabel: "当前来源：多平台混合结果",
    verifyLabel: "来源类型 多平台混合结果"
  };
}

function buildLinkLabel(article: ReplicaArticle) {
  if (article.platformId === "wechat") {
    return "查看公众号原文";
  }

  if (article.platformId === "xiaohongshu") {
    return "查看笔记原文";
  }

  if (article.platformId === "twitter") {
    return "查看推文原文";
  }

  return "查看原文";
}

function sortDisplayArticles(articles: ReplicaArticle[]) {
  return [...articles].sort((left, right) => {
    if (right.likes !== left.likes) {
      return right.likes - left.likes;
    }

    if (right.comments !== left.comments) {
      return right.comments - left.comments;
    }

    return right.publishTimestamp - left.publishTimestamp;
  });
}

function buildHeatTone(value: number) {
  if (value >= 90) {
    return "is-high";
  }

  if (value >= 75) {
    return "is-medium";
  }

  return "is-soft";
}

export function ReplicaContentList({
  keyword,
  articles,
  activePlatformId,
  selectedCardId,
  isLoading,
  errorMessage,
  isApiSource,
  onSelectCard
}: ReplicaContentListProps) {
  const displayArticles = useMemo(() => sortDisplayArticles(articles), [articles]);
  const latestArticle = displayArticles.reduce<ReplicaArticle | null>((latest, article) => {
    if (!latest || article.publishTimestamp > latest.publishTimestamp) {
      return article;
    }

    return latest;
  }, null);
  const latestPublishedAt = latestArticle?.publishedAt ?? "--";
  const linkableCount = displayArticles.filter((item) => Boolean(item.articleUrl)).length;
  const wechatCount = displayArticles.filter((item) => item.platformId === "wechat").length;
  const xiaohongshuCount = displayArticles.filter((item) => item.platformId === "xiaohongshu").length;
  const twitterCount = displayArticles.filter((item) => item.platformId === "twitter").length;
  const sourceSummary =
    displayArticles.length === 0 && isApiSource
      ? buildEmptySourceSummary(activePlatformId)
      : buildSourceSummary(displayArticles, isApiSource);
  const sortLabel = isApiSource ? "按点赞数排序 · 真实数据" : "按热度排序 · 原型数据";
  const verifySortLabel = isApiSource ? "排序规则：按点赞数降序" : "排序规则：按热度降序";

  const sideMetrics = [
    {
      label: "可验原文",
      value: linkableCount,
      width: buildRatio(linkableCount, displayArticles.length)
    },
    {
      label: "公众号来源",
      value: wechatCount,
      width: buildRatio(wechatCount, displayArticles.length)
    },
    {
      label: "小红书来源",
      value: xiaohongshuCount,
      width: buildRatio(xiaohongshuCount, displayArticles.length)
    },
    {
      label: "Twitter/X 来源",
      value: twitterCount,
      width: buildRatio(twitterCount, displayArticles.length)
    }
  ];

  return (
    <div className="replica-shell__content-shell">
      <div className="replica-shell__content-head">
        <div className="replica-shell__content-head-copy">
          <h3>[{keyword}] 共 {displayArticles.length} 条内容</h3>
          <span>{sourceSummary.listLabel}</span>
        </div>
        <div className="replica-shell__content-head-meta">
          <span className="replica-shell__content-sort-note">{sortLabel}</span>
          {isLoading ? <span className="replica-shell__loading-flag">抓取中...</span> : null}
        </div>
      </div>

      {isApiSource ? (
        <div className="replica-shell__content-proof">
          <span>接口原始顺序已保留</span>
          <span>{verifySortLabel}</span>
          <span>{sourceSummary.proofLabel}</span>
        </div>
      ) : null}

      {errorMessage ? <div className="replica-shell__error-banner">{errorMessage}</div> : null}

      <div className="replica-shell__content-layout">
        <div className="replica-shell__content-primary">
          <div className="replica-shell__content-list">
            {displayArticles.length > 0 ? (
              displayArticles.map((item) => (
                <article
                  key={item.id}
                  className={`replica-shell__content-card ${
                    item.id === selectedCardId ? "is-active" : ""
                  }`}
                >
                  <div
                    className={`replica-shell__content-heat ${buildHeatTone(item.heat)}`}
                    aria-label={`热度 ${item.heat}`}
                  >
                    <strong>{item.heat}</strong>
                    <span>热度</span>
                    <i className="replica-shell__content-heat-bar" />
                  </div>

                  <button
                    className="replica-shell__content-main"
                    type="button"
                    onClick={() => onSelectCard(item.id)}
                  >
                    <div className="replica-shell__content-title-row">
                      <div className="replica-shell__content-badges">
                        <span className="replica-shell__content-source">{item.platformLabel}</span>
                        <span className="replica-shell__content-author-chip">{item.author}</span>
                      </div>
                      <h4 className="replica-shell__content-title">{item.title}</h4>
                    </div>
                    <p className="replica-shell__content-excerpt">{item.excerpt}</p>
                    <div className="replica-shell__content-meta">
                      <span>发布时间 {item.publishedAt}</span>
                      <span>点赞 {item.likes}</span>
                      <span>评论 {item.comments}</span>
                      <span>阅读 {item.reads}</span>
                    </div>
                  </button>

                  <div className="replica-shell__content-actions">
                    {typeof item.rawOrderIndex === "number" ? (
                      <span className="replica-shell__raw-index">原始顺序 #{item.rawOrderIndex + 1}</span>
                    ) : null}
                    {item.articleUrl ? (
                      <a
                        className="replica-shell__source-link"
                        href={item.articleUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {buildLinkLabel(item)}
                      </a>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="replica-shell__empty-panel">
                <strong>当前筛选下暂无内容</strong>
                <span>试试切换平台、日期，或者换一个关键词重新抓取。</span>
              </div>
            )}
          </div>
        </div>

        <aside className="replica-shell__content-side">
          <section className="replica-shell__side-card">
            <h4>扫描摘要</h4>
            <div className="replica-shell__side-stats">
              <div>
                <strong>{displayArticles.length}</strong>
                <span>结果数</span>
              </div>
              <div>
                <strong>{linkableCount}</strong>
                <span>可点原文</span>
              </div>
            </div>
          </section>

          <section className="replica-shell__side-card">
            <h4>验证信息</h4>
            <div className="replica-shell__side-list">
              <span>最新发布时间 {latestPublishedAt}</span>
              <span>{sourceSummary.verifyLabel}</span>
              <span>{verifySortLabel}</span>
            </div>
          </section>

          <section className="replica-shell__side-card">
            <h4>轻量分布</h4>
            <div className="replica-shell__metric-bars">
              {sideMetrics.map((metric) => (
                <div key={metric.label} className="replica-shell__metric-row">
                  <div className="replica-shell__metric-copy">
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                  <div className="replica-shell__metric-track">
                    <i
                      className="replica-shell__metric-fill"
                      style={{ width: `${metric.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default ReplicaContentList;
