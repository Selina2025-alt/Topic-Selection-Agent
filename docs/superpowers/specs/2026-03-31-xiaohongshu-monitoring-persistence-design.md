# ContentPulse 小红书监控与多平台关键词设计

## 项目概述

本轮目标是在当前 `ContentPulse` 内容监控台上补齐“多平台关键词监控”这条核心链路，并优先实现小红书平台的数据采集、持久化与内容展示。

工具的核心不是单纯展示抓取结果，而是让内容运营人员能围绕“一个关键词在多个平台上的表现”持续收集样本、保存结果，并在内容页快速验证和刷新指定平台下的指定关键词数据。

本轮范围聚焦四件事：

1. 将关键词从简单字符串升级为可绑定多个平台的监控目标对象。
2. 接入小红书按关键词抓取笔记的服务端代理逻辑。
3. 将抓取结果保存到 SQLite，支持后续分析与重复读取。
4. 补齐设置页与内容页的一键更新逻辑，让用户可以按“当前平台 + 当前关键词”快速刷新。

## 目标与非目标

### 目标

- 设置页新增关键词时可选择多个监控平台。
- 新增关键词后，只对该关键词启用的平台执行首次抓取。
- 内容 Tab 提供一键快速更新，默认刷新当前平台下的当前关键词。
- 小红书抓取结果经服务端代理获取，不在前端暴露 token。
- 小红书和公众号抓取结果统一映射为内容模型，并优先从 SQLite 读取最近结果。
- 抓取批次、监控目标、采集内容都落到 SQLite，形成最小可用的数据闭环。

### 非目标

- 本轮不实现抖音、微博、B 站的真实采集。
- 本轮不落地定时任务调度。
- 本轮不实现基于 SQLite 的 AI 选题分析生成。
- 本轮不实现内容历史分页浏览。
- 小红书若无稳定可用的原文 URL 规则，本轮不强行实现原文直达。

## 用户场景

### 场景 1：运营新增一个多平台关键词

用户在“监控设置”中输入一个关键词，例如 `openclaw`，并勾选 `公众号` 和 `小红书`。保存后，系统会：

1. 在当前分类下创建一个关键词监控目标。
2. 记录该关键词绑定的平台集合。
3. 自动触发该关键词在公众号和小红书上的首次抓取。
4. 将抓取结果写入 SQLite。
5. 回到内容页后，可按平台筛选查看对应结果。

### 场景 2：运营在内容页快速验证当前关键词

用户在内容页切换到了 `小红书` 平台，并当前选中关键词 `openclaw`。点击“一键快速更新”后，系统只会刷新：

- 当前分类
- 当前关键词
- 当前平台

不会触发整个分类下的全量抓取。

### 场景 3：运营后续读取历史结果

用户再次进入某个分类时，不会自动重新抓取全部关键词，而是优先读取 SQLite 中最近一次的采集结果。只有用户主动新增关键词或点击快速更新时，才发起新的抓取。

## 设计原则

### 1. 关键词是监控对象，不是普通字符串

关键词必须携带自己的平台绑定关系、抓取状态和结果统计，不能继续用 `string[]` 表示。

### 2. 平台抓取走统一入口

内容采集必须收口到平台分发器，不能在页面里分散直连不同接口。后续再接抖音、微博、B 站时应只新增平台执行器，而不重写内容页逻辑。

### 3. 抓取结果必须持久化

抓取结果不能只停留在页面 state 里。SQLite 是后续分析的基础，也是避免刷新页面后丢失内容的必要条件。

### 4. 用户主动触发抓取

系统不在进入分类时自动抓取。只有在新增关键词和点击“一键快速更新”时触发抓取，避免不必要的请求和抓取量膨胀。

## 数据模型

### 分类模型升级

当前分类对象中的 `keywords: string[]` 升级为 `keywordTargets: KeywordTarget[]`。分类级平台配置仍保留，用于表达“这个分类允许哪些平台参与监控”。

```ts
type ReplicaTrackedPlatformId =
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "bilibili"
  | "twitter"
  | "wechat"
  | "zhihu";

interface KeywordTarget {
  id: string;
  keyword: string;
  enabledPlatformIds: ReplicaTrackedPlatformId[];
  createdAt: string;
  lastRunAt?: string;
  lastRunStatus?: "idle" | "running" | "success" | "failed";
  lastResultCount?: number;
}
```

### 分类级平台与关键词级平台的关系

- 分类级平台：控制该分类总体允许哪些平台参与监控。
- 关键词级平台：控制某个关键词实际绑定了哪些平台。
- 实际抓取平台集合：两者的交集。

例如：

- 分类启用了 `公众号`、`小红书`
- 关键词 `openclaw` 绑定了 `小红书`、`B站`
- 则实际抓取只会执行 `小红书`

