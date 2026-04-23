import {
  ActionItem,
  ContentItem,
  CreatorTarget,
  DailyReport,
  DecisionSignals,
  InsightEvidence,
  KeywordTarget,
  MonitorCategory,
  PlatformId,
  PlatformSetting,
  ScheduleConfig,
  TopicIdea
} from "@/lib/types";

type NonAggregatePlatformId = Exclude<PlatformId, "all">;

function makeContent(
  id: string,
  date: string,
  timeOfDay: ContentItem["timeOfDay"],
  title: string,
  platformId: NonAggregatePlatformId,
  author: string,
  publishedAt: string,
  heatScore: number,
  likes: string,
  comments: string,
  saves: string,
  matchedTargets: string[],
  aiSummary: string,
  linkedTopicIds: string[],
  includedInDailyReport = true,
  inTopicPool = false
): ContentItem {
  return {
    id,
    date,
    timeOfDay,
    title,
    platformId,
    author,
    publishedAt,
    heatScore,
    metrics: { likes, comments, saves },
    matchedTargets,
    aiSummary,
    linkedTopicIds,
    includedInDailyReport,
    inTopicPool
  };
}

function makeEvidence(
  id: string,
  contentIds: string[],
  sourcePlatformIds: NonAggregatePlatformId[],
  summary: string
): InsightEvidence {
  return {
    id,
    contentIds,
    sourcePlatformIds,
    summary
  };
}

function makeTopic(
  id: string,
  title: string,
  brief: string,
  whyNow: string,
  hook: string,
  growthSpace: string,
  sourcePlatforms: NonAggregatePlatformId[],
  evidenceCount: number,
  coreSamples: string[],
  burstWindow: string,
  streakDays: number,
  confidence: string,
  evidence: InsightEvidence[]
): TopicIdea {
  return {
    id,
    title,
    brief,
    whyNow,
    hook,
    growthSpace,
    sourcePlatforms,
    evidenceCount,
    coreSamples,
    burstWindow,
    streakDays,
    confidence,
    evidence
  };
}

function makeReport(
  date: string,
  hotSummary: string,
  focusSummary: string,
  patternSummary: string,
  insightSummary: string,
  topics: TopicIdea[]
): DailyReport {
  return {
    date,
    hotSummary,
    focusSummary,
    patternSummary,
    insightSummary,
    platformsInvolved: new Set(topics.flatMap((topic) => topic.sourcePlatforms)).size,
    topicCount: topics.length,
    topics
  };
}

function makePlatformSetting(
  id: NonAggregatePlatformId,
  label: string,
  enabled: boolean,
  syncedAt: string,
  keywordCount: number,
  creatorCount: number,
  successRate: number,
  qualityRate: number,
  recommendation: string
): PlatformSetting {
  return {
    id,
    label,
    enabled,
    syncedAt,
    keywordCount,
    creatorCount,
    successRate,
    qualityRate,
    recommendation
  };
}

function makeKeywordTarget(
  id: string,
  label: string,
  platformIds: NonAggregatePlatformId[],
  hitCount: number,
  qualityRate: number,
  qualityHint: string,
  overlapHint: string
): KeywordTarget {
  return {
    id,
    label,
    platformIds,
    hitCount,
    qualityRate,
    qualityHint,
    overlapHint
  };
}

function makeCreatorTarget(
  id: string,
  name: string,
  platformId: NonAggregatePlatformId,
  profile: string,
  updatedAt: string,
  hotContentStatus: string,
  weeklyUpdateCount: number,
  hotSampleContribution: number,
  healthHint: string
): CreatorTarget {
  return {
    id,
    name,
    platformId,
    profile,
    updatedAt,
    hotContentStatus,
    weeklyUpdateCount,
    hotSampleContribution,
    healthHint
  };
}

