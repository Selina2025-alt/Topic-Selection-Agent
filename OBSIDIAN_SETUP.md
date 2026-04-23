# Obsidian 交接说明

这份文档用于说明，别人从 GitHub 下载这个项目后，如何直接用 Obsidian 打开并继续使用我们整理好的项目文档体系。

## 推荐打开方式

请直接用 Obsidian 打开下面这个文件夹作为 vault：

- `数据采集与选题分析agent`

不要打开仓库根目录，也不要打开其他 agent 子目录，否则会把不相关的本地资料一起混进来。

## 这个 vault 里已经包含的内容

### 1. Obsidian 配置

- `.obsidian/app.json`
- `.obsidian/appearance.json`
- `.obsidian/core-plugins.json`
- `.obsidian/graph.json`
- `.obsidian/workspace.json`

这些文件可以帮助新电脑尽量复用当前的：

- 核心插件启用状态
- 图谱设置
- 工作区布局

### 2. 项目管理文档

- `项目管理/ContentPulse/Project Dashboard.md`
- `项目管理/ContentPulse/Progress Log.md`
- `项目管理/ContentPulse/Backlog.md`
- `项目管理/ContentPulse/Decisions.md`

这些文档用于继续维护：

- 当前项目状态
- 已完成事项
- 待办事项
- 关键决策记录

### 3. 设计与计划文档

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

这里保存了本项目各阶段的设计说明和实施计划，适合新接手的人快速理解：

- 为什么这样设计
- 每轮改动的边界
- 当前架构和能力范围

## 换电脑后如何继续

### 代码和文档

```powershell
git clone https://github.com/Selina2025-alt/Agent-Content-Factory.git
cd Agent-Content-Factory
```

然后：

1. 用 Obsidian 打开 `数据采集与选题分析agent`
2. 用终端进入 `数据采集与选题分析agent`
3. 安装依赖并配置环境变量

```powershell
cd 数据采集与选题分析agent
npm install
Copy-Item .env.example .env.local
```

填写 `.env.local` 后运行：

```powershell
npm run dev
```

默认预览地址：

- `http://127.0.0.1:3000`

## 哪些内容不在 GitHub 里

### 1. SQLite 运行数据

默认不会提交运行期数据库文件，例如：

- `.codex-data/contentpulse.sqlite`

所以如果你想把已经抓到的历史内容、搜索历史、分析快照一起带到另一台电脑，需要额外手动复制这份数据库文件。

### 2. 本地密钥

真实 token / key 只应该保存在：

- `.env.local`

不会跟随 GitHub 同步。

## 如果另一台电脑不想复用当前 Obsidian 布局

可以保留所有 Markdown 文档，只删除本地这一个文件：

- `.obsidian/workspace.json`

这样：

- 文档还在
- 插件配置还在
- 但 Obsidian 会重新生成更适合当前电脑的布局

## 建议的继续阅读顺序

1. `项目管理/ContentPulse/Project Dashboard.md`
2. `项目管理/ContentPulse/Progress Log.md`
3. `项目管理/ContentPulse/Backlog.md`
4. `docs/superpowers/specs/`
5. `docs/superpowers/plans/`

这样能最快理解这个项目当前做到哪里、下一步该继续什么。
