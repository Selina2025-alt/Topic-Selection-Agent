# 内容监控截图复刻版设计

## 目标

把首页重构成已确认的截图式内容监控页面，优先保证视觉结构、点击路径和输入体验与参考图一致，再把公众号关键词搜文接口挂到“一键更新”流程上。页面不能再被接口状态拖垮，接口异常时仍然保留可用的前端样例内容。

## 范围

- 左侧栏复刻为品牌区、监控分类列表、加号入口和底部运行状态卡
- 顶部复刻为当前分类标题、更新时间和三个 Tab
- 主区首行复刻为关键词输入区和“一键更新”按钮
- 平台切换、日期卡横排、内容列表全部按截图式信息密度重做
- 仅保留“内容”页为完整体验；“选题分析”“监控设置”先保留轻量占位切换
- 公众号接口通过现有 Next API route 代理，不在浏览器暴露 token

## 交互原则

- 点击左侧“监控分类”旁边的 `+` 可展开或收起关键词输入区
- 点击分类会切换当前分类，并同步切换默认关键词、内容列表和高亮态
- 输入关键词后点击 `一键更新`，页面先进入短暂更新态，再尝试拉公众号内容
- 如果接口成功，内容列表优先展示接口结果
- 如果接口失败或无数据，页面保留本地 mock 内容，并显示轻量状态提示
- 平台和日期切换只在当前内容池内筛选，不触发额外请求

## 前端结构

### 页面壳

- `src/components/workbench/monitoring-workbench.tsx`
  - 收口整个页面状态
  - 管理当前分类、当前关键词、当前平台、当前日期、更新状态和接口结果

### 组件拆分

- `src/components/workbench/replica-sidebar.tsx`
  - 品牌区、分类列表、加号按钮、运行状态
- `src/components/workbench/replica-topbar.tsx`
  - 页面标题、更新时间、Tab
- `src/components/workbench/replica-keyword-bar.tsx`
  - 关键词输入、一键更新、展开收起态
- `src/components/workbench/replica-platform-row.tsx`
  - 平台 pills
- `src/components/workbench/replica-date-row.tsx`
  - 日期卡横排
- `src/components/workbench/replica-content-list.tsx`
  - 内容区标题、内容卡列表、空态、错误态

### 数据

- `src/lib/replica-workbench-data.ts`
  - 保存分类、平台、日期和 mock 内容模板
- `src/lib/replica-workbench.ts`
  - 负责把 mock 模板按关键词扩展成可渲染内容
  - 提供平台筛选、日期筛选和接口结果回退逻辑

## 接口接入策略

- 继续复用 `src/app/api/wechat/keyword-search/route.ts`
- 前端只在点击 `一键更新` 时调用该路由
- 服务端仍然读取环境变量 token
- 前端如果拿到文章结果，就映射到截图式内容卡结构
- 前端如果收到错误，如 `QUOTA_EXCEEDED`，则把错误文案显示在关键词区附近，但不清空本地 mock 列表

## 样式策略

- 以当前确认版 HTML 原型为唯一视觉基准
- 大幅收缩现有工作台中不属于截图的模块和结构
- 主样式集中在 `src/app/globals.css`
- 新组件类名统一以 `replica-shell__` 为前缀，避免与旧样式互相污染

## 测试

- 组件测试覆盖：
  - 默认渲染截图式首页结构
  - 点击左侧加号展开/收起关键词栏
  - 输入关键词后点击“一键更新”会触发请求
  - 请求成功时内容区展示接口文章
  - 请求失败时保留 mock 列表并显示错误提示
  - 平台和日期切换能筛选内容

## 风险与处理

- 当前真实 token 配额可能仍不足，因此接口链路要按“可失败但页面不崩”的思路实现
- 现有页面组件较多，这轮不做局部修补，直接收敛为截图式首页，减少旧结构残留
