# UI 设计入口（组件、Storybook、人工审查）

> 这份文件只回答三件事：**在哪、怎么启用、谁动手做什么**。设计定案与组件细节不在这里复制——见文末「唯一事实源」。

## 一屏结论

| 我想…… | 命令（仓库根目录） | 打开 |
|---|---|---|
| 单独看 UI 组件与状态 | `npm run storybook` | http://localhost:6006 |
| 把 UI 打成交给别人的静态包 | `npm run storybook:build` → `artifacts/storybook-static`，再 `npm run storybook:serve` | http://localhost:7007 |
| 在真实游戏里看 HUD / 控制条 | `npm run dev` | http://localhost:5173 |

Storybook **不启动游戏、不加载 Pixi、不需要 Docker**；它只跑 DOM 覆盖层。

## 目录地图（UI 相关的工程文件在哪）

| 层 | 位置 | 作用 |
|---|---|---|
| 设计定案（事实源） | `docs/UI最终方案.md` | 定位、架构、组件契约、token 语义；改方向先改它 |
| 设计协作 SOP | `docs/runbooks/05-设计协作上手预案.md` | 外部/未来协作者怎么只看页面就能评审 |
| 组件与故事 | `apps/game/src/ui/` | `README.md` 给目录与新增组件四步；`tokens.ts` 是颜色/字号/间距的**唯一事实源** |
| 样式入口 | `apps/game/src/ui/app.css` | `@import "tailwindcss"`，只服务 DOM 层 |
| 挂载 | `apps/game/src/ui/mount.tsx`、`App.tsx` | 把 UI 挂到游戏页面；`UiSnapshot` 只读、`UiIntents` 只回调 |
| 场景编辑器面板 | `apps/game/src/editor/`（含 `editor.stories.tsx`） | 也在 Storybook 里，同一条命令可看 |
| Storybook 配置 | `apps/game/.storybook/main.ts`（收集哪些 story）、`preview.ts`（背景/布局） | 新增 story 目录要改 `main.ts` 的 glob |
| 战场渲染（**不是 DOM**） | `apps/game/src/render-table.ts` + Pixi | 不在 Storybook 覆盖面内，别在 Storybook 里找方块与弹道 |
| 边界规则 | `docs` 内的 depcruise 规则 `ui-no-engine-internals` | UI 不得 import 引擎内部；违规门禁会红 |

## 怎么启用

```bash
npm run storybook         # 开发态，热更新；6006 被占时用 -- -p 6010 换端口
npm run storybook:build   # 产出静态包（门禁里的 storybook 步骤就是它）
npm run storybook:serve   # 起静态包，7007；给别人看用这个，不暴露源码热更新
```

- **端口冲突**：`npm run storybook -- -p 6010`；`storybook:serve` 的端口写死在 `package.json` 的 `serve-static.mjs` 参数里。
- **受限会话**：本机 DSH 沙箱禁止管道子进程，`storybook` / `storybook:build` 属 **L3 环境受限**——门禁里会点名，**不算 PASS，也不算违规**。要看画布请在人的完整终端里跑。
- **只看静态包**：`npm run storybook:build` 产出的目录可以直接压包给人，对方不需要 Node。

## 怎么编辑

1. 组件放 `apps/game/src/ui/Xxx.tsx`；props 只收纯数据与回调，**不许**持有引擎对象。
2. 同目录建 `Xxx.stories.tsx`：`title` 用中文（如 `基础组件/按钮`），导出名也用中文（如 `默认`、`禁用`），至少覆盖**默认 / 边界（空或错误）/ 禁用**三种状态。
3. 颜色、字号、间距、圆角**只改 `tokens.ts`**；不要在 story 或组件里散写十六进制值。
4. 新增 story 目录时同步 `apps/game/.storybook/main.ts` 的 `stories` glob。
5. 改完跑 `node tools/gate.mjs`（含 storybook 构建、UI 依赖边界）与 `node tools/gate.mjs --fast`（本地兜底）。

命名约定（已在用）：story 文件里的 `title` 是中文路径式分组（`基础组件/按钮`、`编辑器/面板`），导出名是状态中文名——中文名就是给人和给人看的面板用的，不要为了英文习惯改回去。

