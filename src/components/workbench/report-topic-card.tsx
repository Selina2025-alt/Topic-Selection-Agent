import type { TopicIdea } from "@/lib/types";

interface ReportTopicCardProps {
  topic: TopicIdea;
  isFocused: boolean;
  onOpenEvidence: (topic: TopicIdea) => void;
  onOpenSamples: (topic: TopicIdea) => void;
  onOpenTimeline: (topic: TopicIdea) => void;
}

const PLATFORM_LABELS: Record<TopicIdea["sourcePlatforms"][number], string> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  weibo: "微博",
  bilibili: "B站",
  twitter: "Twitter/X",
  wechat: "公众号"
};

export function ReportTopicCard({
  topic,
  isFocused,
  onOpenEvidence,
  onOpenSamples,
  onOpenTimeline
}: ReportTopicCardProps) {
  return (
    <article
      className={
        isFocused
          ? "workbench-shell__topic-card workbench-shell__topic-card--focused"
          : "workbench-shell__topic-card"
      }
    >
      <div className="workbench-shell__topic-card-topline">
        <span>{topic.confidence}</span>
        <small>{`${topic.evidenceCount} 条支撑内容`}</small>
      </div>
      <strong>{topic.title}</strong>
      <p>{topic.brief}</p>
      <small>{`${topic.whyNow} · ${topic.burstWindow} · 连续 ${topic.streakDays} 天`}</small>
      <div className="workbench-shell__chip-row">
        {topic.sourcePlatforms.map((platform) => (
          <span key={platform} className="workbench-shell__inline-chip">
            {PLATFORM_LABELS[platform]}
          </span>
        ))}
      </div>
      <div className="workbench-shell__stacked-actions">
        <button
          type="button"
          className="workbench-shell__tab"
          aria-label={`查看支撑内容：${topic.title}`}
          onClick={() => onOpenEvidence(topic)}
        >
          查看支撑内容
        </button>
        <button
          type="button"
          className="workbench-shell__tab"
          aria-label={`查看原始爆款样本：${topic.title}`}
          onClick={() => onOpenSamples(topic)}
        >
          查看原始爆款样本
        </button>
        <button
          type="button"
          className="workbench-shell__tab"
          aria-label={`查看同类内容时间线：${topic.title}`}
          onClick={() => onOpenTimeline(topic)}
        >
          查看同类内容时间线
        </button>
      </div>
    </article>
  );
}

export default ReportTopicCard;
