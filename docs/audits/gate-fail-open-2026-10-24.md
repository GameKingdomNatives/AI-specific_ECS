# 门禁 fail-open 审计（DSH 独立会话发现，2026-10-24）

- 来源：专用 DSH 审计会话 `session-4a936cd6-6f52-4f5d-b275-d8549750f57e` 的测试提醒审计
- 原始报告：`engineering/audits/2026-10-24/dsh-review.md`（本机产物，已 gitignore）
- 触发：17:00:23 的 150s 测试提醒；HEAD `eea9138`；同一 HEAD 非沙箱会话连续三次 PASS
- DSH 会话 gate：53 PASS / 5 FAIL，5 项均为沙箱管道子进程限制（depcruise/build/storybook/starter/drill），非代码违规

## 结论

**投递链可用，但不能把“DSH 独立只读会话”写成已闭环**：会话独立于主上下文成立；每轮新会话不成立；OS 级只读不成立（workspace-write，仅靠 prompt 约束）。

## 发现清单

| ID | 严重度 | 问题 | 位置 | 状态 |
|---|---|---|---|---|
| G1 | 严重 | 未盖章提交检查用 `origin/HEAD`（本仓库不存在）且不看退出码，实际零检查 | `tools/checks/gitfacts.mjs:56` | **待批准** |
| G2 | 严重 | `findings` 永不失败；depcruise 解析失败被静默跳过 | `tools/checks/findings.mjs:50-56,78,117-121` | **待批准** |
| G3 | 中 | eslint 3 条 warning 仍 PASS，违反“没有警告通过” | `apps/game/src/scene-runtime.ts:18/30/32` | **已修（5467954，warnings=0）** |
| G4 | 中 | drill 把 `status=null`（崩溃）当“抓住违规” | `tools/drill.mjs:73-75` | 待批准 |
| G5 | 中 | `.gate/`、`engineering/audits/` gitignore 与“可入仓”文档矛盾 | `.gitignore:9-10`、`engineering/README.md` | **文档已澄清（README：本机产物）**；stamp 仍本机 |
| G6 | 中 | gate 不区分“环境不可用”与“违规”，无环境指纹 | `tools/gate.mjs`/报告 | 待设计 |
| G7 | 低 | 夜检目录用 UTC 日期，凌晨补跑错位 | `tools/nightly.mjs:9` | 待批准 |
| G8 | 低 | 同日覆盖且无 stale 校验 | `tools/nightly.mjs`/consumer | 待批准 |
| G9 | 低 | `nightly.json` note 写死 | `tools/nightly.mjs:21-27` | 待批准 |

## 需要人工批准的最小修复

1. **G1**：改用 `origin/main` 或 `@{u}`；`status !== 0` / 无解析结果直接判红；`gitList` 用文件重定向避开管道。
2. **G2**：findings 明确作门禁；解析失败、warnings>0 必须非零退出。
3. **G4**：drill 三态（拦住/没拦住/没跑起来）；`run.status === null` 或 `run.error` 不算抓住。
4. **G7/G8/G9**：Asia/Shanghai 日期、stale 标记、note 由结果计算。
5. **G6**：报告记录环境指纹与“因环境未执行”的步骤，禁止算 PASS。

> 这些都在 `tools/` 保护路径；按 AGENTS.md，需人工批准后修改并补负例。G3 是 AUTO 区，已修。

## 正确 DSH 分工

```text
Windows 计划任务 20:00
  └─ gate + deep-audit → engineering/audits/<date>/report.md
DSH 专用会话 20:00（schedule 提醒）
  └─ 只读 report/summary → dsh-review.md
```

不要让 DSH 会话内再跑 `nightly.mjs`；当前旧 prompt 仍含该命令，需在 DSH Schedule UI 更新/删除后重建。