function makeActionItem(
  id: string,
  type: ActionItem["type"],
  title: string,
  summary: string,
  priority: ActionItem["priority"],
  sourceLabel: string,
  evidenceLabel: string,
  linkedTopicIds: string[]
): ActionItem {
  return {
    id,
    type,
    title,
    summary,
    priority,
    sourceLabel,
    evidenceLabel,
    linkedTopicIds
  };
}

function makeScheduleConfig(
  frequency: string,
  time: string,
  analysisScope: string,
  model: string
): ScheduleConfig {
  return {
    frequency,
    time,
    analysisScope,
    model
  };
}

const claudecodeWorkflowTopic = makeTopic(
  "cc-topic-0326-workflow",
  "Claude Code 三平台工作流拆解",
  "围绕 Claude Code 的提示词工程、任务拆解和复盘模板，整理成适合多平台复用的内容结构。",
  "小红书图文、B 站长视频和抖音口播同时出现同一套操作逻辑，说明用户对可复制工作流的需求在上升。",
  "同一套 Claude Code 方法，为什么能在三个平台拆成三种爆款表达？",
  "可以继续扩展成「从 0 到 1 的工作流模板」和「团队协作版落地清单」两条分支。",
  ["xiaohongshu", "bilibili", "douyin"],
  1,
  ["小红书图文复盘", "B 站长视频讲解", "抖音口播拆解"],
  "24-48 小时",
  4,
  "高",
  [
    makeEvidence(
      "cc-evidence-0326-workflow",
      ["cc-xhs-0326-1", "cc-bili-0326-1", "cc-dy-0326-1"],
      ["xiaohongshu", "bilibili", "douyin"],
      "三端内容都在强调 Claude Code 的提示词模板、任务链路和可复用工作流。"
    )
  ]
);

const claudecodeToolchainTopic = makeTopic(
  "cc-topic-0326-toolchain",
  "Claude Code + MCP 工具链扩展",
  "把 Claude Code 作为入口，串起 MCP、脚手架生成和自动化复盘，形成更完整的生产力工具链。",
  "评论区开始出现「能不能直接给我一套搭建方案」的需求，说明选题已经从概念讨论走向实操配置。",
  "如果只讲 Claude Code 本身，价值会很快见顶；把工具链讲完整，才能接住持续提问。",
  "可延展为 MCP 资源清单、模板库推荐和新手配置指南。",
  ["bilibili", "weibo"],
  1,
  ["MCP 配置截图", "脚手架生成演示"],
  "48-72 小时",
  3,
  "中高",
  [
    makeEvidence(
      "cc-evidence-0326-toolchain",
      ["cc-bili-0326-2", "cc-weibo-0326-1"],
      ["bilibili", "weibo"],
      "B 站演示型内容和微博讨论型内容都在追问如何把 Claude Code 接进现有工作流。"
    )
  ]
);

const claudecodePromptTopic = makeTopic(
  "cc-topic-0325-prompt-library",
  "Claude Code 提示词模板库",
  "把高频需求拆成可复制的提示词模板，适合做系列化选题和收藏导向内容。",
  "模板型内容天然适合被收藏和转发，而且更容易引导用户在评论区追问补充版本。",
  "用户不是只想看演示，而是想直接拿走一套能落地的模板。",
  "可继续拆成个人版、团队版、项目管理版三个子栏目。",
  ["xiaohongshu", "weibo"],
  1,
  ["模板截图", "评论区高频提问"],
  "72 小时",
  3,
  "中",
  [
    makeEvidence(
      "cc-evidence-0325-prompt-library",
      ["cc-xhs-0325-1", "cc-weibo-0325-1"],
      ["xiaohongshu", "weibo"],
      "两端都在强调模板化复用，且评论区反复要求补充指令范式。"
    )
  ]
);

