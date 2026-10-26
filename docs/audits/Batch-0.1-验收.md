# Batch 0.1 验收：本地分支护栏

- 日期：2026-10-24
- 分支：`feat/batch-0.1-local-guards` → main `ddc95f1`
- 结论：**通过**（本地护栏可用；远端 GitHub 分支保护仍不可用，等 Pro/公开）

## 交付

- `.githooks/pre-push`：改调 `tools/hooks/pre-push.mjs`。
- `tools/hooks/push-guard.mjs`：解析 push refs、main 直推判断、深检到期、stamp 校验。
- `tools/hooks/pre-push.mjs`：main 直推拦截 → 全量 gate → HEAD stamp → 深检节奏。
- `tools/hooks/safe-merge.mjs`：feature → main ff-only + 全量 gate + `ALLOW_MAIN_PUSH=1` push。
- `tools/hooks/install.mjs`、`tools/hooks/test.mjs`。
- `package.json`：`hooks:install`、`hooks:test`、`merge:local`。
- ADR-042、`docs/guides/本地分支护栏使用说明.md`。

## 证据

| 验证 | 结果 |
|---|---|
| `npm run hooks:test` | 5 组 PASS（解析、直推 main、feature 允许、缺 stamp、深检阈值） |
| feature push `feat/batch-0.1-local-guards` | 新 pre-push 跑全量 gate PASS（`20261024T082916Z`），写 stamp `89b4b27…`，允许 push |
| 真实 main 直推（本地 bare remote） | 被拒绝：`[pre-push] 拒绝对 main 的直接推送`，退出码 1 |
| `npm run merge:local` | 全量 gate PASS（`20261024T083248Z`）→ ff-only 合并 → push main `ddc95f1` 成功 |
| 网络 | HTTPS 到 github.com 仍不稳，SSH remote 可用；真实远端 main 直推测试受网络影响，用本地 bare remote 等价验证 |

## 限制（已写 ADR/指南）

- `--no-verify` / `ALLOW_MAIN_PUSH=1` 可绕过；夜间审计（Batch 0.2）扫描缺失 stamp 的提交。
- 远端 required checks 仍不可用（GitHub Free 私有库 403）。
- 深检阈值逻辑已实现但 `.gate/deep-stamp.json` 尚未产生，实际第 5 次提交拦截在 Batch 0.2 演练。

## 下一步

Batch 0.2：`deep-audit.mjs`、`.gate/deep-stamp.json`、每 5 次提交演练、20:00 夜检 + `engineering/audits/`、DSH 独立会话能力验证。