### 统一内容模型

公众号与小红书内容统一映射到现有内容卡片可消费的模型，新增或明确以下字段：

```ts
interface CollectedContentItem {
  id: string;
  platformId: ReplicaTrackedPlatformId;
  platformLabel: string;
  keywordTargetId: string;
  categoryId: string;
  title: string;
  excerpt: string;
  author: string;
  authorId?: string;
  publishedAt: string;
  publishTimestamp: number;
  likes: number;
  comments: number;
  readsText: string;
  articleUrl?: string;
  coverUrl?: string;
  source: "api" | "database";
  sourceType: "wechat" | "xiaohongshu" | "mixed";
  rawOrderIndex?: number;
}
```

## 抓取架构

### 统一平台执行入口

新增统一抓取入口：

```ts
runPlatformKeywordSync({
  categoryId,
  keywordTargetId,
  platformId
})
```

平台分发如下：

- `wechat` -> `searchWechatArticlesSnapshotByKeyword`
- `xiaohongshu` -> `searchXiaohongshuNotesSnapshotByKeyword`

后续其他平台继续在同一层扩展。

### 触发时机

仅在两种情况下触发抓取：

1. 新增关键词并绑定平台后
2. 内容 Tab 点击“一键快速更新”时

进入分类、切换 Tab、刷新页面都不自动全量抓取。

## 小红书抓取设计

### 服务端代理

新增服务端抓取函数：

```ts
searchXiaohongshuNotesSnapshotByKeyword(keyword, page = 1, noteTime = "day")
```

通过服务端请求：

- `POST https://cn8n.com/p2/xhs/search_note_web`
- `Authorization: Bearer <token>`

默认请求体：

```json
{
  "type": 9,
  "keyword": "<keyword>",
  "page": "1",
  "sort": "comment_descending",
  "note_type": "note",
  "note_time": "day",
  "searchId": "",
  "sessionId": ""
}
```

`Authorization` token 只从服务端环境变量读取。本轮将用户提供的 Bearer token 视为服务端机密配置使用，但不会写入前端代码或提交到版本库。

### 小红书结果排序

接口原始返回顺序不作为最终展示顺序。服务端必须再做一次排序：

- 优先按 `note.timestamp desc`
- 如时间相同，按原始返回顺序稳定排序

页面显示顺序以该服务端排序结果为准。

### 小红书字段映射

至少映射以下字段：

- `id` <- `note.id`
- `platformId` <- `"xiaohongshu"`
- `platformLabel` <- `"小红书"`
- `title` <- `note.title`
- `excerpt` <- `note.desc || note.abstract_show || ""`
- `author` <- `note.user.nickname`
- `authorId` <- `note.user.userid`
- `publishedAt` <- `note.timestamp` 格式化后的时间
- `publishTimestamp` <- `note.timestamp`
- `likes` <- `note.liked_count`
- `comments` <- `note.comments_count`
- `readsText` <- `"--"`
- `coverUrl` <- `note.images_list[0].url || note.images_list[0].url_size_large`

### 小红书原文链接

当前提供的接口返回结构中未给出稳定可用的 Web 笔记详情链接字段。本轮策略：

- SQLite 中仍保存 `note.id`、用户 `red_id`、`userid`、封面、图片等原始关键字段。
- 前端如无法构建稳定笔记链接，则不展示“查看原文”按钮。
- UI 上需保证小红书内容卡不会伪造不可用链接。

后续如果补充详情页接口或稳定 URL 规则，再补原文直达。

## SQLite 持久化设计

### 目标

SQLite 用于保存：

1. 关键词监控目标
2. 每次抓取批次
3. 各平台采集内容

### 表结构

#### `keyword_targets`

保存关键词配置。

- `id`
- `category_id`
- `keyword`
- `enabled_platform_ids_json`
- `created_at`
- `last_run_at`
- `last_run_status`
- `last_result_count`

#### `sync_runs`

保存抓取批次。

- `id`
- `category_id`
- `keyword_target_id`
- `platform_id`
- `status`
- `started_at`
- `finished_at`
- `result_count`
- `error_message`

#### `collected_contents`

保存采集结果。

- `id`
- `platform_id`
- `content_id`
- `category_id`
- `keyword_target_id`
- `title`
- `excerpt`
- `author`
- `author_id`
- `published_at`
- `publish_timestamp`
- `likes`
- `comments`
- `reads_text`
- `article_url`
- `cover_url`
- `raw_order_index`
- `source_type`
- `payload_json`
- `updated_at`

### 唯一约束

`collected_contents` 使用 `(platform_id, content_id)` 做唯一约束。

重复抓取时采用 upsert：

- 更新标题、摘要、互动数据、抓取时间
- 不重复插入同一条内容

### 写入流程