const claudecodePlatforms = [
  makePlatformSetting("douyin", "抖音", true, "2026-03-26 20:10", 2, 1, 81, 78, "继续保留短口播样本，优先做强结论和强对比。"),
  makePlatformSetting("xiaohongshu", "小红书", true, "2026-03-26 20:10", 3, 2, 86, 84, "继续强化图文模板感和收藏价值。"),
  makePlatformSetting("weibo", "微博", true, "2026-03-26 20:10", 1, 1, 72, 70, "用于承接讨论和概念延展，避免堆砌教程。"),
  makePlatformSetting("bilibili", "B 站", true, "2026-03-26 20:10", 2, 1, 89, 87, "继续产出过程型内容，适合做完整演示和复盘。")
] satisfies PlatformSetting[];

const claudecodeKeywords = [
  makeKeywordTarget("cc-keyword-1", "Claude Code", ["xiaohongshu", "bilibili", "douyin", "weibo"], 18, 88, "覆盖稳定，带动多平台同步发酵。", "与 MCP、提示词模板高度重叠。"),
  makeKeywordTarget("cc-keyword-2", "提示词模板", ["xiaohongshu", "weibo"], 14, 84, "收藏型内容表现稳定，适合做系列。", "与工作流拆解互相强化。"),
  makeKeywordTarget("cc-keyword-3", "工作流拆解", ["bilibili", "douyin"], 11, 79, "更适合过程型演示和长短视频联动。", "与产品页复刻、实操记录高度重叠。"),
  makeKeywordTarget("cc-keyword-4", "MCP", ["bilibili", "weibo"], 9, 75, "适合作为工具链延展主题。", "容易和配置清单、自动化接入互相交叉。")
] satisfies KeywordTarget[];

const claudecodeCreators = [
  makeCreatorTarget("cc-creator-1", "橙子做选题", "xiaohongshu", "偏模板化输出，擅长把复杂工作流拆成图文清单。", "2026-03-26 18:20", "持续产出高收藏样本", 4, 3, "选题稳定，但需要持续补足案例颗粒度。"),
  makeCreatorTarget("cc-creator-2", "程序员阿泽", "bilibili", "长视频演示型创作者，喜欢从复刻项目切入。", "2026-03-26 18:20", "视频完播率良好", 2, 2, "内容质量高，适合继续跟进完整过程。"),
  makeCreatorTarget("cc-creator-3", "阿野效率实验室", "douyin", "短视频口播风格，结论先行，节奏很快。", "2026-03-26 18:20", "传播效率强", 5, 1, "适合做流量入口，但需要补充深度承接。")
] satisfies CreatorTarget[];

const claudecodeActionItems = [
  makeActionItem(
    "cc-action-1",
    "topic",
    "继续追踪 Claude Code 工作流拆解",
    "优先把三平台共通的工作流路径整理成系列选题，方便快速复用到不同内容形态。",
    "P1",
    "日报热点",
    "3 条跨平台样本同时抬头",
    ["cc-topic-0326-workflow"]
  ),
  makeActionItem(
    "cc-action-2",
    "signal",
    "补充 MCP 工具链相关样本",
    "关注用户是否开始从 Claude Code 本身转向工具链和配置方法，避免选题停留在概念层。",
    "P2",
    "评论区追问",
    "多条内容要求完整搭建方案",
    ["cc-topic-0326-toolchain"]
  ),
  makeActionItem(
    "cc-action-3",
    "review",
    "核对模板类标题的真实性表达",
    "模板型选题容易过度包装，后续需要保持实操感，避免只剩标题党。",
    "P3",
    "选题复核",
    "收藏率高但落地感参差",
    ["cc-topic-0325-prompt-library"]
  )
] satisfies ActionItem[];

