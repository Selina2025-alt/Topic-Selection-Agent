# 内容监控工具结构优化与功能补全设计

## 目标

在保留当前截图式首页视觉方向的前提下，把原型升级成可持续扩展的内容监控工作台，重点补齐四件事：

1. 分类管理真正可操作：新增、重命名、删除、右键菜单、备用更多操作入口。
2. 公众号抓取结果真正可验证：明确区分接口原始顺序、页面展示顺序和原文来源，固定按 `publish_time` 倒序展示，并给每条结果提供原文跳转。
3. 三个 Tab 都可用：`内容` 页提升扫描效率，`选题分析` 页可浏览日报和汇总，`监控设置` 页可管理平台、关键词、账号和运行规则。
4. 顶部工具区补齐搜索历史，方便回填关键词并复查上一次抓取结果。

## 当前问题与已确认事实

### 1. 公众号结果顺序未被固定

当前服务端代理 [route.ts](C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\app\api\wechat\keyword-search\route.ts) 直接返回 [wechat-monitor.ts](C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\lib\wechat-monitor.ts) 的映射结果，没有显式做 `publish_time desc` 排序。

### 2. 页面展示顺序继承了接口顺序

前端首页 [monitoring-workbench.tsx](C:\Users\koubinyue\codex project\Agent内容工厂\.worktrees\content-monitoring-workbench\数据采集与选题分析agent\src\components\workbench\monitoring-workbench.tsx) 直接使用代理返回的数组，所以页面默认展示顺序并不可靠。

### 3. `openclaw` 当前实测顺序不是最新优先

本地代理请求：

`GET /api/wechat/keyword-search?keyword=openclaw&period=7&page=1`

当前实测前几条发布时间顺序为：

- `2026-03-24 17:00:51`
- `2026-03-25 16:00:00`
- `2026-03-25 16:44:41`
- `2026-03-25 12:50:55`
- `2026-03-29 20:03:21`

最后一条甚至到了 `2026-03-29 23:31:20`。这说明“接口原始顺序”和“最新发布时间顺序”并不一致。

### 4. 页面还没有明确给出原文验证入口

虽然内容模型里已有 `articleUrl/sourceUrl`，但内容卡目前没有把“查看公众号原文”做成核心可点击动作，因此用户无法快速核验来源真实性。

### 5. 当前页面仍有结构和文案层面的技术债

- 若干复刻组件仍残留乱码文案
- 结果区还保留了固定高度内滚动
- `选题分析` 和 `监控设置` 只有占位态
- 分类区只有基础切换，没有管理能力

## 产品原则

### 1. 最新内容优先

只要来源是公众号抓取结果，页面就必须按发布时间倒序展示，绝不能让接口的偶然顺序影响判断。

### 2. 可验证优先于“看起来有内容”

页面需要明确告诉用户：

- 接口返回的原始顺序是什么
- 页面展示顺序是什么
- 每条内容的原文链接是什么

这样用户才能判断“是不是最新的公众号文章”。

### 3. 浏览效率优先

内容卡要改成紧凑扫描型，不展示大段正文；整页滚动优先，避免双层滚动。

### 4. 当前分类是工作单元

分类不只是视觉分组，而是完整的监控单元。关键词、报告、监控设置、历史搜索都要和分类绑定。

## 结构设计

## 顶部工具区

顶部只保留系统级操作和系统级状态：

- 页面标题
- 最近抓取/扫描状态
- `搜索历史`
- `一键更新`

其中 `搜索历史` 放在 `一键更新` 左侧，点击后弹出最近搜索记录。

## 左侧分类区

左栏保持截图式分类导航，但补齐管理能力：

- `+` 按钮点击后展开新增分类输入框
- 支持输入分类名或关键词创建分类
- 新分类创建后自动切换为当前分类并触发首次抓取
- 每个分类支持两种操作入口：
  - 自定义右键菜单
  - hover 显示的更多操作按钮
- 菜单项固定为：
  - 删除分类
  - 重命名分类
  - 取消

## Tab 1：内容

内容页顺序调整为：

1. 关键词工具区
2. 平台切换
3. 日期导航
4. 结果说明条
5. 内容列表

### 关键词工具区

- 输入框继续可打字
- 点击 `一键更新` 触发抓取
- 抓取完成后写入搜索历史

### 结果说明条

增加轻量说明，不抢视觉重点，但要让用户能核验：

- 当前关键词
- 结果总数
- 页面展示顺序：`按 publish_time 倒序`
- 接口原始顺序：保留并可查看摘要
- 当前来源：公众号原文

### 内容卡

公众号内容卡改成紧凑结构：

- 标题
- 摘要，两行截断
- 一行弱信息：
  - 来源公众号名
  - 发布时间
  - 阅读/点赞
