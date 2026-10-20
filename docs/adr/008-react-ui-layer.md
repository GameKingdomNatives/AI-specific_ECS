# ADR 008 · UI 层用 React 覆盖层，依赖暂放仓库根

- 日期：2026-10-20
- 状态：已接受
- 影响：`apps/game/src/ui/**`、`apps/game/index.html`、`apps/game/tsconfig.json`、`eslint.config.mjs`、`.dependency-cruiser.cjs`、根 `package.json`

## 背景

按 ADR-002 的结论，战场继续由 Pixi 画布负责，UI 做成 DOM 覆盖层（React + Tailwind），
并通过只读 `UiSnapshot` 与意图命令交互。Onlook 需要在你自己的终端起 Vite（沙箱里起不来）。

安装时遇到环境问题：`npm install -w @itb/game react react-dom` 报
`npm warn workspaces @itb/game in filter set, but no workspace folder present` /
`Invalid Version:`（先后清理了 `packages/engine/node_modules` 里遗留的 pnpm junction）。
最终 `npm install` 装到仓库根 `node_modules` 后成功（React 19.3.1）。

## 决定

- UI 分三层：`ui/snapshot.ts`（纯类型 + store）、`ui/App.tsx`（纯展示）、`ui/mount.tsx`（createRoot 挂载）。
- 引擎对象与副作用集中在 `apps/game/src/controls.ts`，React 只拿 `UiSnapshot` 与 `UiIntents`。
- 快照按 10Hz 从主循环推送（tick % 10），不参与逻辑 tick。
- React/ReactDOM 暂放**仓库根** dependencies，`@types/react*` 放 devDependencies；等 npm 工作区识别恢复后
  再迁回 `apps/game`（迁移只需移动依赖声明，不改代码）。
- 门禁新增依赖规则：`apps/game/src/ui/**` 不得 import `packages/**` 或应用控制器。
- eslint 忽略 `dist-ts/**`（生成的 `.d.ts` 不应被 lint）。

## 不做

- 本轮不引入 Storybook：先让覆盖层跑通、规则落地。
- 不做 Onlook 接入（需要用户终端）。

## 增补（同日）

Tailwind 4.3.3 通过 `@tailwindcss/vite` 接入，`App.tsx` 的内联样式已替换为工具类；
实测计算样式确认生效。改 `vite.config.ts` 后必须重启 dev server。

## 验证

- 页面按钮由 React 渲染（`#ui-root`），点击「存档」→ `已存档 @ tick 113 · 隔离 0`，localStorage 出现信封。
- 快照行实时更新：`tick 390 · 实体 65 · 刚体 65`。
- 全量门禁 PASS（depcruise 含新 UI 规则、build 通过）。
