import { ContentCard } from "@/components/workbench/content-card";
import type { ContentItem } from "@/lib/types";

interface ContentPoolProps {
  title: string;
  description: string;
  items: ContentItem[];
  highlightedContentIds: string[];
  pooledContentIds: string[];
  onOpenLinkedInsight: (content: ContentItem) => void;
  onTogglePool: (content: ContentItem) => void;
  status?: "idle" | "loading" | "error";
  statusMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  regionLabel?: string;
}

export function ContentPool({
  title,
  description,
  items,
  highlightedContentIds,
  pooledContentIds,
  onOpenLinkedInsight,
  onTogglePool,
  status = "idle",
  statusMessage,
  emptyTitle = "暂无素材",
  emptyDescription = "当前筛选条件下没有匹配内容，试试切换平台、日期或内容池筛选。",
  regionLabel = "内容池"
}: ContentPoolProps) {
  return (
    <section className="workbench-shell__content-pool" role="region" aria-label={regionLabel}>
      <div className="workbench-shell__section-heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="workbench-shell__content-grid" aria-label="内容卡片">
        {status === "loading" ? (
          <article className="workbench-shell__workspace-card">
            <span>加载中</span>
            <strong>{statusMessage ?? "正在获取内容，请稍候..."}</strong>
          </article>
        ) : status === "error" ? (
          <article className="workbench-shell__workspace-card">
            <span>获取失败</span>
            <strong>{statusMessage ?? "内容获取失败，请稍后重试。"}</strong>
          </article>
        ) : items.length === 0 ? (
          <article className="workbench-shell__workspace-card">
            <span>{emptyTitle}</span>
            <strong>{emptyDescription}</strong>
          </article>
        ) : (
          items.map((content) => (
            <ContentCard
              key={content.id}
              content={content}
              isHighlighted={highlightedContentIds.includes(content.id)}
              isPooled={pooledContentIds.includes(content.id)}
              onOpenLinkedInsight={onOpenLinkedInsight}
              onTogglePool={onTogglePool}
            />
          ))
        )}
      </div>
    </section>
  );
}

export default ContentPool;