const claudecodeContent = [
  makeContent(
    "cc-xhs-0326-1",
    "2026-03-26",
    "上午",
    "Claude Code 提示词模板：3 步把需求拆成可执行任务",
    "xiaohongshu",
    "橙子做选题",
    "2026-03-26 09:20",
    92,
    "3.8k",
    "142",
    "1.2k",
    ["提示词模板", "任务拆解", "Claude Code"],
    "把需求拆解、模板复用和工作流结构讲得很清楚，收藏意图很强。",
    ["cc-topic-0326-workflow"],
    true,
    true
  ),
  makeContent(
    "cc-bili-0326-1",
    "2026-03-26",
    "下午",
    "我用 Claude Code 复刻了一个产品页，顺手整理了提示词链路",
    "bilibili",
    "程序员阿泽",
    "2026-03-26 11:05",
    88,
    "12.4k",
    "318",
    "2.1k",
    ["工作流复盘", "提示词链路", "产品页复刻"],
    "从需求到产物的完整过程讲得很完整，适合承接想看实操的开发者。",
    ["cc-topic-0326-workflow"],
    true,
    true
  ),
  makeContent(
    "cc-xhs-0325-1",
    "2026-03-25",
    "上午",
    "Claude Code 提示词模板库：团队协作也能直接复用",
    "xiaohongshu",
    "阿梨编辑室",
    "2026-03-25 09:05",
    76,
    "1.9k",
    "96",
    "511",
    ["团队协作", "模板库", "Claude Code"],
    "模板导向很强，评论区对完整版本和场景细分的需求明显。",
    ["cc-topic-0325-prompt-library"],
    true,
    true
  ),
  makeContent(
    "cc-dy-0326-1",
    "2026-03-26",
    "晚上",
    "30 秒看懂 Claude Code 为什么适合复杂需求拆解",
    "douyin",
    "阿野效率实验室",
    "2026-03-26 19:40",
    85,
    "8.6k",
    "264",
    "931",
    ["复杂需求", "效率工具", "Claude Code"],
    "短视频把复杂需求拆解成一句结论，适合引流到更完整的工作流内容。",
    ["cc-topic-0326-workflow"],
    true,
    true
  ),
  makeContent(
    "cc-xhs-0326-2",
    "2026-03-26",
    "下午",
    "Claude Code 配置清单：适合新手直接照着做",
    "xiaohongshu",
    "栀子笔记",
    "2026-03-26 14:10",
    78,
    "2.1k",
    "88",
    "654",
    ["配置清单", "新手上手", "Claude Code"],
    "更偏实操清单，方便后续拆成系列图文。",
    ["cc-topic-0326-toolchain"],
    false,
    true
  ),
  makeContent(
    "cc-bili-0326-2",
    "2026-03-26",
    "上午",
    "Claude Code 接入 MCP 后，我把重复配置自动化了",
    "bilibili",
    "自动化木子",
    "2026-03-26 10:30",
    81,
    "9.7k",
    "203",
    "1.5k",
    ["MCP", "自动化", "重复配置"],
    "更强调效率收益和实际节省时间的感受。",
    ["cc-topic-0326-toolchain"],
    false,
    true
  ),
  makeContent(
    "cc-weibo-0326-1",
    "2026-03-26",
    "晚上",
    "Claude Code 配合 MCP 的效率提升到底有多明显",
    "weibo",
    "效率观察员",
    "2026-03-26 20:05",
    73,
    "1.1k",
    "64",
    "214",
    ["MCP", "效率提升", "工具链"],
    "微博更像是讨论入口，用户在追问完整配置和真实使用成本。",
    ["cc-topic-0326-toolchain"],
    true,
    false
  ),
  makeContent(
    "cc-weibo-0325-1",
    "2026-03-25",
    "晚上",
    "Claude Code 的提示词库到底该怎么整理才不乱",
    "weibo",
    "工具控小周",
    "2026-03-25 20:40",
    69,
    "860",
    "57",
    "188",
    ["提示词库", "整理方法", "Claude Code"],
    "讨论更关注整理方法和可维护性，适合做方法论补充。",
    ["cc-topic-0325-prompt-library"],
    true,
    false
  )
] satisfies ContentItem[];

