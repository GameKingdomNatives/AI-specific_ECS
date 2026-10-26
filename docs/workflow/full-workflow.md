# 完整工作流 · 从开工到交付

> 面向执行者（AI 或人）。所有命令都可直接照抄；所有失败都有对应的判定入口。
> 流程定义见 `iteration-workflow.md`，本文件是**操作手册**。

## 0. 适用范围

适用于本仓库的两个平级项目（引擎 `packages/engine`、游戏 `apps/game`）以及工程内核（`tools/`、`contracts/`）。不适用于发布到 npm 之后的消费者仓库。

## 1. 开工前（30 秒）

```bash
node tools/status.mjs          # HEAD / 分支 / 脏文件 / 上次门禁 / 环境
git status --short             # 确认没有意外改动
```

读三样东西：

1. `docs/handoff.md` 顶部（当前状态、待人裁定、环境结论）；
2. `docs/workflow/iteration-workflow.md`（本轮流程与证据口径）；
3. `工程文档/迭代记录/` 最后一个迭代记录（上一轮做到哪）。

## 2. 立项（写记录，不超过 10 分钟）

1. 选 **1–2 个目标**，写清「包含 / 不包含」；
2. 复制 `工程文档/_模板/iteration.md` → `工程文档/迭代记录/iter-NNN-<slug>.md`；
3. 过一遍 `工程文档/_模板/start-checklist.md`；
4. 确认不违反 `AGENTS.md` 的 10 条边界。

状态字段：`进行中` → `待验收` → `已完成 / 已中止`。

## 3. 执行（单点串行）

- 一个目标拆 2–5 个功能，一个功能拆 2–4 个检查点；一个检查点 30 分钟–2 小时。
- 每个检查点跑 `node tools/gate.mjs --fast`（或受影响测试）。
- 同一检查点 **3 轮修不过就停**，写进迭代记录并上报。
- 功能完成即更新系统卡 / `docs/handoff.md`，不等迭代结束。

## 4. 自检与交付（一条命令）

```bash
node tools/flow.mjs policy     # 先看证据是否齐：HEAD 的 stamp+receipt、过期分支
node tools/flow.mjs ship       # 门禁 → receipt → 按需深检 → ff-only 合并 → 推送 → 删已合并分支
```

`ship` 内部顺序：

1. 工作区必须干净（否则拒绝）；
2. 全量 `gate`；
3. `receipt`；
4. 距上次深检 ≥5 提交且无深检 stamp → 自动 `deep-audit`；
5. 非 main 分支 → `git merge --ff-only` 进 main；
6. `git push --follow-tags origin main`（pre-push 复用已有 stamp，不重复跑门禁）；
7. 删除已合并的当前分支。

> 推送失败不会自动放宽任何检查。失败先分类（见 §6），不要用 `--no-verify`。

## 5. 收尾（每次迭代）

- [ ] `node tools/gate.mjs` 全量；把报告摘要写进回复与交接；
- [ ] 更新 `docs/handoff.md`（完成 / 下一步 / 待人裁定 / 环境说明）；
- [ ] 更新 `docs/quality-log.md` 一行；
- [ ] 迭代记录填完检查点、证据分层、回顾；
- [ ] 需要人判定的迭代：把 `工程文档/验收记录/` 的表填完，结论写「通过 / 需重做 / 中止」；
- [ ] 有 HARD 决策 → 补 ADR；
- [ ] 需要清理 → `node tools/flow.mjs sweep`。

## 6. 失败处理矩阵

| 现象 | 先看什么 | 处理 |
|---|---|---|
| gate 某步 FAIL | `artifacts/gate/<run>/<step>.log` | 真失败就修；L3（环境）在报告里有指纹与提示，不计 PASS |
| `pre-push` 说缺 stamp | 被打出的 ref + sha | 跑 `node tools/flow.mjs ship`；它会在推送前补齐 |
| `pre-push` 说缺 receipt | `artifacts/receipts/<head>.json` | `ship` 会自动生成；手动：`node tools/receipt.mjs` |
| 深检到期（≥5 提交） | `.gate/deep-stamp.json` | `ship` 自动跑 `deep-audit`；也可手动 |
| tag 被拒（指向历史外） | `git rev-parse <tag>^{commit}` | 不要强推；确认 tag 是否该存在 |
| `Connection reset` / 超时 | `node tools/push.mjs` 的通道结论 | 22 → 443 → HTTPS → bundle，见 `docs/runbooks/04-推送与网络策略.md` |
| 分支堆积 | `node tools/flow.mjs status` | `sweep` 删已合并；未合并只报告 |
| 工作区不干净导致拒推 | `git status --short` | 提交或清理；生成物进 `artifacts/`（已忽略） |

## 7. 命令速查

```bash
node tools/status.mjs                 # 开工状态
node tools/gate.mjs [--fast]          # 全量 / 快速门禁
node tools/flow.mjs status|policy|sweep|ship
node tools/push.mjs [--go]            # 推送通道诊断
node tools/receipt.mjs                # 交付回执
node tools/deep-audit.mjs [--dry-run] # 深检
node tools/nightly.mjs --dry-run      # 夜检（本机）
node tools/panel/collect.mjs          # 治理面板数据
npm run flow                          # = node tools/flow.mjs
```

## 8. 迭代产物与命名

| 产物 | 位置 | 命名 |
|---|---|---|
| 迭代记录 | `工程文档/迭代记录/` | `iter-NNN-<slug>.md` |
| 验收记录 | `工程文档/验收记录/` | `验收-NNN[-NNN]-<主题>.md` |
| 方向校正 / 回顾 | `工程文档/校正记录/` | `YYYY-MM-DD-<slug>.md` |
| 决策 | `docs/adr/` | `NNN-<slug>.md` |
| 系统卡 | `docs/systems/` | `<system-id>.md` |
| 门禁报告 | `artifacts/gate/<run>/` | 自动 |
| 回执 | `artifacts/receipts/` | `<head>.json` |
| 深检 | `artifacts/deep/<time>/` | 自动 |

## 9. 发布线（npm 首包）

1. 解冻后（约 2026-10-28）确认 passkey/TOTP；
2. `npm stage list` → 旧 stage 过期则 reject 后重新 stage；
3. 交互式 `npm publish`（或 `--otp` approve）；
4. 首包后配置 OIDC trusted publishing；
5. 再接 GitHub Actions 夜检。

## 10. 自动化边界

- 能自动化的：状态、门禁、回执、stamp、深检节奏、分支清理、推送通道诊断。
- 只能由人给结论的：手感、可读性、是否好玩、方向取舍、发布 2FA 交互——固定问题表见 `工程文档/验收记录/`。
- **不允许**：用 `--no-verify` 绕过、用 "已知问题" 替代修工具、把 L3 当 PASS。
