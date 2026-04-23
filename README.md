# ContentPulse 项目交接说明

`ContentPulse` 是一个面向内容运营团队的内容监控与选题决策工作台，当前已经具备多平台抓取、SQLite 持久化、搜索历史归档、选题分析页、监控设置页等核心能力。

这份文档的目标是让你在其他电脑上 `clone` 后，可以尽快把项目跑起来并继续开发。

## 当前完成的能力

- 监控分类管理
  - 左侧分类切换、新增、重命名、删除
- 内容页
  - 平台切换
  - 日期轴浏览
  - 一键更新
  - 数量口径统一
  - 搜索历史入口
- 平台抓取
  - 公众号
  - 小红书
  - Twitter/X
- 数据持久化
  - SQLite 保存关键词目标、抓取批次、最新内容、查询历史、历史内容快照、分析快照
- 搜索历史页
  - 一级列表
  - 二级展开详情
  - 每次查询拥有独立历史快照，不会被后续搜索覆盖
- 选题分析页
  - 日报/汇总视图原型
  - 分析日期列表
  - 支撑内容入口
- 监控设置页
  - 多平台关键词配置
  - 全局分析设置入口

## 当前已接入的平台

- `公众号`
- `小红书`
- `Twitter/X`

其中：

- 公众号与小红书抓取链路已可用
- `Twitter/X` 已接进统一链路，但真实结果是否可用受你的 X API 额度/权限影响
- SiliconFlow 分析链路已接好，但如果所选模型没有权限，服务端会明确返回错误

## 已知事项

### 1. 本地数据库不会提交到 Git

SQLite 数据库存放在：

- `.codex-data/contentpulse.sqlite`

这个目录已经被 `.gitignore` 忽略，所以：

- 代码会上传到 GitHub
- 你当前本机已经抓到的运行数据不会自动上传

如果你想把**当前本机已有历史数据**一起带到另一台电脑，请额外复制这份文件：

- `数据采集与选题分析agent/.codex-data/contentpulse.sqlite`

把它放到新电脑同样的位置即可继续沿用原有数据。

### 2. 本地密钥不会提交到 Git

请把所有真实密钥只放在：

- `.env.local`

不要写进代码、文档或测试文件。

## 环境变量

先复制模板：

```powershell
Copy-Item .env.example .env.local
```

再按需填写：

```env
WECHAT_MONITOR_TOKEN=replace-with-your-token
XIAOHONGSHU_MONITOR_TOKEN=replace-with-your-token
TWITTER_BEARER_TOKEN=replace-with-your-token
SILICONFLOW_API_KEY=replace-with-your-key
SILICONFLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICONFLOW_MODEL=zai-org/GLM-5
```

## 本地运行

```powershell
npm install
npm run dev
```

开发预览地址：

- `http://127.0.0.1:3000`

生产构建验证：

```powershell
npm run lint
npm test
npm run build
```

## 继续开发时建议先看的文件

### 页面主入口

- `src/components/workbench/monitoring-workbench.tsx`

### 抓取与同步

- `src/lib/monitoring-sync-service.ts`
- `src/lib/wechat-monitor.ts`
- `src/lib/xiaohongshu-monitor.ts`
- `src/lib/twitter-monitor.ts`

### 选题分析

- `src/lib/analysis-orchestrator.ts`
- `src/lib/ai-analysis-service.ts`
- `src/lib/siliconflow-client.ts`

### SQLite

- `src/lib/db/schema.ts`
- `src/lib/db/monitoring-repository.ts`

### API 路由

- `src/app/api/content/`
- `src/app/api/history/`
- `src/app/api/analysis/`

## Obsidian 项目管理

项目管理文档放在：

- `项目管理/ContentPulse/Project Dashboard.md`
- `项目管理/ContentPulse/Progress Log.md`
- `项目管理/ContentPulse/Backlog.md`
- `项目管理/ContentPulse/Decisions.md`

设计与计划文档放在：

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

建议继续开发时优先在 Obsidian 里维护：

- 当前目标
- 下一轮 backlog
- 关键决策
- 已知问题

## 换电脑继续开发

### 如果你只需要代码

```powershell
git clone https://github.com/Selina2025-alt/Agent-Content-Factory.git
cd Agent-Content-Factory
cd 数据采集与选题分析agent
npm install
Copy-Item .env.example .env.local
```

然后填写 `.env.local`，再运行：

```powershell
npm run dev
```

### 如果你还需要当前已有的 SQLite 数据

除了上面的步骤，再把旧电脑里的：

- `.codex-data/contentpulse.sqlite`

复制到新电脑项目目录同样的位置。

## 当前最值得优先关注的事项

- 检查 SiliconFlow 当前模型权限是否可用
- 如果需要真正系统级定时任务，确认本机任务计划程序是否已注册
- 如果要继续扩平台，优先复用现有 `monitoring-sync-service`