const claudecodeReports = [
  makeReport(
    "2026-03-26",
    "Claude Code 相关内容在小红书、B 站和抖音继续升温，工作流拆解和模板复用是最集中的表达方向。",
    "今天优先推进「三平台工作流拆解」和「工具链扩展」两条线，分别覆盖方法论和实操配置。",
    "图文更偏清单和模板，视频更偏过程演示；同一主题在不同平台的叙事方式差异明显。",
    "用户对能直接复用的工作流和配置方案兴趣更高，纯概念内容容易被快速略过。",
    [claudecodeWorkflowTopic, claudecodeToolchainTopic]
  ),
  makeReport(
    "2026-03-25",
    "前一天的讨论集中在 Claude Code 提示词模板和协作链路，收藏型内容表现更稳。",
    "适合继续补充可下载模板和团队协作案例，增强选题的可操作性。",
    "评论区里已经开始出现对完整范式和落地步骤的追问，说明内容进入延展阶段。",
    "模板内容的价值不只在标题，还在于能否提供可复制的结构和场景说明。",
    [claudecodePromptTopic]
  )
] satisfies DailyReport[];

const claudecodeSchedule = makeScheduleConfig("每日 20:10", "20:10", "覆盖 Claude Code、提示词工程、工作流复盘", "GPT-5");

const vibecodingDemoTopic = makeTopic(
  "vc-topic-0326-demo-workflow",
  "Vibe Coding 演示流工作法",
  "围绕 Vibe Coding 的「先演示、后解释」内容结构，提炼适合视频和图文混投的表达套路。",
  "这类内容在开发者圈层里正处于新鲜期，用户更愿意看真实过程而不是空泛概念。",
  "Vibe Coding 为什么更适合先拍过程，再补逻辑？",
  "可以扩展到个人开发演示、产品原型展示和交付型内容三条线。",
  ["douyin", "bilibili", "xiaohongshu"],
  1,
  ["演示流程", "结果前置", "过程记录"],
  "24 小时",
  5,
  "高",
  [
    makeEvidence(
      "vc-evidence-0326-demo",
      ["vc-dy-0326-1", "vc-bili-0326-1", "vc-xhs-0326-1"],
      ["douyin", "bilibili", "xiaohongshu"],
      "三端都在用演示过程和结果对比来讲 Vibe Coding 的应用价值。"
    )
  ]
);

const vibecodingIndieTopic = makeTopic(
  "vc-topic-0326-indie-build",
  "独立开发者的 Vibe Build 叙事",
  "把 Vibe Coding 放进独立开发者叙事，突出效率、审美和低成本验证的组合优势。",
  "当内容从工具介绍转向「如何更快做出一个能卖的产品」，传播会更接近目标用户。",
  "独立开发者到底是在写代码，还是在把想法快速做成能验证的成品？",
  "可以衍生出产品原型、收入验证、周更进度三类栏目。",
  ["xiaohongshu", "weibo"],
  1,
  ["原型截图", "进度周报"],
  "48 小时",
  4,
  "中高",
  [
    makeEvidence(
      "vc-evidence-0326-indie",
      ["vc-xhs-0326-2", "vc-weibo-0326-1"],
      ["xiaohongshu", "weibo"],
      "小红书侧重过程整理，微博侧重观点讨论，形成双平台互补。"
    )
  ]
);

const vibecodingTasteTopic = makeTopic(
  "vc-topic-0324-taste-tools",
  "审美导向的 AI 工具清单",
  "从 Vibe Coding 延展到审美、设计和体验取向的工具清单，适合做收藏型内容。",
  "当用户开始在意审美和交付质感，纯代码工具就不够了，需要加入设计、排版和配色建议。",
  "AI 工具越来越多，真正能拉开差距的是审美还是执行速度？",
  "可进一步拆为设计协同、前端原型和品牌物料三个方向。",
  ["xiaohongshu", "bilibili"],
  1,
  ["工具对比截图", "审美改造前后对照"],
  "72 小时",
  2,
  "中",
  [
    makeEvidence(
      "vc-evidence-0324-taste",
      ["vc-xhs-0324-1", "vc-bili-0324-1"],
      ["xiaohongshu", "bilibili"],
      "更偏工具清单和审美对比，适合做收藏导向的延展内容。"
    )
  ]
);

