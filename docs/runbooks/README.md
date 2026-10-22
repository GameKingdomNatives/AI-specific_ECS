# Runbooks 索引

按「第一次上手 → 日常流程 → 排障」排序；每篇都可在最新仓库状态下直接执行。

| 文件 | 内容 |
|---|---|
| [01-让规则生效.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\01-让规则生效.md>) | 从零跑通：环境 → 依赖 → 钩子 → 全量门禁（30+ 步）→ 应用 → 面板 → 批阅 → 提交 |
| [02-提交审核流程.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\02-提交审核流程.md>) | 批阅为什么存在、三条命令、面板审核台、与 gate 的分工 |
| [03-回放与偏离定位.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\03-回放与偏离定位.md>) | 自测（三次一致）、写录制、回放比对、重演浏览器里的一局、首发偏离定位 |
| [04-UI组件画布与设计评审.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\04-UI组件画布与设计评审.md>) | Storybook 本地画布、静态包交付、评审流程、为什么不用 Onlook、Figma 的定位 |
| [05-设计协作上手预案.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\05-设计协作上手预案.md>) | 未来协作场景的上手预案（当前个人项目可作自检清单）：零工程环境评审、token 速查、差异提法 |
| [06-UI工程落地.md](<E:\个人游戏项目\IntoTheBattlefiel深入战火\docs\runbooks\06-UI工程落地.md>) | UI 作为独立工程单元：资源清单、环境矩阵、构建/服务、交付、排错、许可证 |

## 相关入口

| 工具 | 路径 |
|---|---|
| 治理面板（含批阅台） | `E:\个人游戏项目\IntoTheBattlefiel深入战火\tools\panel\panel.html` |
| 面板数据采集 | `node tools/panel/collect.mjs` |
| 全量门禁 | `node tools/gate.mjs` |
| 快速门禁 | `node tools/gate.mjs --fast` |
| 应用开发服务 | `npm run dev`（5173） |
| 组件画布 | `npm run storybook`（6006） |
| 静态包服务 | `npm run storybook:serve`（7007） |
| 独立起步工程 | `starters/ui-storybook-kit/` |
| 批阅记录 | `docs/review-log.md` |
| 引擎差异与进度 | `docs/audits/engine-diff-and-progress.md` |

## 维护约定

- 门禁步骤数量、哈希口径、UI 工具链结论变化时，同步更新对应 runbook；
- runbook 只写「当前可执行的事实」，历史与教训放 `docs/lessons/` 与 `docs/adr/`。
