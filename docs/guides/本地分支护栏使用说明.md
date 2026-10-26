# 本地分支护栏使用说明

> 这是**护栏**，不是安全边界。`git push --no-verify` 仍可绕过；夜间审计会扫描没有 gate stamp 的提交。

## 安装

```bash
npm run hooks:install
npm run hooks:test
```

`hooks:install` 会设置 `core.hooksPath=.githooks`，并检查 pre-commit/pre-push 存在。

## 日常

```bash
git checkout -b feat/<batch>-<topic>
# 编辑、提交（pre-commit 自动 gate --fast）
npm run merge:local     # 全量 gate → ff-only 合并 main → push main（ALLOW_MAIN_PUSH=1）
```

- 在 feature 分支直接 `git push origin main` 会被拒绝。
- 在 feature 分支 `git push origin feat/...` 会跑全量 gate，并校验当前 HEAD 的 stamp。
- 没有 stamp、或深检到期，push 被拒绝。

## 紧急绕过

只有明确知道原因时才用：

```bash
ALLOW_MAIN_PUSH=1 git push origin main
git push --no-verify
```

绕过会在夜间审计报告里体现为“缺 stamp 提交”；不要把它当常态。

## 故障排查

| 现象 | 处理 |
|---|---|
| `缺少 <sha> 的 gate stamp` | 重新跑 `npm run gate`，确认工作区干净；再 push |
| `距上次深检已 N 个提交` | 跑深检（Batch 0.2 后 `npm run deep`），写 deep stamp；或临时 `--no-verify` 并记录原因 |
| `safe-merge` 提示 main 分叉 | 在 feature 分支 rebase main，重新 gate |
| hook 没执行 | `git config core.hooksPath` 应为 `.githooks`；GitBash/Node 可用 |

## 限制

- 不防 `--no-verify`、不防强推、不防本地直接改 `.githooks`；这些由“保护路径 + 夜间审计 + 未来 GitHub required checks”补。
- 远端 branch protection 当前因 GitHub Free 私有库 403 不可用；本地稳定后再决定 Pro/公开。
