import type { ContentItem } from "@/lib/types";

export type ReplicaTabId = "content" | "analysis" | "history" | "settings";
export type ReplicaAnalysisMode = "daily" | "summary";

export type ReplicaPlatformId =
  | "all"
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "bilibili"
  | "twitter"
  | "wechat"
  | "zhihu";

export type ReplicaTrackedPlatformId = Exclude<ReplicaPlatformId, "all">;

export interface ReplicaPlatform {
  id: ReplicaPlatformId;
  label: string;
  icon: string;
}

export interface ReplicaDateOption {
  id: string;
  hint: string;
  day: string;
  week: string;
  dots: string[];
}

export interface ReplicaTopicSuggestion {
  id: string;
  title: string;
  intro: string;
  whyNow: string;
  hook: string;
  growth: string;
  supportContentIds: string[];
}

export interface ReplicaDailyReport {
  id: string;
  date: string;
  label: string;
  hotSummary: string;
  focusSummary: string;
  patternSummary: string;
  insightSummary: string;
  suggestions: ReplicaTopicSuggestion[];
}

export interface ReplicaPlatformSetting {
  id: ReplicaTrackedPlatformId;
  label: string;
  icon: string;
  enabled: boolean;
}

export interface ReplicaCreator {
  id: string;
  name: string;
  platformId: ReplicaTrackedPlatformId;
}

export interface ReplicaKeywordTarget {
  id: string;
  keyword: string;
  platformIds: ReplicaTrackedPlatformId[];
  createdAt: string;
  lastRunAt: string | null;
  lastRunStatus: "idle" | "running" | "success" | "failed";
  lastResultCount: number;
}

export interface ReplicaRunRule {
  scheduleLabel: string;
  runTime: string;
  analysisScope: string;
}

export interface ReplicaCategory {
  id: string;
  icon: string;
  name: string;
  description: string;
  count: number;
  keyword: string;
  keywords: string[];
  keywordTargets: ReplicaKeywordTarget[];
  creators: ReplicaCreator[];
  platforms: ReplicaPlatformSetting[];
  runRule: ReplicaRunRule;
  reports: ReplicaDailyReport[];
}

export interface ReplicaArticleTemplate {
  platformId: ReplicaTrackedPlatformId;
  author: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  heat: number;
  likes: number;
  comments: number;
  reads: string;
  articleUrl?: string;
}

export interface ReplicaArticle {
  id: string;
  platformId: ReplicaTrackedPlatformId;
  platformLabel: string;
  author: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  publishTimestamp: number;
  heat: number;
  likes: number;
  comments: number;
  reads: string;
  articleUrl?: string;
  sourceUrl?: string;
  source: "mock" | "api";
  sourceType: "wechat" | "xiaohongshu" | "mixed";
  tag: string;
  rawOrderIndex?: number;
}

export interface ReplicaApiMappingContext {
  keyword: string;
}

export const replicaPlatforms: ReplicaPlatform[] = [
  { id: "all", label: "全部平台", icon: "" },
  { id: "douyin", label: "抖音", icon: "🎵" },
  { id: "xiaohongshu", label: "小红书", icon: "📕" },
  { id: "weibo", label: "微博", icon: "🔥" },
  { id: "bilibili", label: "B站", icon: "📺" },
  { id: "twitter", label: "Twitter/X", icon: "✕" },
  { id: "wechat", label: "公众号", icon: "💬" },
  { id: "zhihu", label: "知乎", icon: "💡" }
];

function createPlatformSettings(enabledIds: ReplicaTrackedPlatformId[]): ReplicaPlatformSetting[] {
  return replicaPlatforms
    .filter((item): item is ReplicaPlatform & { id: ReplicaTrackedPlatformId } => item.id !== "all")
    .map((platform) => ({
      id: platform.id,
      label: platform.label,
      icon: platform.icon,
      enabled: enabledIds.includes(platform.id)
    }));
}

