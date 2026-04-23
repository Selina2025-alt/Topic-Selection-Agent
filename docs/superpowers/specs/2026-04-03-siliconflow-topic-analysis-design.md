# SiliconFlow 选题分析设计

## 背景

当前 `选题分析` 页的核心问题是：分析结果仍然来自模板化文案拼接，只能输出少量固定结构的选题建议，不能基于真实抓取内容形成可追溯的选题洞察。

现有项目已经具备以下基础：

- 多平台抓取与 SQLite 持久化
- `analysis_snapshots` / `analysis_topics` 两张分析结果表
- `搜索历史` 页面与查询快照归档
- `选题分析` 页面现成的日报/汇总展示结构

因此这次不重写页面结构，而是在现有链路上补齐真实 AI 分析能力。

## 目标

完成 `选题分析` 页的核心功能：

1. 每天按全局自定义时间自动执行一次分析，默认 `08:00`
2. 定时执行时先重抓所有监控关键词的全部启用平台内容，再分析前一天有有效数据的关键词
3. 支持在 `选题分析` 页对当前关键词点击 `立即分析`
4. 使用 SiliconFlow 的 OpenAI 兼容接口调用 `zai-org/GLM-5`
5. 采用两阶段分析：
   - 第一阶段：对 top 内容逐篇摘录和结构化提取
   - 第二阶段：基于这些提取结果生成日报摘要和至少 5 条结构化选题洞察
6. 最终结果写入 SQLite，刷新页面和重启项目后仍可回看

## 非目标

本轮不做以下内容：

- 不做新的平台抓取接入
- 不做人工编辑选题报告
- 不做导出 PDF/Word
- 不做多模型切换 UI
- 不做云端调度，仅支持当前 Windows 本机系统级任务
- 不做全文补抓增强，优先使用当前数据库中已保存的正文/摘要字段

## 用户体验

### 1. 监控设置页

新增一个 `全局分析设置` 模块，独立于分类设置：

- `定时分析` 开关
- `执行时间` 输入
  - 默认 `08:00`
  - 用户可改
- `分析服务`
  - 固定显示 `SiliconFlow`
- `分析模型`
  - 固定显示 `zai-org/GLM-5`
- `执行范围说明`
  - 到点后先重抓所有监控关键词，再分析前一天有数据的关键词
- `保存设置`

这个设置是全局唯一的，不按分类分别保存。

### 2. 选题分析页

继续保留现有页面结构：

- 日期卡片列表
- `日报 / 汇总` 切换
- 热点摘要 / 用户关注焦点 / 爆款共性 / 洞察建议
- 选题建议卡片

新增/调整行为：

- 右上角新增 `立即分析` 按钮
- 点击后：
  - 先重新抓取当前分类下当前关键词的全部已启用平台数据
  - 再运行两阶段 AI 分析
  - 成功后自动插入最新日报
- 每条选题建议卡保留现有字段，并补齐至少 5 条
- 每条选题建议支持 `查看支撑内容`
  - 展示逐篇摘录证据
  - 包括标题、简要摘要、关键词、亮点、原文链接

### 3. 空状态

如果前一天没有有效数据：

- 不生成新日报
- 不新增空报告日期
- 页面显示：`前一天无有效样本，本次未生成新分析`

## 分析范围

### 手动 `立即分析`

- 作用域：当前分类 + 当前关键词
- 流程：先抓取该关键词下全部已启用平台，再分析

### 定时分析

- 作用域：全部分类 + 全部监控关键词
- 流程：
  1. 到点后先重抓所有监控关键词在全部启用平台的数据
  2. 仅对“前一天存在有效内容”的关键词执行分析
  3. 无有效内容则跳过，不生成空报告

### 分析输入

- 维度：当前关键词的全部已抓平台 top 内容
- 默认 top 数量：`12`
- 排序优先级：
  1. 平台内现有热度/互动指标降序
  2. 无热度时按发布时间降序
- 单次分析仅使用截断后的输入，不直接吃全部原始内容

