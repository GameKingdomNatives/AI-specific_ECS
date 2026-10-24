# ADR-045 pre-push 校验 Receipt

- 状态：已接受
- 日期：2026-10-24
- 相关：`tools/hooks/pre-push.mjs`、`tools/receipt.mjs`、Batch 0.3

## 背景

Receipt 已能生成，但之前只是证据文件，推送不检查它；`pre-push` 只校验 gate stamp 与深检节奏。AI 的交付需要“回执是交付物”这条约束。

## 决策

1. `pre-push` 在全量 gate + stamp 校验之后，调用 `tools/receipt.mjs`。
2. 要求：
   - receipt 文件存在（`artifacts/receipts/<HEAD>.json`）；
   - `receipt.head === HEAD`；
   - `receipt.gatePassed === true`。
3. 任一失败即拒绝推送；receipt 写入 `artifacts/receipts/`（本机产物，gitignore）。
4. 直接 `--no-verify` 仍可绕过；夜间/深检与 `gitfacts` 的 stamp 检查补漏。

## 验收

- 正常 feature push：全量 gate PASS → receipt 生成 → 推送通过。
- 人为删除/篡改 receipt：pre-push 拒绝。
- 全量 gate PASS。

## 边界

- Receipt 不含变异/属性结果（后续批次加入）；当前记录 gate checks、changedFiles、规则实现数。
- Receipt 是本地证据；远端 required checks 仍待 GitHub Pro/公开。