function createReports(keyword: string, prefix: string): ReplicaDailyReport[] {
  const dates = [
    "2026-03-31",
    "2026-03-30",
    "2026-03-29",
    "2026-03-28",
    "2026-03-27",
    "2026-03-26",
    "2026-03-25"
  ];

  return dates.map((date, index) => ({
    id: `${prefix}-${date}`,
    date,
    label: `${Number.parseInt(date.slice(5, 7), 10)}月${Number.parseInt(date.slice(8, 10), 10)}日`,
    hotSummary: `${keyword} 相关内容从功能介绍转向结果证明，真实工作流和成本节省成为主叙事。`,
    focusSummary: `前一天用户更关注 ${keyword} 是否真的能接入日常生产流程，而不只是演示效果。`,
    patternSummary:
      "爆款内容的共性是标题结论明确、案例真实、步骤可复用，并且会给出前后效率对比。",
    insightSummary:
      index % 2 === 0
        ? "更值得做的是结果型选题和案例型选题，单纯功能介绍已经很难建立信任。"
        : "用户开始同时关注效率、风险和团队协作边界，说明选题可以向方法论与风险管理扩展。",
    suggestions: [
      {
        id: `${prefix}-${date}-workflow`,
        title: `${keyword} 工作流拆解`,
        intro: `围绕 ${keyword} 在真实内容生产中的使用链路，做一篇完整案例拆解。`,
        whyNow: "最近高热样本都在强调结果与成本对比，工作流拆解更容易建立可信度。",
        hook: "用前后效率对比和真实操作截图切入，最容易解释这个选题为什么值得做。",
        growth: "可以继续延展成模板、提示词、复盘清单等系列内容。",
        supportContentIds: []
      },
      {
        id: `${prefix}-${date}-evidence`,
        title: `${keyword} 结果证明型选题`,
        intro: "把“做完了什么、节省了多少时间、哪里踩坑了”整理成一篇可直接参考的经验文。",
        whyNow: "用户已经不满足于看功能，而是想确认这个方案是否真的能落地。",
        hook: "真实项目和具体数字会显著提升点击与收藏意愿。",
        growth: "后续可以自然扩展到行业案例、团队实践和风险边界讨论。",
        supportContentIds: []
      }
    ]
  }));
}

function createCreators(base: string): ReplicaCreator[] {
  return [
    { id: `${base}-creator-1`, name: "机器之心", platformId: "wechat" },
    { id: `${base}-creator-2`, name: "少数派", platformId: "wechat" },
    { id: `${base}-creator-3`, name: "阿杰做产品", platformId: "douyin" }
  ];
}

function createKeywordTargets(
  categoryId: string,
  keywords: string[],
  platformIds: ReplicaTrackedPlatformId[]
): ReplicaKeywordTarget[] {
  return keywords.map((keyword, index) => ({
    id: `${categoryId}-keyword-${index + 1}`,
    keyword,
    platformIds,
    createdAt: `2026-03-${`${25 + index}`.padStart(2, "0")}T08:00:00.000Z`,
    lastRunAt: null,
    lastRunStatus: "idle",
    lastResultCount: 0
  }));
}

function createCategoryTemplate(
  id: string,
  icon: string,
  name: string,
  description: string,
  count: number,
  keyword: string,
  keywords: string[]
): ReplicaCategory {
  const defaultPlatformIds = ["wechat", "xiaohongshu"] satisfies ReplicaTrackedPlatformId[];

  return {
    id,
    icon,
    name,
    description,
    count,
    keyword,
    keywords,
    keywordTargets: createKeywordTargets(id, keywords, defaultPlatformIds),
    creators: createCreators(id),
    platforms: createPlatformSettings(["wechat", "douyin", "xiaohongshu", "bilibili"]),
    runRule: {
      scheduleLabel: "每天定时运行一次",
      runTime: "08:00",
      analysisScope: "前一天热门内容 Top10"
    },
    reports: createReports(keyword, id)
  };
}

export const initialReplicaCategories: ReplicaCategory[] = [
  createCategoryTemplate(
    "claude",
    "⚡",
    "Claude Code 选题监控",
    "聚焦 Claude Code、工作流和真实落地案例。",
    342,
    "claude code",
    ["claude code", "mcp", "ai coding"]
  ),
  createCategoryTemplate(
    "vibe",
    "🎵",
    "Vibe Coding 选题监控",
    "观察 Vibe Coding、创作表达和工作流话题。",
    218,
    "vibe coding",
    ["vibe coding", "创作工作流"]
  ),
  createCategoryTemplate(
    "agent",
    "🤖",
    "AI Agent 趋势追踪",
    "跟踪 AI Agent、自动化协作和平台趋势。",
    456,
    "ai agent",
    ["ai agent", "智能体", "automation"]
  ),
  createCategoryTemplate(
    "indie",
    "🚀",
    "独立开发者生态",
    "关注独立开发、内容增长和工具应用场景。",
    189,
    "独立开发",
    ["独立开发", "内容增长"]
  )
];