const vibecodingPlatforms = [
  makePlatformSetting("douyin", "抖音", true, "2026-03-26 19:55", 2, 1, 83, 80, "保留高密度演示内容，强调结果前置。"),
  makePlatformSetting("xiaohongshu", "小红书", true, "2026-03-26 19:55", 3, 1, 85, 82, "强化审美和复盘笔记，继续做收藏向内容。"),
  makePlatformSetting("weibo", "微博", true, "2026-03-26 19:55", 1, 1, 68, 69, "用于承接观点讨论和圈层扩散。"),
  makePlatformSetting("bilibili", "B 站", true, "2026-03-26 19:55", 2, 1, 88, 86, "继续做完整过程和复盘型内容。")
] satisfies PlatformSetting[];

const vibecodingKeywords = [
  makeKeywordTarget("vc-keyword-1", "Vibe Coding", ["xiaohongshu", "bilibili", "douyin", "weibo"], 16, 87, "三端均有稳定样本，适合做主线主题。", "与独立开发、原型演示高度交叉。"),
  makeKeywordTarget("vc-keyword-2", "演示流", ["douyin", "bilibili"], 13, 83, "过程展示效果最好，适合做系列。", "与周报、原型演示互补。"),
  makeKeywordTarget("vc-keyword-3", "独立开发", ["xiaohongshu", "weibo"], 11, 79, "更容易引出商业化和产品验证话题。", "与周报、收入验证等内容有联动。"),
  makeKeywordTarget("vc-keyword-4", "审美", ["xiaohongshu", "bilibili"], 9, 74, "适合收藏型和对比型内容。", "与工具筛选、界面改造交叉较多。")
] satisfies KeywordTarget[];

const vibecodingCreators = [
  makeCreatorTarget("vc-creator-1", "前端小岑", "douyin", "擅长短视频演示，喜欢先给结果再补过程。", "2026-03-26 18:40", "短内容转化稳定", 5, 2, "适合做流量入口，但需要补足延展内容。"),
  makeCreatorTarget("vc-creator-2", "独立开发者林木", "bilibili", "过程记录型创作者，擅长复盘和完整演示。", "2026-03-26 18:40", "完播率良好", 3, 3, "适合继续跟踪项目式内容。"),
  makeCreatorTarget("vc-creator-3", "墨白设计笔记", "xiaohongshu", "偏审美和视觉表达，收藏型内容更强。", "2026-03-26 18:40", "收藏率高", 4, 1, "内容气质稳定，但需要更明确的实操锚点。")
] satisfies CreatorTarget[];

const vibecodingActionItems = [
  makeActionItem(
    "vc-action-1",
    "topic",
    "整理演示流工作法为系列栏目",
    "把「先演示、后解释」的表达套路整理成稳定栏目，方便持续追更。",
    "P1",
    "日报洞察",
    "多平台同时出现过程展示",
    ["vc-topic-0326-demo-workflow"]
  ),
  makeActionItem(
    "vc-action-2",
    "signal",
    "追踪独立开发叙事中的商业化线索",
    "关注内容是否已经从工具炫技转向产品验证、收入验证和周报式记录。",
    "P2",
    "趋势信号",
    "用户开始问能否直接做成产品",
    ["vc-topic-0326-indie-build"]
  ),
  makeActionItem(
    "vc-action-3",
    "review",
    "检查审美导向内容的表达密度",
    "审美型选题很容易写得过散，后续需要保留明确的工具和场景锚点。",
    "P3",
    "内容复核",
    "收藏型素材较多",
    ["vc-topic-0324-taste-tools"]
  )
] satisfies ActionItem[];

