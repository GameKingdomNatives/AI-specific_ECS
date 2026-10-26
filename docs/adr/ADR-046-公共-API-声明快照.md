# ADR-046 公共 API 声明快照（API-001）

- 状态：已接受
- 日期：2026-10-24
- 相关：`contracts/api-surface.json`、`tools/checks/api-surface.mjs`、Batch 0.3

## 背景

API-001 要求“公共 API 导出有报告与 starter 冒烟”。直接引入 api-extractor 会扩大依赖面；当前先用**声明文件哈希快照**作为可评审的 API 报告。

## 决策

1. 快照 `contracts/api-surface.json` 记录 5 个公共声明入口（根、core、ports、scene、bridge）的 SHA-256。
2. `tools/checks/api-surface.mjs` 在 gate 中校验：
   - 声明文件存在且哈希与快照一致；
   - `starters/ui-storybook-kit` 存在（starter 冒烟由 gate 的 `starter` 步骤执行）。
3. API 变化时，构建会改动 `dist/src/**/*.d.ts` → 哈希不匹配 → gate 红；更新快照必须人工评审并随 PR 提交。
4. 负例 `改API声明` drill 会临时改动 `dist/src/index.d.ts`，验证快照真的会变红。

## 验收

- `node tools/checks/api-surface.mjs` PASS。
- `改API声明` drill PASS。
- 全量 gate PASS。

## 边界

- 快照不是语义化 API diff；后续可接 api-extractor 生成 `.api.md`，替换哈希快照。
- starter 目前只校验存在，冒烟命令由 gate 的 starter 步骤执行；若 starter 不 import engine，需在阶段 4 引擎独立化时补真实冒烟。
