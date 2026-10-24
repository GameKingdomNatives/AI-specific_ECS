# Batch 0.3 进展：规则表 / itb / receipt（部分完成）

- 日期：2026-10-24
- 分支：`feat/batch-0.3-itb-receipt`
- 结论：**工具骨架可用，10 条规则中 4 条 implemented、6 条 planned**；`check --changed` 实测 21.2s，尚未达到 ≤20s 目标。

## 交付

- `contracts/harness.json` / `capabilities.json` / `README.md`：规则与系统索引。
- `tools/checks/harness.mjs`：规则表 schema、ID 唯一、guide/sensor/negativeTest 路径、系统卡/契约测试路径校验；已加入 gate 步骤 `harness`。
- `tools/itb.mjs`：
  - `inspect`：规则/系统清单；
  - `impact`：变更文件 → 规则/建议测试/门禁级别；
  - `check --changed`：当前实现为 fast gate（21.2s，未达 20s）；
  - `gate`：全量 gate + receipt；
  - `receipt`/`status`。
- `tools/receipt.mjs`：从最新 gate 报告生成 `artifacts/receipts/<head>.json`，含 head/tree/checks/changedFiles/规则实现数。
- `package.json`：`itb`、`receipt`、`check:changed`。

## 证据

| 验证 | 结果 |
|---|---|
| `node tools/checks/harness.mjs` | PASS；规则 4/10 implemented，系统 9 |
| `node tools/itb.mjs inspect` | 列出 10 规则/9 系统 |
| `node tools/itb.mjs impact` | 输出 changed/affectedRules/suggestedTests/gateLevel |
| `node tools/receipt.mjs` | 生成 `artifacts/receipts/e3c78470…json` |
| `node tools/itb.mjs check --changed` | PASS，1,992ms（harness+registry+tsc；本轮无引擎源码改动，测试按影响跳过） |
| `node tools/itb.mjs gate` | 因未设置 ALLOW_PROTECTED、工作区含 package.json/tools 修改而正确拒绝（保护路径生效） |
| 全量 gate | 提交后跑；只有全量通过才写 stamp |

补充：`check --changed` 已从 21.2s 的 fast gate 换成 `tools/check-changed.mjs`（2.0s）；有引擎源码改动时会按关键词选测试，无匹配则回退全部编译测试。性能达标，但选择粒度仍需后续打磨。

## 未完成

- 6 条 `planned` 规则还没有 sensor/negativeTest：ARCH-001/002、QUAL-001、PERF-001、SCENE-001、API-001。
- `check --changed` 还不是“按影响选择测试”，只是 fast gate；需要真正 impact→测试子集，目标 ≤20s。
- Receipt 尚未接 pre-push 校验；目前是生成器 + 证据，不是强制门。
- DSH 旧每日 prompt 仍待 UI 更新；Windows 任务仍作为 fallback。

## 下一步

1. 实现 `system-structure`/`hot-path`/`api-report`/`scene-contract` sensor 与对应负例，把 planned 转 implemented；
2. 用 impact 选择受影响测试，替代 check 的 fast gate；
3. pre-push 校验 receipt 与 stamp；
4. DSH prompt 改成只读消费后停 Windows 任务。
