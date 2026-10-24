# Batch 0.2 验收：深检与夜间审计

- 日期：2026-10-24
- 分支：`feat/batch-0.2-deep-nightly`
- 结论：**部分完成**——deep-audit、每 5 次提交拦截、20:00 计划任务已可用；DSH 独立会话仍未原生接入，只有只读 prompt/降级路径。

## 交付

- `tools/deep-audit.mjs`：全量 gate + coverage/replay/bench 汇总 + 缺失 stamp 扫描；成功写 `.gate/deep-stamp.json` 与 `deep-<HEAD>` stamp。
- `tools/nightly.mjs` / `nightly.cmd` / `nightly-install.mjs`：20:00 Windows 计划任务，报告写 `engineering/audits/<date>/`。
- `engineering/README.md`；`engineering/audits/`、`engineering/source/` 作为本地工程产物（已 gitignore，避免每日噪声）。
- `package.json`：`deep`、`deep:dry`、`nightly`、`nightly:dry`、`nightly:install`。
- ADR-043。

## 证据

| 验证 | 结果 |
|---|---|
| `npm run deep` | 全量 gate PASS `20261024T084438Z`；deep stamp 写 HEAD `525b7c8`；coverage 84.7%、replay PASS、bench 0.704ms |
| 第 5 次提交深检拦截 | 人为写 `.gate/deep-stamp.json` 为 `HEAD~5`，推本地 bare remote：全量 gate PASS 后仍被拒（`距上次深检已 5 个提交…`） |
| deep stamp 恢复 | 实际 deep 重跑后写回 HEAD，拦截解除 |
| `npm run nightly` | 实际跑完 PASS；`engineering/audits/2026-10-24/report.md` 生成；gate `20261024T084520Z` |
| `npm run nightly:install` | 任务 `AI-specific_ECS-Nightly` 创建成功，Next Run 20:00 |
| 手动触发计划任务 | `schtasks /Run` → Last Result `0`（成功），日志写 `engineering/nightly.log` |

## DSH 边界（未完成）

- 已生成 `engineering/audits/<date>/dsh-prompt.md`（只读审计提示）。
- 尚未验证 DSH 能否原生定时启动独立会话；当前没有把“DSH 已自动运行”写进结论。
- 下一步二选一：最小 daemon-loop 插件，或 Windows 计划任务跑审计 + DSH 会话只消费报告。

## 限制

- 深检目前是 gate + 汇总，不含属性/变异/黄金/API/pack；这些在阶段 1–3。
- 报告目录默认 gitignore；需要长期留档时手动归档或改 ignore 策略。
- 计划任务只在当前用户登录时运行（Interactive only）；换机器需重装。

## 下一步

1. 完成 DSH 独立会话（插件/计划任务降级二选一）。
2. 进入 Batch 0.3：`contracts/harness.json`、`itb` CLI、影响分析、Receipt、10 条规则负例。
