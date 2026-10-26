# ADR-059 · 分支生命周期自动化与逐 ref 证据

- 状态：已采纳（2026-10-25）
- 关联：`docs/runbooks/05-分支生命周期.md`、`tools/flow.mjs`、`tools/hooks/pre-push.mjs`、ADR-042、ADR-058

## 背景

旧策略是「半自动化」：

1. `pre-push` **一律拒绝直接推送 main**，除非 `ALLOW_MAIN_PUSH=1`；于是交付必须先建 feature 分支，再手动跑 `safe-merge`。
2. `pre-push` 只校验**当前 HEAD** 的 stamp/receipt，不是**被推送的每个 ref**；推分支与推 main 的规则不一致，也解释不了「分支策略没执行」。
3. 没有清理机制：仓库累积了 **61 个一次性分支**（全部已合并进 main），每次 `branch -vv` 都是噪音。
4. 人被迫记分支命令——这违反「基础工作交工具、AI 负责自动化策略」的既定口径。

## 决策

1. **逐 ref 证据校验**：`pre-push` 对每个被推送的 tip 校验 gate stamp；HEAD 另校验 receipt 与深检节奏。**不再按分支名拒绝 main**。
2. **一个入口**：`node tools/flow.mjs ship` 完成「门禁 → receipt → 按需深检 → ff-only 合并 → 推送 → 删除已合并分支」。
3. **清理自动化**：`node tools/flow.mjs sweep` 删除已合并本地分支（先用 `-d`，仅在「已确认 merge 进 main」时退化到 `-D`）；`--remote` 尝试删除对应远端分支（需要网络）。
4. **策略可视化**：`status` 列出分支的合并状态/年龄/stamp；`policy` 在没有 stamp/receipt 或存在过期未合并分支时红。
5. 保留 `safe-merge` 作为兼容路径，但不再是唯一路径。

## 后果

- 正面：交付不再依赖「先建分支再合并」的人肉顺序；推送失败只剩「证据不足」与「网络」两种，且都能被 `flow`/`push` 工具定位。
- 本轮清理：删除 **58** 个已合并本地分支，仅保留 main；远端 2 个一次性分支待网络恢复后用 `flow sweep --remote` 清理。
- 风险：`-D` 只在 `merge-base --is-ancestor <branch> main` 为真时使用；未合并分支永远不会被自动删除。
