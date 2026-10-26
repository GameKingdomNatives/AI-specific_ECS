# DSH 夜间独立会话：已验证与待收口

## 结论

- DSH 原生定时能力来自 `@deepseek-ai/dsh-schedule`（Host 服务）与 `schedule_create/list/update/delete` 工具。
- 提醒**投递回创建它的原始 Session**；要得到“独立会话”，需要先创建一个专用 Session，再在该会话内创建提醒。
- 2026-10-24 已实测：专用会话 `session-4a936cd6-6f52-4f5d-b275-d8549750f57e` 创建了：
  - 每日 20:00：`schedule-2ec612ea-d224-47f8-a20e-86356eed92b1`
  - 150 秒测试：`schedule-3acbef8a-e639-406c-9ae3-f0319d27abda`
- 测试提醒已投递到该独立会话（turn #2），证明 Host 恢复/投递链路可用。
- **但**该会话内执行 `node tools/nightly.mjs` 在沙箱/子进程上受阻，尚未写 `dsh-review.md`。不要把“已投递”说成“审计闭环已完成”。

## 已实测结果（2026-10-24）

- 测试提醒 17:00:23 准时投递到专用会话，并产出 `engineering/audits/2026-10-24/dsh-review.md`。
- 但会话内 `node tools/nightly.mjs` 第一行 `execFileSync('git', ...)` 触发 EPERM（沙箱禁止管道子进程）；随后它手工拆跑 gate，得到 5 项环境假红，并发现 G1–G9 规则缺口（G1/G2 为 fail-open）。
- 因此“投递链可用”成立，“会话内直接跑 nightly”不成立；旧 prompt 仍是这条错误路径。

## 正确分工

```text
20:00 Windows 计划任务
  └─ node tools/nightly.mjs
       ├─ 全量 gate + deep-audit
       └─ engineering/audits/<date>/report.md + summary.json
20:00 DSH 独立会话（schedule 提醒）
  └─ 只读 report/summary
       └─ 写 engineering/audits/<date>/dsh-review.md
```

DSH 会话不要再跑 gate；确定性证据由计划任务/本地 gate 生产。

## 专用会话提示（只读版）

```text
你是「深入战火 / AI-specific_ECS」的专用夜间审计会话。
读取 engineering/audits/<今天>/report.md 与 summary.json；
把失败项、未盖章提交、规则缺口写入 engineering/audits/<今天>/dsh-review.md。
只读代码，不修改代码/门禁/批准文件，不提交、不推送，不运行 gate。
```

## 清理

旧的每日/测试 schedule 仍绑定在 `session-4a...`；当前主会话无法跨会话删除。需要在 DSH Schedule UI 中删除这两个 id，或等旧会话恢复后用它的 `schedule_delete` 清理，然后按只读版重建。

## 限制

- Host 必须在运行；冷 Session 到期时由 Host 恢复。
- schedule 的“新 Session 每次运行”不支持；这里是一个专用 Session 被反复投递。
- 子进程/沙箱权限可能限制会话内的命令；只读消费报告是稳的默认分工。
