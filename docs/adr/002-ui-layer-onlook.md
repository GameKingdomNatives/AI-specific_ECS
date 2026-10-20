# ADR 002 · UI 层与 Onlook 可视化编辑

> **状态更新（2026-10-21）**：设计侧工具链改为 **Figma 优先**（ADR-009）；「Onlook 自托管」降级为可选，不再作为交付前提。其余结论（React + Tailwind 的 DOM 覆盖层、Pixi 留在 canvas、Storybook 作组件画布）继续有效。

- 日期：2026-10-20
- 状态：已接受（部分由 ADR-009 修订）

## 背景

需要一个可视化编辑 UI 的手段，选定 Onlook（基于 React）。核查后确认其能力边界：编辑 DOM／React 组件并写回 TypeScript，需要可运行的开发服务器；通过 GitHub 授权读取项目，用 Storybook 把组件放上画布（来源：<https://www.onlook.com/for/nextjs>、<https://github.com/onlook-dev/onlook>）。它**不能编辑 canvas 绘制**。

本项目战场由 Pixi 直接绘制，属于引擎渲染层；若把战场搬进 DOM，批渲染与帧预算都会失守。

## 决定

| 项 | 决定 | 理由 |
|---|---|---|
| UI 层 | React + Tailwind DOM 覆盖层，目录 `apps/game/src/ui/**` | Onlook 只认 DOM；战场留在 canvas 才能保住批处理与确定性 |
| 数据方向 | 引擎产出只读 `UiSnapshot`，React 订阅；UI 只发意图命令 | 单向数据流，避免 UI 反向改世界破坏确定性 |
| 快照频率 | 默认 10Hz，可配 | DOM 属冷路径，不需要每帧调度 React |
| Storybook | 引入，作为 Onlook 组件画布 | Onlook 的组件画布依赖它 |
| 部署 | 自托管开源版 | 当前仓库无远端；不上云 |
| 时机 | 第二批之后 | UI 出现前接编辑器没有可编辑对象 |

## 边界与治理

1. `ui/**` 不得 import `engine/src/core` 或 `impl`；只允许 `ports` 的类型与快照类型。
2. Storybook、Vite 仅开发期依赖；`packages/engine` 保持零前端框架依赖。
3. Onlook 的改动与 AI 改动走同一门禁（`node tools/gate.mjs`）与同一批阅流程。
4. 保护路径对 Onlook 同样有效：`tools/`、`.githooks/`、`packages/engine/src/ports`。
5. 本机沙箱内 Vite 不可用（esbuild 子进程被拒，见 ADR-001）：可视化编辑在沙箱外终端执行，门禁在沙箱内照跑。

## 待第二批落地

- `UiSnapshot` 契约与 `ui/**` 骨架。
- Storybook 配置与首个组件（战前配置页占位）。
- 门禁新增「UI 依赖边界」规则。
