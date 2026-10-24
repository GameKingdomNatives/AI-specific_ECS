# 契约目录（机器可读）

本目录是 AI 与工具查询的**机器可读契约**；Batch 0.3 已把 10 条规则全部接入 gate。

| 文件 | 作用 | 状态 |
|---|---|---|
| `harness.json` | 规则表：guide / sensor / negativeTest / 审批级别 | 10 条全部 implemented |
| `capabilities.json` | 当前 9 个系统的 phase、系统卡、契约测试、scene | 只读索引，供 `itb inspect` 使用 |
| `api-surface.json` | 5 个公共声明入口的 SHA-256 快照 | API 变化需人工评审更新 |

约定：

- `status: implemented` 表示现有 gate 已覆盖；`planned` 表示本轮/后续要实现，**不能当成已执行**。
- 每条规则必须同时有 guide、sensor、negativeTest；缺一不可，`QUAL-001` 负责检查。
- 修改 `harness.json` 是 SOFT；修改 `tools/` 下的 sensor 或 gate 是 HARD。
- `tools/checks/harness.mjs` 已作为 gate 步骤运行；`tools/itb.mjs` 已提供 inspect/impact/check/gate/receipt；`planned` 仍未接入完整闭环。
- 规则 ID 稳定；新增规则先登记再实现，不允许匿名检查。
