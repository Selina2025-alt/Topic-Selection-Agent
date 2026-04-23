# Twitter/X 平台接入设计

日期：2026-04-02
分支：`codex/content-monitoring-workbench`
状态：待评审

## 1. 背景与目标

当前 ContentPulse 已接入公众号与小红书，`Twitter/X` 仍然只是 UI 中的平台占位，未具备真实抓取、持久化、历史归档与内容页展示能力。

本次目标是在不破坏现有公众号、小红书、搜索历史、SQLite 持久化与页面结构的前提下，把 `Twitter/X` 接入为第三个真实可抓取平台。

本次完成后，用户可以：

- 在监控设置里为关键词勾选 `Twitter/X`
- 在内容页切到 `Twitter/X` 后，通过 `一键更新` 真实抓取关键词相关推文
- 在内容页看到按统一规则映射后的 X 内容
- 在 SQLite 中保存最新抓取结果与按查询归档的历史快照
- 在搜索历史页回看每次 X 查询的独立记录与内容快照

## 2. 范围

### 2.1 本次实现

- 服务端接入 X API v2 recent search
- 使用服务端 `Bearer Token` 认证，不在前端暴露密钥
- 将 X 搜索结果映射为现有统一内容模型
- 接入现有内容刷新链路、SQLite 持久化链路、搜索历史链路
- 将 `Twitter/X` 从“可选平台占位”升级为“真实可抓取平台”

### 2.2 本次不实现

- X 账号主页抓取
- 推文线程展开
- 推文媒体资源深度解析
- 更复杂的互动指标扩展
- 新增独立页面结构或重写现有 UI

## 3. 认证与安全

### 3.1 认证方案

本次使用 `Bearer Token` 调用 X API v2 recent search。

原因：

- 用户已提供可用 `Bearer Token`
- 无需在运行时额外换取 token
- 对现有服务端代理模式最友好

### 3.2 环境变量

新增：

- `TWITTER_BEARER_TOKEN`

可选保留但本次不强依赖：

- `TWITTER_API_KEY`
- `TWITTER_API_KEY_SECRET`

所有认证信息仅保存在服务端环境变量，不进入前端组件，不写入浏览器存储，不回传到客户端。

## 4. 外部接口设计

### 4.1 数据源

使用 X API v2 recent search 作为关键词搜索入口。

### 4.2 服务端封装

新增文件：

- `src/lib/twitter-monitor.ts`

导出：

- `searchTwitterPostsSnapshotByKeyword(keyword, page?, days?)`

职责：

- 向 X recent search 发起服务端请求
- 解析接口返回
- 保留接口原始顺序
- 在服务端按发布时间倒序排序
- 输出与现有平台一致的统一 `ContentItem` 快照

### 4.3 API route

新增：

- `src/app/api/twitter/keyword-search/route.ts`

职责：

- 对前端提供调试与平台级独立访问入口
- 只读服务端环境变量
- 返回统一映射后的内容结构

说明：

主业务刷新仍优先走现有 `/api/content/refresh` 统一入口，不改变前端现有主要刷新协议。

## 5. 统一内容模型映射

X 返回结果将映射到现有统一内容模型，不单独创造新页面结构。

### 5.1 平台标识

- `platformId: "twitter"`
- `platformLabel: "Twitter/X"`

### 5.2 字段映射

- `id`: 使用推文 id 组合生成稳定内容 id
- `title`: 取推文正文首段，必要时截断为一行标题
- `summary`: 推文正文全文
- `author`: 优先 `@username`
- `authorName`: 用户显示名
- `authorId`: `author_id`
- `publishedAt`: `created_at` 格式化结果
- `publishTimestamp`: 由 `created_at` 转换
- `articleUrl`: `https://x.com/{username}/status/{tweet_id}`
- `sourceUrl`: 同 `articleUrl`
- `likeCount`: `public_metrics.like_count`
- `commentCount`: `public_metrics.reply_count`
- `metrics.likes`: 点赞数
- `metrics.comments`: 回复数
- `metrics.saves`: 用转发数或 `--` 作为第三指标位
- `readCount`: 近期搜索接口通常无稳定阅读量，本次记为 `null`
- `heatScore`: 基于点赞、回复、转发组合计算
- `sourceType`: `"mock"` 之外新增 `"twitter"` 语义，或在当前统一类型下保留平台 id 即可

