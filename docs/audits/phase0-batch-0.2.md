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

## DSH 边界（关键发现）

- **DSH 原生 schedule 插件存在**：`@deepseek-ai/dsh-schedule` + `schedule_create/list/update/delete` 工具，投递回原始 Session；Host 会在到期时恢复冷 Session。
- 已创建专用独立会话 `session-4a936cd6-6f52-4f5d-b275-d8549750f57e`（ITB Nightly Audit），并在其内创建：
  - 每日 20:00（Asia/Shanghai）：`schedule-2ec612ea-d224-47f8-a20e-86356eed92b1`
  - 一次性 150 秒测试：`schedule-3acbef8a-e639-406c-9ae3-f0319d27abda`
- 测试提醒已触发到该独立会话（turn #2）；审计报告已写入 `engineering/audits/2026-10-24/dsh-review.md`。
- 但该会话内执行 `node tools/nightly.mjs` 第一行 `execFileSync('git', ...)` 就 EPERM（DSH 沙箱禁止管道子进程）；它改为手工拆跑 gate，得到 53 PASS / 5 FAIL（5 项均为环境假红），并发现 G1–G9 规则缺口。
- 正确架构应分工：Windows 计划任务负责跑 gate/deep 并产出报告；DSH 独立会话只读报告、写 `dsh-review.md`，不在会话内再跑 gate。现有 schedule 的 prompt 仍含 nightly 命令，需要更新/删除后重建；未完成前不声称“DSH 夜间闭环已完成”。

## DSH 测试审计发现（来自独立会话）

- 报告：`engineering/audits/2026-10-24/dsh-review.md`（本机，gitignore）。
- **G1 严重 fail-open**：`tools/checks/gitfacts.mjs` 用 `origin/HEAD`（本仓库不存在）且不看退出码，未盖章提交检查实际零检查。
- **G2 严重 fail-open**：`tools/checks/findings.mjs` 永不 `process.exit`，depcruise 解析失败被静默跳过。
- **G3 中**：eslint 3 条 warning 仍 PASS（`scene-runtime.ts` 三条过期 disable 注释）；**已修（5467954，清理后 warnings=0）**。
- **G4–G9**：drill 把崩溃当抓住违规；`.gate/`/`engineering/audits/` gitignore 与“可入仓”矛盾；gate 无环境指纹；夜检目录用 UTC 日期；同日覆盖无 stale 标记；nightly note 写死。
- **DSH 口径**：原生定时投递成立；目标是**专用会话**（非每轮新会话）；该会话 workspace-write，不是 OS 只读，只靠 prompt 约束。不能写成“独立只读会话已闭环”。
- 需要动作：把每日提醒改为只读消费报告、删除 150s 测试 schedule；G1–G4 在 `tools/` 保护路径，需人工批准后修。


## 限制

- 深检目前是 gate + 汇总，不含属性/变异/黄金/API/pack；这些在阶段 1–3。
- 报告目录默认 gitignore；需要长期留档时手动归档或改 ignore 策略。
- Windows 计划任务只在当前用户登录时运行（Interactive only）；DSH schedule 依赖 Host 运行，Host 不在时会延迟/补投。

## 下一步

1. 把 DSH 每日提醒改为“只读消费 `engineering/audits/<date>/report.md` + 写 dsh-review”，删除旧的 nightly 命令 prompt。
2. 进入 Batch 0.3：`contracts/harness.json`、`itb` CLI、影响分析、Receipt、10 条规则负例。