const vibecodingContent = [
  makeContent(
    "vc-dy-0326-1",
    "2026-03-26",
    "上午",
    "Vibe Coding 先演示后解释，为什么更容易让人看懂",
    "douyin",
    "前端小岑",
    "2026-03-26 09:50",
    90,
    "5.1k",
    "180",
    "760",
    ["演示流", "先结果后过程", "Vibe Coding"],
    "短视频把流程和结果分开讲，转化很适合。",
    ["vc-topic-0326-demo-workflow"],
    true,
    true
  ),
  makeContent(
    "vc-bili-0326-1",
    "2026-03-26",
    "下午",
    "我用 Vibe Coding 做了一个周末原型，过程比结果更有看点",
    "bilibili",
    "独立开发者林木",
    "2026-03-26 13:40",
    87,
    "10.3k",
    "246",
    "1.8k",
    ["原型开发", "过程记录", "独立开发"],
    "视频重点是过程拆解，适合承接想看完整方法的人。",
    ["vc-topic-0326-demo-workflow"],
    true,
    true
  ),
  makeContent(
    "vc-xhs-0326-1",
    "2026-03-26",
    "晚上",
    "Vibe Coding 的审美感，决定了你做出来的东西能不能被收藏",
    "xiaohongshu",
    "墨白设计笔记",
    "2026-03-26 19:10",
    84,
    "2.7k",
    "102",
    "1.1k",
    ["审美", "收藏型内容", "Vibe Coding"],
    "图文更强调风格和结果展示，收藏意图比较明确。",
    ["vc-topic-0326-demo-workflow"],
    true,
    true
  ),
  makeContent(
    "vc-xhs-0326-2",
    "2026-03-26",
    "下午",
    "独立开发者的 Vibe Build 周报，记录比炫技更重要",
    "xiaohongshu",
    "周更工程师",
    "2026-03-26 15:30",
    79,
    "1.6k",
    "74",
    "532",
    ["周报", "独立开发", "Vibe Build"],
    "更偏持续记录和产品验证，很适合做系列化内容。",
    ["vc-topic-0326-indie-build"],
    true,
    true
  ),
  makeContent(
    "vc-weibo-0326-1",
    "2026-03-26",
    "晚上",
    "Vibe Coding 真正的门槛不是代码，是审美和判断力",
    "weibo",
    "产品观察员",
    "2026-03-26 20:20",
    70,
    "920",
    "58",
    "198",
    ["审美", "判断力", "工具筛选"],
    "微博讨论更偏观点型，适合承接扩散和观点碰撞。",
    ["vc-topic-0326-indie-build"],
    true,
    false
  ),
  makeContent(
    "vc-xhs-0324-1",
    "2026-03-24",
    "上午",
    "AI 工具清单怎么选，先看审美再看效率",
    "xiaohongshu",
    "设计编辑芮芮",
    "2026-03-24 09:15",
    74,
    "1.4k",
    "66",
    "488",
    ["工具清单", "审美", "AI 选型"],
    "偏收藏型内容，适合在后续补充更完整的对比框架。",
    ["vc-topic-0324-taste-tools"],
    true,
    true
  ),
  makeContent(
    "vc-bili-0324-1",
    "2026-03-24",
    "下午",
    "审美导向的 AI 工具箱，我是怎么筛到最后 5 个的",
    "bilibili",
    "工具评测阿宁",
    "2026-03-24 14:50",
    76,
    "7.9k",
    "188",
    "1.2k",
    ["工具筛选", "审美改造", "AI 工具箱"],
    "长视频更适合展示筛选逻辑和前后对比。",
    ["vc-topic-0324-taste-tools"],
    true,
    true
  )
] satisfies ContentItem[];