export const replicaArticleTemplates: Record<string, ReplicaArticleTemplate[]> = {
  claude: [
    {
      platformId: "wechat",
      author: "夕小瑶科技说",
      title: "{keyword} + 开源工具的暴力工作流，下次直接躺赢",
      excerpt: "用真实内容生产链路解释 AI 工作流怎样真正节省时间，比只讲功能更容易建立信任。",
      publishedAt: "2026-03-31 09:20:00",
      heat: 87,
      likes: 294,
      comments: 141,
      reads: "2.0万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-claude-1"
    },
    {
      platformId: "wechat",
      author: "安恒信息",
      title: "恒脑安全智能体全面对标 {keyword} Security，极速复现 3 个 0day",
      excerpt: "安全方向正在变成内容运营也必须看懂的高热子赛道，风险边界开始变成新的流量入口。",
      publishedAt: "2026-03-31 08:45:00",
      heat: 84,
      likes: 162,
      comments: 74,
      reads: "1.7万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-claude-2"
    },
    {
      platformId: "wechat",
      author: "机器之心",
      title: "{keyword} 的 IDE 时代：AI 编程不是补全，而是接管任务流",
      excerpt: "从 IDE 工作流切入，把提示词、上下文窗口和任务拆解串成完整链路，更适合做深度内容。",
      publishedAt: "2026-03-30 19:10:00",
      heat: 81,
      likes: 121,
      comments: 46,
      reads: "1.3万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-claude-3"
    },
    {
      platformId: "wechat",
      author: "少数派",
      title: "把 {keyword} 接进个人知识库之后，我的选题生产快了三倍",
      excerpt: "作者不是在秀功能，而是在展示素材归档、角度整理和提纲生成如何真正串起来。",
      publishedAt: "2026-03-29 15:30:00",
      heat: 79,
      likes: 96,
      comments: 22,
      reads: "9700阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-claude-4"
    },
    {
      platformId: "douyin",
      author: "阿杰做产品",
      title: "{keyword} 工作流 30 分钟上手，项目推进直接提速",
      excerpt: "短视频内容更强调结果展示，这条适合补充标题表达和强钩子角度。",
      publishedAt: "2026-03-28 11:00:00",
      heat: 90,
      likes: 901,
      comments: 204,
      reads: "3.6万播放"
    },
    {
      platformId: "xiaohongshu",
      author: "阿梦效率研究所",
      title: "我用 {keyword} 重做了一次内容团队协作模板",
      excerpt: "偏方法论表达，适合提炼内容运营如何真正落地 AI 协作。",
      publishedAt: "2026-03-27 10:30:00",
      heat: 85,
      likes: 512,
      comments: 99,
      reads: "2.3万阅读"
    }
  ],
  vibe: [
    {
      platformId: "wechat",
      author: "数字游牧手册",
      title: "{keyword} 正在改写内容团队的脑暴方式",
      excerpt: "从工作方式变化切入，而不是从工具功能切入，更适合做方法论型选题。",
      publishedAt: "2026-03-31 10:10:00",
      heat: 86,
      likes: 188,
      comments: 52,
      reads: "1.9万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-vibe-1"
    },
    {
      platformId: "wechat",
      author: "极客公园",
      title: "一周体验 {keyword}：效率不是重点，表达欲才是",
      excerpt: "把技术演示转成创作表达，更适合大众传播。",
      publishedAt: "2026-03-30 13:00:00",
      heat: 82,
      likes: 144,
      comments: 31,
      reads: "1.2万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-vibe-2"
    }
  ],
  agent: [
    {
      platformId: "wechat",
      author: "AI 产品研习社",
      title: "{keyword} 已经不只是聊天机器人，而是新一代协作入口",
      excerpt: "围绕角色、流程和上下文管理展开，更适合做系统级趋势观察。",
      publishedAt: "2026-03-31 09:00:00",
      heat: 85,
      likes: 232,
      comments: 67,
      reads: "2.4万阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-agent-1"
    }
  ],
  indie: [
    {
      platformId: "wechat",
      author: "独立开发变现日记",
      title: "{keyword} 的内容打法，为什么比冷启动更重要",
      excerpt: "把增长、内容和产品运营拉在一起，适合内容运营直接拿来参考。",
      publishedAt: "2026-03-31 07:40:00",
      heat: 80,
      likes: 121,
      comments: 24,
      reads: "9800阅读",
      articleUrl: "https://mp.weixin.qq.com/s/mock-indie-1"
    }
  ]
};

export function formatReplicaReadCount(value?: number) {
  if (!value) {
    return "2300阅读";
  }

  if (value >= 10000) {
    return `${(value / 10000).toFixed(1).replace(/\\.0$/, "")}万阅读`;
  }

  return `${value}阅读`;
}

export function mapContentItemToReplicaArticle(
  item: ContentItem,
  context: ReplicaApiMappingContext
): ReplicaArticle {
  return {
    id: item.id,
    platformId: "wechat",
    platformLabel: "公众号",
    author: item.authorName || item.author,
    title: item.title,
    excerpt: item.summary || item.aiSummary || "暂无摘要",
    publishedAt: item.publishTime || item.publishedAt,
    publishTimestamp: item.publishTimestamp || Date.parse(item.publishTime || item.publishedAt),
    heat: item.heatScore || 72,
    likes: item.likeCount || Number.parseInt(item.metrics.likes, 10) || 0,
    comments: Number.parseInt(item.metrics.comments, 10) || 0,
    reads: formatReplicaReadCount(item.readCount),
    articleUrl: item.articleUrl || item.sourceUrl || item.shortLink,
    sourceUrl: item.sourceUrl || item.articleUrl || item.shortLink,
    source: "api",
    sourceType: "wechat",
    tag: context.keyword,
    rawOrderIndex: item.rawOrderIndex
  };
}
