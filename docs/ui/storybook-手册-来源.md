# Storybook 中文手册 · 来源与维护

> 本文件只记「手册从哪来、怎么刷新」，手册正文见 [storybook-手册.html](storybook-手册.html)。

## 产物

| 文件 | 说明 |
|---|---|
| `storybook-手册.html` | 单文件中文手册（无外链 CSS/JS，可离线打开、可打印为 PDF） |
| `storybook-手册-来源.md` | 本文件：来源 URL、抓取日期、翻译口径、刷新方法 |

## 来源（抓取日期 2026-10-29，Asia/Shanghai）

| 章节 | 官方页面 | 抓取方式 |
|---|---|---|
| 2 安装与版本要求 | https://storybook.js.org/docs/get-started/install | `web_fetch`，正文抽取 |
| 1 story 的定义 | https://storybook.js.org/docs/get-started/whats-a-story | 同上 |
| 3 写一个 story | https://storybook.js.org/docs/writing-stories | 同上 |
| 4 Args | https://storybook.js.org/docs/writing-stories/args | 同上 |
| 5 Parameters | https://storybook.js.org/docs/writing-stories/parameters | 同上 |
| 6 Controls | https://storybook.js.org/docs/essentials/controls | 同上 |
| 7 Autodocs | https://storybook.js.org/docs/writing-docs/autodocs | 同上 |
| 8 构建与发布 | 官方 CLI 文档（`storybook build`）+ 本项目实测命令 | 页面 + 项目现状 |
| 9 本项目约定 | 非官方内容：`工程文档/系统维护/UI设计入口.md` | 本项目文档 |

版本基准：官网顶部标注 **Version 10.6**（本项目安装的是 10.6.3）。

## 翻译口径（重要）

- **不是逐字译本**：删掉营销段落与 Vue / Angular / Svelte 分支，只保留 React + TypeScript 路径；按「装 → 写 → 调 → 文档 → 打包」重排。
- **代码示例改写**：官方示例按本项目技术栈（React 19 + Vite + TS + `satisfies Meta`）重写，不是原文照抄。
- **术语**：`story` / `args` / `parameters` / `controls` 保留英文原词（与代码一致），其余一律中文。
- 原文未覆盖的细节（如 `play` 函数、`loaders`、MDX、便携式 story）本手册只点名不展开——需要时回官方页面。

## 刷新方法

1. 按上表 URL 顺序 `web_fetch`，正文抽取（去 script/style/标签，压空白）。
2. 对照新版官方文档核对：安装要求、`tags: ['autodocs']` 用法、`argTypes.control` 枚举值是否变化。
3. 改 `storybook-手册.html` 对应章节，同时更新本文件的抓取日期与版本基准。

## 边界

- 手册**不替代**官方文档：冲突时以官方为准；与本项目约定冲突时以 `工程文档/系统维护/UI设计入口.md` 为准。
- 手册里不写 Storybook 管理器（manager）汉化方案——10.x 无官方 i18n，做 hack 属于未采纳方向，见 `工程文档/灵感池/`。
