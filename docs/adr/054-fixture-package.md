# ADR-054 Fixture 拆出（M3）

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/fixture`、`packages/engine`、`apps/game`

## 决策

1. `packages/engine/src/demo` 移到 `packages/fixture/src`，包名 `@itb/fixture`。
2. `@itb/engine` 删除 `./demo` 导出；运行时内核不再带 fixture。
3. `apps/game` 改依赖 `@itb/fixture`；5 个源文件 import 切换。
4. 4 个 demo/hit/spawner/weapon 契约测试移到 `packages/fixture/tests`。
5. gate 测试扫描 engine + fixture 两个 `dist/tests`；registry/harness/capabilities/drill 路径同步。
6. `@itb/fixture` 是 private，不进 npm 发布；`@itb/engine` pack 保持 dist/src + README。

## 验收

- `tsc -b` PASS。
- 全量 gate PASS `20261024T135904Z-39584-lul8m`。
- 测试文件总数仍为 45（41 engine + 4 fixture）。
- app build/storybook PASS（BOM 问题已修复）。

## 边界

- fixture 仍是 private 包，不单独发布。
- starter 冒烟仍走 `@itb/engine`；fixture 未纳入 starter。
- 迁移使用 Git mv + UTF-8 修复，历史保留。
