# DSH 不夜间审计收口（2026-10-24）

## 目标架构

```text
20:00 Windows 计划任务（确定性生产）
  └─ node tools/nightly.mjs → gate + deep-audit
       └─ engineering/audits/<date>/report.md + summary.json
20:00 DSH 专用会话（只读消费）
  └─ 读 report/summary → 写 dsh-review.md
```

## 已执行

1. **DSH 每日任务改为只读**
   - `schedule-2ec612ea-d224-47f8-a20e-86356eed92b1`（session-4a936cd6）prompt 改为：只读 `engineering/audits/<今天>/report.md` + `summary.json`，写 `dsh-review.md`，不运行 gate/nightly，不改代码/门禁/批准文件，不提交/推送。
   - 测试任务 `schedule-3acbef8a-…` 已从存储删除。
2. **schedule 插件热重载**
   - `dev_reload_package("dsh-schedule")`：OK，重建 1 个 fiber；让存储中的新 prompt 生效。
3. **Windows 生产任务保留并重装**
   - `AI-specific_ECS-Nightly`：Next Run 2026-10-25 20:00，Status Ready，Interactive only。
   - 它不是 DSH 的重复，而是只读会话的唯一确定性报告来源。

## 验证

- `schedule.json` 只剩 1 条 active 每日任务；prompt 已是只读文本。
- Windows 任务重新创建成功并 Ready。
- DSH schedule 插件热重载 OK。

## 待观察

- 新只读 prompt 的**首次实际投递**要等 2026-10-25 20:00；当前只验证了存储、插件与计划任务，不声称“新 prompt 已投递”。
- Windows 任务只在当前用户登录时运行（Interactive）。