1. 抓取开始时插入 `sync_runs(status=running)`
2. 抓取成功后 upsert `collected_contents`
3. 更新 `sync_runs(status=success, result_count=...)`
4. 更新 `keyword_targets.last_run_at / last_run_status / last_result_count`
5. 抓取失败则写回 `sync_runs(status=failed, error_message=...)`

### 读取流程

内容页优先调用按分类 + 关键词 + 平台读取最近抓取内容的查询接口，从 SQLite 返回结果。

## 设置页交互设计

### 关键词新增

设置页新增关键词时，必须同时选择平台。

交互结构：

1. 输入关键词
2. 平台多选 chip
3. 点击“新增关键词”

新增成功后展示为关键词卡，卡片包含：

- 关键词名
- 已绑定平台 chips
- 最近抓取时间
- 最近结果数
- 删除按钮

### 平台多选规则

- 一个关键词可绑定多个平台
- 若用户未选择任何平台，则不可保存
- 若某平台在分类级别被禁用，则在关键词配置里不能启用该平台

### 保存后动作

保存关键词目标后，只抓取该关键词绑定的平台，不触发全量抓取。

## 内容页交互设计

### 当前上下文

内容页增加“当前更新上下文”概念：

- 当前分类
- 当前关键词
- 当前平台

### 一键快速更新

点击内容页一键快速更新时，默认刷新：

- 当前正在查看的平台
- 当前选中的关键词

不弹窗，不做额外确认。

### 当前关键词选择规则

- 默认选中当前分类下第一个关键词目标
- 用户切换关键词后，内容列表按该关键词切换
- 一键快速更新始终针对当前关键词执行

### 内容展示规则

- 当前平台为 `小红书` 时，只显示小红书结果
- 当前平台为 `公众号` 时，只显示公众号结果
- 当前平台为 `全部平台` 时，允许混合展示，但每条卡片都要有清晰来源标签
- 结果来源优先级：
  1. SQLite 中的最近抓取结果
  2. 当前刚完成的最新抓取结果
  3. 若没有持久化结果，再回退到现有 mock 数据

## API 设计

### 新增 API Route

#### `/api/xiaohongshu/keyword-search`

- 输入：`keyword`, `page`, `noteTime`
- 行为：服务端代理小红书接口并返回排序后的内容快照

#### `/api/content/refresh`

- 输入：`categoryId`, `keywordTargetId`, `platformId`
- 行为：
  - 按平台执行抓取
  - 写入 SQLite
  - 返回本次最新结果

#### `/api/content/list`

- 输入：`categoryId`, `keywordTargetId`, `platformId`
- 行为：从 SQLite 返回指定条件下的最近抓取内容

## 错误处理

### 小红书接口失败

- 页面显示明确错误提示
- 不清空已有 SQLite 历史结果
- `sync_runs` 记录失败信息
- `keyword_targets.last_run_status` 更新为 `failed`

### 未配置 token

- 服务端直接返回明确错误
- 前端提示“当前平台抓取配置缺失”

### 未选择平台

- 设置页新增关键词时阻止提交
- 显示轻量表单提示

## 测试策略

### `lib` 层

- 小红书结果映射测试
- 小红书 `timestamp desc` 排序测试
- SQLite upsert / query 测试
- 关键词目标平台绑定的纯函数测试

### API 层

- `/api/xiaohongshu/keyword-search`
- `/api/content/refresh`
- `/api/content/list`
- 验证 token 只从服务端读取
- 验证失败时返回明确状态和错误信息

### 组件层

- 设置页新增关键词时可多选平台
- 新增关键词后自动触发抓取
- 内容页一键快速更新默认作用于“当前平台 + 当前关键词”
- 平台切换后，快速更新目标随之变化
- 小红书结果可显示在内容列表中

## 实现边界

### 本轮会实现

- 关键词目标模型升级
- 小红书服务端代理
- SQLite 监控目标 / 抓取批次 / 内容表
- 内容页快速更新当前平台 + 当前关键词
- 小红书与公众号统一内容展示

### 本轮不实现

- 抖音、微博、B 站真实抓取
- 定时任务执行
- 基于 SQLite 的 AI 报告生成
- 小红书原文直达（若无稳定 URL 规则）
- 历史结果分页浏览

## 风险与假设

### 风险

- 小红书接口可能存在排序与时间字段不稳定，需要以后追加兼容。
- 小红书可能缺少可稳定直达的 Web 原文链接。
- SQLite 若直接在 Next server runtime 内初始化，需要注意首次建表与并发写入顺序。

### 假设

- 用户提供的小红书 token 可作为 Bearer token 使用。
- 本轮允许引入轻量 SQLite 依赖并在项目目录生成本地数据库文件。
- SQLite 数据文件不提交到 git。