### 5.3 排序规则

统一规则：

- 先保留接口原始顺序到 `rawOrderIndex`
- 再在服务端按 `publishTimestamp desc` 输出展示顺序
- 同时保留 `rawItems` 与 `items`

## 6. SQLite 持久化

本次不新增新表，继续复用既有结构：

- `keyword_targets`
- `sync_runs`
- `collected_contents`
- `search_queries`
- `search_query_contents`

### 6.1 写入规则

当用户针对 `Twitter/X` 触发刷新时：

1. 创建 `search_queries`
2. 创建 `sync_runs`
3. 抓取 X recent search 结果
4. 执行每个 `关键词 × 平台` 最多 20 条截断
5. 将最新可展示结果写入 `collected_contents`
6. 将当次查询快照写入 `search_query_contents`
7. 更新查询与同步状态

### 6.2 口径规则

继续沿用现有统一口径：

- `fetchedCount`: 接口实际返回量
- `cappedCount`: 截断后保留量
- 页面显示数量：默认使用 `cappedCount` / 实际渲染数量

## 7. 设置页与内容页行为

### 7.1 监控设置

当前关键词平台多选结构不变，仅把 `Twitter/X` 从配置占位升级成真实可抓取平台。

新增关键词时：

- 如果勾选 `Twitter/X`
- 则该关键词目标会保存 `twitter`
- 后续新增即抓取、手动刷新都能命中 X

### 7.2 内容页

当前平台为 `Twitter/X` 时：

- 只显示 X 抓取结果
- 无数据时展示空状态
- 不残留公众号或小红书内容

当前平台为 `全部平台` 时：

- 聚合所有已抓取平台结果
- 每条内容卡明确展示来源标签

### 7.3 一键更新

保持现有心智：

- 当前是 `Twitter/X`：刷新当前关键词的 X 数据
- 当前是 `全部平台`：刷新当前关键词下全部已启用且支持抓取的平台

支持抓取的平台将从：

- `wechat`
- `xiaohongshu`

扩展为：

- `wechat`
- `xiaohongshu`
- `twitter`

## 8. 搜索历史页行为

X 查询将完整接入现有搜索历史机制。

每次 X 查询后：

- 在搜索历史页新增一条记录
- 该记录有自己独立的内容快照
- 点击展开后可查看当次抓取内容
- 不会被后续同关键词搜索覆盖

如果当次查询存在选题快照，也继续按既有规则关联展示。

## 9. 错误处理

需要覆盖：

- 缺少 `TWITTER_BEARER_TOKEN`
- X 接口返回非 200
- 认证失败
- 频率限制
- 空结果
- 返回数据结构缺字段

处理原则：

- 服务端 API 返回明确错误信息
- 前端内容页展示错误态，不静默失败
- 不影响公众号、小红书已存在的数据展示

## 10. 测试策略

### 10.1 `lib` 层

新增 `twitter-monitor` 测试，覆盖：

- recent search 成功映射
- 发布时间倒序排序
- `articleUrl` 拼接
- 空结果与错误处理

### 10.2 同步层

扩展 `monitoring-sync-service` 测试，覆盖：

- `twitter` 纳入统一刷新入口
- 20 条上限截断
- `collected_contents` 与 `search_query_contents` 都正确写入

### 10.3 API 层

扩展：

- `/api/content/refresh`
- `/api/content/list`
- 新增 `/api/twitter/keyword-search`

验证：

- 不破坏 `wechat` / `xiaohongshu`
- `twitter` 错误可被正确返回

### 10.4 组件层

覆盖：

- 设置页可勾选 `Twitter/X`
- 内容页切换到 `Twitter/X` 后能显示正确结果
- 平台无数据时显示空状态
- 搜索历史可回看 X 查询记录

## 11. 风险与约束

- X API 的访问权限与额度可能受账号套餐限制
- recent search 未必提供阅读量，本次不强行伪造
- 如果 X 返回字段变动，映射层需容错

## 12. 实现原则

- 不重写现有页面结构
- 不改现有公众号/小红书接口协议
- 不改变现有 SQLite 历史架构
- 只做非侵入式扩展，将 `Twitter/X` 接入既有抓取与归档体系
