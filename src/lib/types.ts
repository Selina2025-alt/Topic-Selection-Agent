export type TabId = "report" | "content" | "settings";
export type ReportView = "daily" | "summary";
export type PlatformId =
  | "all"
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "bilibili"
  | "twitter"
  | "wechat";
export type NonAggregatePlatformId = Exclude<PlatformId, "all">;
export type TimeOfDay = "上午" | "下午" | "晚上";
export type ContentRangeId = "24h" | "3d" | "7d";
export type ContentPoolView = "all" | "hot" | "pool";
export type ContentFocusMode = "evidence" | "samples" | "timeline" | null;

export interface ActionItem {
  id: string;
  type: "topic" | "signal" | "review";
  title: string;
  summary: string;
  priority: "P1" | "P2" | "P3";
  sourceLabel: string;
  evidenceLabel: string;
  linkedTopicIds: string[];
}

export interface InsightEvidence {
  id: string;
  contentIds: string[];
  sourcePlatformIds: NonAggregatePlatformId[];
  summary: string;
}

export interface TopicIdea {
  id: string;
  title: string;
  brief: string;
  whyNow: string;
  hook: string;
  growthSpace: string;
  sourcePlatforms: NonAggregatePlatformId[];
  evidenceCount: number;
  coreSamples: string[];
  burstWindow: string;
  streakDays: number;
  confidence: string;
  evidence: InsightEvidence[];
}

export interface DailyReport {
  date: string;
  hotSummary: string;
  focusSummary: string;
  patternSummary: string;
  insightSummary: string;
  platformsInvolved: number;
  topicCount: number;
  topics: TopicIdea[];
}

export interface ContentItem {
  id: string;
  date: string;
  timeOfDay: TimeOfDay;
  title: string;
  platformId: NonAggregatePlatformId;
  author: string;
  summary?: string;
  authorName?: string;
  authorId?: string;
  publishedAt: string;
  publishTime?: string;
  publishTimestamp?: number;
  updateTimestamp?: number;
  heatScore: number;
  metrics: {
    likes: string;
    comments: string;
    saves: string;
  };
  readCount?: number;
  likeCount?: number;
  matchedTargets: string[];
  aiSummary: string;
  keyword?: string;
  avatar?: string;
  isOriginal?: boolean;
  linkedTopicIds: string[];
  includedInDailyReport: boolean;
  inTopicPool: boolean;
  articleUrl?: string;
  sourceUrl?: string;
  shortLink?: string;
  rawOrderIndex?: number;
  sourceType?: "wechat" | "mock";
}

export interface PlatformSetting {
  id: NonAggregatePlatformId;
  label: string;
  enabled: boolean;
  syncedAt: string;
  keywordCount: number;
  creatorCount: number;
  successRate: number;
  qualityRate: number;
  recommendation: string;
}

export interface KeywordTarget {
  id: string;
  label: string;
  platformIds: NonAggregatePlatformId[];
  hitCount: number;
  qualityRate: number;
  qualityHint: string;
  overlapHint: string;
}

export interface CreatorTarget {
  id: string;
  name: string;
  platformId: NonAggregatePlatformId;
  profile: string;
  updatedAt: string;
  hotContentStatus: string;
  weeklyUpdateCount: number;
  hotSampleContribution: number;
  healthHint: string;
}

export interface ScheduleConfig {
  frequency: string;
  time: string;
  analysisScope: string;
  model: string;
}

export interface DecisionSignals {
  priorityDistribution: string[];
  anomalySignals: string[];
  risingTopics: string[];
  emergingKeywords: string[];
  reviewItems: string[];
}

export interface MonitorCategory {
  id: string;
  name: string;
  description: string;
  lastRunAt: string;
  todayCollectionCount: number;
  reportStatus: string;
  overview: {
    platformCount: number;
    keywordCount: number;
    creatorCount: number;
    updatedAt: string;
  };
  actionItems: ActionItem[];
  reports: DailyReport[];
  content: ContentItem[];
  settings: {
    platforms: PlatformSetting[];
    keywords: KeywordTarget[];
    creators: CreatorTarget[];
    schedule: ScheduleConfig;
  };
  decisionSignals: DecisionSignals;
}

export interface WorkbenchState {
  selectedCategoryId: string;
  activeTab: TabId;
  reportView: ReportView;
  selectedReportDate: string;
  selectedContentDate: string;
  selectedPlatformId: PlatformId;
  selectedContentRange: ContentRangeId;
  contentPoolView: ContentPoolView;
  contentFocusMode: ContentFocusMode;
  focusedTopicId: string | null;
  highlightedContentIds: string[];
  pooledContentIds: string[];
  pendingActionIds: string[];
}

export interface CreateCategoryDraft {
  name: string;
  platformIds: NonAggregatePlatformId[];
  keywords: string;
  creators: string;
}