## 技术方案

### 总体架构

采用三层结构：

1. `siliconflow-client`
   - 负责 OpenAI 兼容请求
   - 不包含业务逻辑
2. `ai-analysis-service`
   - 负责两阶段分析编排
   - 输入内容，输出结构化分析结果
3. `analysis orchestration`
   - 负责抓取、筛选、分析、落库
   - 同时被手动分析和定时任务复用

### AI 模型配置

服务端环境变量：

- `SILICONFLOW_API_KEY`
- `SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1`
- `SILICONFLOW_MODEL=zai-org/GLM-5`

请求协议：

- 使用 OpenAI 兼容 `chat/completions`
- 服务端 `fetch`
- 前端不直接接触任何密钥

### 两阶段分析

#### Stage A：逐篇摘录与结构化提取

针对本次分析输入的每一篇内容，要求模型输出结构化 JSON：

- `contentId`
- `title`
- `platform`
- `author`
- `briefSummary`
- `keyFacts[]`
- `keywords[]`
- `highlights[]`
- `attentionSignals[]`
- `topicAngles[]`

这一步的目标是把跨平台内容统一压缩为可分析证据，而不是直接给选题结论。

#### Stage B：聚合生成日报与选题洞察

将 Stage A 的全部结果一起输入模型，输出结构化 JSON：

- `hotSummary`
- `focusSummary`
- `patternSummary`
- `insightSummary`
- `topics[]`

每条 `topic` 至少包含：

- `title`
- `intro`
- `whyNow`
- `hook`
- `growth`
- `coreKeywords[]`
- `supportContentIds[]`
- `evidenceSummary`

要求：

- 至少返回 `5` 条选题建议
- 严格 JSON 输出
- 支撑内容必须来自 Stage A 的真实 `contentId`

## 数据存储

### 复用现有表

继续使用：

- `analysis_snapshots`
- `analysis_topics`

### 新增表

新增：

- `analysis_evidence_items`

建议字段：

- `id`
- `snapshot_id`
- `content_id`
- `keyword`
- `platform_id`
- `title`
- `brief_summary`
- `key_facts_json`
- `keywords_json`
- `highlights_json`
- `attention_signals_json`
- `topic_angles_json`
- `created_at`

用途：

- 保存 Stage A 的逐篇结构化摘录
- 供 `查看支撑内容`、历史回看和问题排查使用

## API 与脚本

### 新增 API

#### `POST /api/analysis/run`

入参：

- `categoryId`
- `keyword`
- `mode`
  - `manual`
  - `scheduled`

行为：

1. 根据关键词与分类找到已启用平台
2. 重新抓取该关键词的全部已启用平台内容
3. 过滤出前一天有有效数据的 top 内容
4. 执行两阶段 AI 分析
5. 将快照、选题、证据项写入 SQLite
6. 返回新报告标识与摘要

#### `GET /api/analysis/reports`

读取某分类 / 某关键词的日报列表。

#### `GET /api/analysis/report/[snapshotId]`

读取单份报告详情，包括：

- 日报摘要
- 选题卡
- 证据项

### 定时脚本

新增本地脚本，例如：

- `scripts/run-daily-analysis.ts`

职责：

1. 读取全局分析设置
2. 读取所有分类和监控关键词
3. 对全部关键词先重抓全部启用平台
4. 检查前一天是否有有效数据
5. 有数据则生成分析快照
6. 记录执行结果

### 系统级调度

运行环境限定为 Windows 本机。

方案：

- 保存全局分析设置时，注册或更新 Windows 任务计划程序
- 任务计划程序执行本地 Node 脚本
- 不依赖浏览器或 Next 页面打开

## 与现有代码的衔接

### 必改位置

- `src/lib/analysis-report.ts`
  - 从模板化生成切换为服务端 AI 结果适配与回退逻辑
- `src/app/api/content/refresh/route.ts`
  - 需要避免继续直接生成旧模板分析
  - 可以改成只负责抓取，或改成调用新的分析服务