const vibecodingReports = [
  makeReport(
    "2026-03-26",
    "Vibe Coding 的演示流内容在抖音和 B 站表现最强，小红书则更适合承接审美和复盘笔记。",
    "优先推进「演示流工作法」与「独立开发者叙事」两条线，让内容既有过程也有落点。",
    "短内容先给结论，长内容再补过程；如果只谈工具，很难形成连续讨论。",
    "用户对「更快做成一个能看的原型」兴趣高于单纯工具介绍，说明内容已经进入成品导向阶段。",
    [vibecodingDemoTopic, vibecodingIndieTopic]
  ),
  makeReport(
    "2026-03-24",
    "前期更偏工具清单和审美改造，内容收藏率不错，但讨论深度有限。",
    "适合继续补充前后对比案例和更具体的落地步骤。",
    "工具越多，用户越在意如何选型和如何判断是否适合自己。",
    "审美导向内容需要更强的案例和对比，否则容易停留在概念层。",
    [vibecodingTasteTopic]
  )
] satisfies DailyReport[];

const vibecodingSchedule = makeScheduleConfig("每日 20:05", "20:05", "覆盖 Vibe Coding、独立开发、审美工具链", "GPT-5");

function buildCategory(category: Omit<MonitorCategory, "overview" | "todayCollectionCount">): MonitorCategory {
  return {
    ...category,
    todayCollectionCount: category.content.length,
    overview: {
      platformCount: category.settings.platforms.length,
      keywordCount: category.settings.keywords.length,
      creatorCount: category.settings.creators.length,
      updatedAt: category.lastRunAt
    }
  };
}

export const monitorCategories: MonitorCategory[] = [
  buildCategory({
    id: "claudecode",
    name: "ClaudeCode 选题监控",
    description: "围绕 Claude Code、提示词工程和效率型工作流的多平台选题监控。",
    lastRunAt: "2026-03-26 20:10",
    reportStatus: "已完成",
    actionItems: claudecodeActionItems,
    reports: claudecodeReports,
    content: claudecodeContent,
    settings: {
      platforms: claudecodePlatforms,
      keywords: claudecodeKeywords,
      creators: claudecodeCreators,
      schedule: claudecodeSchedule
    },
    decisionSignals: {
      priorityDistribution: ["P1 2 条：工作流拆解", "P2 1 条：工具链扩展", "P3 1 条：模板复核"],
      anomalySignals: ["评论区连续追问配置方案", "模板型内容收藏率明显高于平均"],
      risingTopics: ["Claude Code 工作流", "MCP 工具链", "提示词模板库"],
      emergingKeywords: ["工作流拆解", "配置清单", "复盘模板"],
      reviewItems: ["是否要补一条新手配置指南", "模板类标题需控制夸张度"]
    }
  }),
  buildCategory({
    id: "vibecoding",
    name: "VibeCoding 选题监控",
    description: "围绕 Vibe Coding、独立开发和审美导向工具链的内容监控。",
    lastRunAt: "2026-03-26 20:05",
    reportStatus: "已完成",
    actionItems: vibecodingActionItems,
    reports: vibecodingReports,
    content: vibecodingContent,
    settings: {
      platforms: vibecodingPlatforms,
      keywords: vibecodingKeywords,
      creators: vibecodingCreators,
      schedule: vibecodingSchedule
    },
    decisionSignals: {
      priorityDistribution: ["P1 2 条：演示流工作法", "P2 1 条：商业化叙事", "P3 1 条：审美内容复核"],
      anomalySignals: ["抖音和 B 站同时出现过程型爆点", "独立开发叙事开始带出产品验证话题"],
      risingTopics: ["演示流工作法", "独立开发周报", "审美导向工具清单"],
      emergingKeywords: ["先演示后解释", "Vibe Build", "原型验证"],
      reviewItems: ["是否需要把审美内容拆成工具与案例两栏", "过度抽象的工具讨论要降噪"]
    }
  })
];