## 怎么人工处理（人做判断，我做执行）

| 谁 | 做什么 |
|---|---|
| **人** | 颜色、字号、间距、圆角、措辞、层级——这些是判断，只有你能定稿；对着 Storybook 真实渲染说「这个按钮太重」「这个提示看不清」即可 |
| **人** | 报问题时给「story 名 + 状态名 + 截图」三件套（例：`基础组件/按钮 → 禁用`），我据此定位 |
| **我** | 改组件 / 加 story / 改 token / 跑门禁；不擅自改视觉参数，只把可选值摆出来 |
| **我** | 视觉定稿后，把变化同步进 `tokens.ts` 与 `docs/UI最终方案.md`，并补一条变更记录 |

**不建议人直接改**：Tailwind 类名或组件里的内联样式。这类改动会绕开 token，下次调色板就分叉；要说「改哪个 token」而不是「改哪个像素值」。

**审查时只看三件事**（与 `docs/runbooks/05` 一致）：状态是否齐全（默认/边界/禁用）、文字是否读得清、危险操作（清除存档这类）是否够显眼。

## 中文化现状与可选路线

- **已经是中文**：story 名称与分组、组件文案、`apps/game/src/ui/README.md`、设计 SOP、本文件。
- **还是英文**：Storybook **管理器外壳**（侧栏按钮、工具栏、面板标题如 Docs / Controls / Actions）与官方文档站点。
- **上游现状**：Storybook 10.x **没有官方界面语言开关**（管理器是预打包 UI），所以「把本地 Storybook 整体翻译成中文」只能靠两条非官方路线，代价不同：
  - **路线 A（推荐）**：不动外壳，把「我们用到的那几页」写成中文速查（本文件 + `docs/runbooks/05` + `src/ui/README.md` 已经是这件事），人不需要读英文文档就能用。
  - **路线 B（可做但脆）**：加 `.storybook/manager.ts` 用官方 manager API 改品牌名（`brandTitle: 深入战火 · 组件画布`，这一项是官方支持的）；更彻底要把侧栏/工具栏按钮文字换掉，只能注入 CSS 覆盖英文，**每次升级 Storybook 都可能失效**。
  - **路线 C**：只翻译官方文档里我们真用的四页（安装/写 story/参数与控件/构建发布），落到 `docs/ui/` 下作为中文速查，不追全量。
- **已落地（2026-10-29）**：人裁定「Storybook 最多只需要把它的文档拉取和做本地翻译为 html 电子书，目前不需要其余工作」——于是只做 C 的收窄版：
  - 产物：[docs/ui/storybook-手册.html](storybook-手册.html)（单文件、无外链资源、可离线读、可打印为 PDF）+ [storybook-手册-来源.md](storybook-手册-来源.md)（来源 URL、抓取日期、翻译口径、刷新方法）。
  - 覆盖：为什么用 / 安装与版本要求 / 写 story / Args / Parameters / Controls / Autodocs / 构建发布 / 本项目落位，共 10 章。
  - **不做**：B（管理器外壳汉化）已明确放弃；不改 `.storybook/manager.ts`、不注入覆盖英文的 CSS。侧边栏 English 是预期状态，写进手册第 9 章。

## 常态化审计服务器（提案，不实现）

想法：`npm run audit:serve`（占位名）起一个只监听 `127.0.0.1` 的本地服务，**固定命令白名单**（tsc / tests / gate --fast / eslint / registry），页面上按需触发、读 `artifacts/gate/<run>/report.md`、出趋势。要点与风险写在 [灵感池 IDEA-003](../灵感池/IDEA-003-常态化审计服务器.md)，未采纳前不动代码。

## 唯一事实源

- 设计定案：`docs/UI最终方案.md`
- 组件目录与新增步骤：`apps/game/src/ui/README.md`
- token 值：`apps/game/src/ui/tokens.ts`
- 评审 SOP：`docs/runbooks/05-设计协作上手预案.md`
- 命令速查：`../系统维护/常用项目管理指令.md`