- `src/lib/history-archive.ts`
  - 归档时补齐证据项关联
- `src/lib/db/schema.ts`
  - 新增 `analysis_evidence_items`
- `src/lib/db/monitoring-repository.ts`
  - 增加证据项写入与读取方法
- `src/components/workbench/replica-analysis-panel.tsx`
  - 增加 `立即分析`
  - 增加支撑内容查看入口
- `src/components/workbench/settings-tab.tsx`
  - 增加全局分析设置模块
- `src/lib/types.ts`
  - 增加分析证据项和全局分析设置类型

### 建议新增文件

- `src/lib/siliconflow-client.ts`
- `src/lib/ai-analysis-service.ts`
- `src/lib/analysis-orchestrator.ts`
- `src/app/api/analysis/run/route.ts`
- `src/app/api/analysis/reports/route.ts`
- `src/app/api/analysis/report/[snapshotId]/route.ts`
- `src/lib/db/analysis-settings-repository.ts`
- `scripts/run-daily-analysis.ts`
- `scripts/register-analysis-task.ts`

## 失败与回退策略

### 1. 抓取失败

- 本次分析直接失败
- 不生成空报告
- 页面提示具体失败原因

### 2. AI 接口失败

- 不写入半成品报告
- 保留抓取结果
- 页面提示“抓取成功但分析失败”

### 3. AI 返回非法 JSON

- 服务端校验失败
- 本次分析视为失败
- 记录原始响应片段用于日志

### 4. 定时任务注册失败

- 全局设置保存失败
- 页面给明确提示
- 不允许出现“页面显示已开启，但系统没有注册成功”的假状态

## 测试策略

### 1. 客户端层

测试 `siliconflow-client`：

- 请求格式正确
- headers 正确
- 能解析返回 JSON
- 异常状态会抛错

### 2. 服务层

测试 `ai-analysis-service`：

- Stage A 能返回结构化摘录
- Stage B 至少返回 5 条 topic
- `supportContentIds` 必须匹配输入内容
- 空内容时直接跳过

### 3. API 层

测试：

- `POST /api/analysis/run`
- `GET /api/analysis/reports`
- `GET /api/analysis/report/[snapshotId]`

确保：

- 手动分析会先抓取再分析
- 无数据时返回跳过状态
- 错误时返回清晰信息

### 4. 页面层

测试：

- `立即分析` 点击后按钮进入 loading
- 新日报插入日期列表
- 报告内容刷新
- 选题卡至少展示 5 条
- 查看支撑内容能看到证据摘录
- 设置页能保存定时时间

## 风险

### 1. 模型输出不稳定

处理方式：

- 明确 JSON schema
- 服务端强校验
- 校验失败即重试或报错，不落库

### 2. 分析耗时偏长

处理方式：

- top 内容限制为 `12`
- 单次只分析当前关键词
- 定时任务串行或小批量执行，避免接口压垮

### 3. 数据来源不完整

处理方式：

- 第一版优先吃当前数据库已有摘要/正文字段
- 不要求额外全文抓取才能运行

### 4. 定时任务与现有功能耦合过深

处理方式：

- 抓取服务继续复用
- 分析服务独立
- 定时入口与手动入口共享 orchestration，不直接混进页面组件

## 验收标准

1. `监控设置` 页可配置全局分析时间，默认 `08:00`
2. 保存设置后可在本机注册/更新系统级定时任务
3. 到点后会先重抓所有监控关键词，再分析前一天有有效数据的关键词
4. `选题分析` 页支持点击 `立即分析`
5. `立即分析` 会先重抓当前关键词全部已启用平台，再生成报告
6. 每份报告至少包含 5 条结构化选题建议
7. 每条选题建议都可追溯到支撑内容
8. 报告、选题卡、证据项都会写入 SQLite
9. 刷新页面或重启项目后，历史报告仍可查看
10. 现有内容抓取页面和现有平台接口协议不被破坏