- 明确动作按钮：`查看公众号原文`

规则：

- 优先使用 `url`
- 没有 `url` 时回退到 `short_link`
- 新标签页打开
- 如果缺失原文链接，显示不可用态

如果当前结果源是公众号抓取，则只展示公众号结果，不混入其他平台的 mock 内容。

## Tab 2：选题分析与报告

补成可用原型页，不接真实 AI，只用前端 mock 数据。

结构：

- 顶部日期卡片横向列表
- 最近 `7 天 / 14 天` 切换
- 二级切换：`日报 / 汇总`

### 日报视图

展示单天报告：

- 今日热点摘要
- 前一天用户关注焦点
- 爆款内容共性拆解
- 选题建议
- 洞察建议

### 选题建议卡

每张卡包含：

- 方向标题
- 选题简介
- 为什么做
- 爆点在哪里
- 增长空间在哪里
- `查看支撑内容`

点击 `查看支撑内容` 会把关联内容高亮并切回 `内容` Tab。

### 汇总视图

按最近一段时间汇总所有选题方向，方便横向浏览。

## Tab 3：监控设置

同样补成可用原型页，按卡组展示：

- 监控平台卡组
- 关键词卡组
- 对标账号卡组
- 运行规则卡组
- 删除当前分类入口

行为：

- 平台显示启用/禁用状态
- 关键词支持新增/删除
- 对标账号支持新增/删除
- 删除当前分类需要二次确认

## 数据流设计

### 分类状态

分类数据上提到首页主组件统一管理，字段至少包含：

- `id`
- `name`
- `keyword`
- `count`
- `platforms`
- `trackedCreators`
- `contentItems`
- `reports`
- `settings`

### 搜索历史

使用 `localStorage`，按最近 10 到 20 条保存：

- 搜索关键词
- 所属分类
- 搜索时间

点击任意历史记录后：

- 回填关键词
- 切到对应分类
- 重新触发抓取

### 抓取结果

服务端代理返回时拆成两层：

- `rawItems`
  - 保留接口原始顺序
  - 每条记录附带原始索引
- `items`
  - 按 `publish_time desc` 排序后再映射成页面统一模型

这样页面能同时展示：

- 接口原始顺序
- 页面展示顺序

### 时间排序规则

排序字段优先级：

1. `publish_time`
2. `publish_time_str`
3. `update_time`
4. `update_time_str`

排序规则固定为降序，空值排最后。

## 组件拆分

首页主组件继续收口状态，但把展示层拆开：

- `src/components/workbench/monitoring-workbench.tsx`
  - 页面级状态和事件编排
- `src/components/workbench/replica-sidebar.tsx`
  - 分类列表、新增分类、右键菜单、更多按钮
- `src/components/workbench/replica-topbar.tsx`
  - 标题、Tab、搜索历史、一键更新
- `src/components/workbench/replica-keyword-bar.tsx`
  - 关键词输入和抓取状态
- `src/components/workbench/replica-platform-row.tsx`
  - 平台 pills
- `src/components/workbench/replica-date-row.tsx`
  - 日期卡
- `src/components/workbench/replica-content-list.tsx`
  - 内容列表和内容卡
- `src/components/workbench/replica-history-popover.tsx`
  - 搜索历史弹层
- `src/components/workbench/replica-analysis-panel.tsx`
  - 选题分析页
- `src/components/workbench/replica-settings-panel.tsx`
  - 监控设置页

数据层拆分：

- `src/lib/wechat-monitor.ts`
  - 上游请求、排序、来源映射
- `src/lib/replica-workbench.ts`
  - 分类状态变换、过滤、跨 Tab 跳转辅助
- `src/lib/replica-workbench-data.ts`
  - mock 分类、报告、设置、默认内容
- `src/lib/search-history.ts`
  - localStorage 读写封装

## 测试要求

### 数据层

- 代理层会按 `publish_time desc` 排序
- 保留接口原始顺序信息
- 正确映射 `url/short_link`
- 搜索历史只保留最近上限条数

### 交互层

- 新增分类后自动切换并触发首次抓取
- 右键菜单可重命名和删除分类
- 点击历史记录可回填并重新抓取
- 内容卡可点击打开原文链接
- `查看支撑内容` 能从分析页跳回内容页
- 设置页关键词/账号可增删

## 验收标准

- 用户搜索 `openclaw` 后，页面展示顺序明确为 `publish_time desc`
- 页面可以看见“接口原始顺序”和“页面展示顺序”的区别
- 每条公众号结果都能点开原文链接验证来源
- 内容区不再出现难用的双层滚动
- 左侧分类支持新增、重命名、删除
- 搜索历史可以复用最近的搜索
- `选题分析` 与 `监控设置` 不再是空白占位页
