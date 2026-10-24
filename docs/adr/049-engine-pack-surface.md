# ADR-049 引擎包面与 headless starter 冒烟

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/package.json`、`tools/checks/package-surface.mjs`、`tools/smoke/engine-starter.mjs`

## 背景

引擎仍是 private 包，但至少要能证明：发布包只含运行时产物、外部消费者能通过包入口创建引擎。

## 决策

1. `packages/engine/package.json` 的 `files` 收紧为 `dist/src`；不再把 `src/`、`tests/`、`tsconfig.json` 打进包。
2. 新增 `package-surface` gate：
   - `npm pack --dry-run --json` 解析文件清单；
   - 必须有 `package.json`、`dist/src/index.js`、`dist/src/index.d.ts`、`dist/src/engine.js`；
   - 禁止 `src/`、`tests/`、`dist/tests/`、`tsconfig.json`。
3. 新增 `starter-smoke` gate：`tools/smoke/engine-starter.mjs` 通过 `@itb/engine` 包入口 `createEngine`，跑 step/advance/dispose。
4. `删发布入口` drill 验证缺失 `dist/src/engine.js` 会红。

## 验收

- `package-surface` PASS（187 个文件，仅 dist/src + package.json）。
- `starter-smoke` PASS。
- 全量 gate PASS。

## 边界

- 还没有真正 `npm pack` 出 tarball 再安装；只是 dry-run 文件面 + workspace 包入口冒烟。
- 没有 README/LICENSE；上传前补。
- 包仍依赖 pixi.js/zod 等；引擎核心仍包含 demo/impl，完全独立化要等 `@itb/fixture`/适配器拆分。
