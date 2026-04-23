import type {
  CreateCategoryDraft,
  CreatorTarget,
  KeywordTarget,
  MonitorCategory,
  NonAggregatePlatformId,
  PlatformSetting
} from "@/lib/types";

const PLATFORM_META: Record<
  NonAggregatePlatformId,
  {
    label: string;
    recommendation: string;
  }
> = {
  douyin: {
    label: "抖音",
    recommendation: "适合追高热钩子和短视频表达。"
  },
  xiaohongshu: {
    label: "小红书",
    recommendation: "适合看方法论包装和图文标题结构。"
  },
  weibo: {
    label: "微博",
    recommendation: "适合观察热点扩散与讨论拐点。"
  },
  bilibili: {
    label: "B站",
    recommendation: "适合补齐深度讲解和长内容样本。"
  },
  twitter: {
    label: "Twitter/X",
    recommendation: "适合跟踪海外讨论、开发者动态和实时观点。"
  },
  wechat: {
    label: "公众号",
    recommendation: "适合补齐深度文章和观点型样本。"
  }
};

const DEFAULT_PLATFORM_IDS: NonAggregatePlatformId[] = ["wechat"];

function normalizeList(value: string) {
  return value
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSlug(value: string) {
  const asciiSlug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return asciiSlug || `category-${Date.now()}`;
}

function buildPlatformSetting(
  platformId: NonAggregatePlatformId,
  keywordCount: number,
  creatorCount: number,
  index: number
): PlatformSetting {
  const meta = PLATFORM_META[platformId];

  return {
    id: platformId,
    label: meta.label,
    enabled: true,
    syncedAt: "等待首次扫描",
    keywordCount,
    creatorCount,
    successRate: Math.max(72, 86 - index * 3),
    qualityRate: Math.max(68, 82 - index * 2),
    recommendation: meta.recommendation
  };
}

function buildKeywordTarget(
  label: string,
  platformIds: NonAggregatePlatformId[],
  index: number
): KeywordTarget {
  return {
    id: `keyword-${toSlug(label)}-${index}`,
    label,
    platformIds,
    hitCount: 0,
    qualityRate: 0,
    qualityHint: "等待首次扫描后生成命中反馈。",
    overlapHint: "原型阶段先用前端状态保存，后续可接后端去重。"
  };
}

function buildCreatorTarget(
  name: string,
  platformId: NonAggregatePlatformId,
  index: number
): CreatorTarget {
  return {
    id: `creator-${toSlug(name)}-${index}`,
    name,
    platformId,
    profile: "新加入的目标账号，等待首次采集画像。",
    updatedAt: "未同步",
    hotContentStatus: "暂无高热样本",
    weeklyUpdateCount: 0,
    hotSampleContribution: 0,
    healthHint: "先完成一轮扫描，再判断是否长期保留。"
  };
}

export function createEmptyCategoryDraft(): CreateCategoryDraft {
  return {
    name: "",
    platformIds: [...DEFAULT_PLATFORM_IDS],
    keywords: "",
    creators: ""
  };
}

export function buildCategoryFromDraft(draft: CreateCategoryDraft): MonitorCategory {
  const platformIds =
    draft.platformIds.length > 0 ? draft.platformIds : [...DEFAULT_PLATFORM_IDS];
  const keywords = normalizeList(draft.keywords);
  const creators = normalizeList(draft.creators);
  const keywordLabels = keywords.length > 0 ? keywords : ["待补充关键词"];
  const creatorNames = creators.length > 0 ? creators : ["待补充账号"];
  const today = new Date().toISOString().slice(0, 10);
  const primaryKeyword = keywordLabels[0];
  const primaryCreator = creatorNames[0];

  return {
    id: `category-${toSlug(draft.name)}-${Date.now()}`,
    name: draft.name.trim(),
    description:
      keywordLabels.length > 0
        ? `围绕 ${keywordLabels.slice(0, 2).join(" / ")} 等线索补齐内容监控与选题判断。`
        : "新建分类，等待补齐关键词和目标账号后开始扫描。",
    lastRunAt: "等待首次扫描",
    todayCollectionCount: 0,
    reportStatus: "待生成日报",
    overview: {
      platformCount: platformIds.length,
      keywordCount: keywords.length,
      creatorCount: creators.length,
      updatedAt: "刚刚创建"
    },
    actionItems: [],
    reports: [
      {
        date: today,
        hotSummary: "新分类已创建，等待首轮扫描后生成热点摘要。",
        focusSummary: "先确认关键词与目标账号是否覆盖到你最关心的内容源。",
        patternSummary: "暂无跨平台模式结论，建议先看内容 Tab 的实际结果。",
        insightSummary: "首轮采集完成后，这里会生成可追溯的选题判断。",
        platformsInvolved: platformIds.length,
        topicCount: 0,
        topics: []
      }
    ],
    content: [],
    settings: {
      platforms: platformIds.map((platformId, index) =>
        buildPlatformSetting(platformId, keywords.length, creators.length, index)
      ),
      keywords: keywordLabels.map((label, index) =>
        buildKeywordTarget(label, platformIds, index)
      ),
      creators: creatorNames.map((name, index) =>
        buildCreatorTarget(name, platformIds[index % platformIds.length] ?? "wechat", index)
      ),
      schedule: {
        frequency: "每日运行一次",
        time: "08:30",
        analysisScope: "抓取最近 7 天内热度较高的内容样本",
        model: "OpenAI ChatGPT"
      }
    },
    decisionSignals: {
      priorityDistribution: [
        `优先补齐 ${primaryKeyword} 的首轮内容样本`,
        "确认平台覆盖是否需要继续扩展",
        `观察 ${primaryCreator} 是否值得长期跟踪`
      ],
      anomalySignals: ["暂无异常波动，等待首次扫描。"],
      risingTopics: ["首次扫描后展示连续上升话题。"],
      emergingKeywords: keywordLabels.slice(0, 3),
      reviewItems: ["请先确认关键词和目标账号是否需要继续收缩或扩展。"]
    }
  };
}
