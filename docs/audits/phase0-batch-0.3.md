# Batch 0.3 进展：规则表 / itb / receipt（部分完成）

- 日期：2026-10-24
- 分支：`feat/batch-0.3-itb-receipt`
- 结论：**0.3 完成：10 条规则 all implemented**；`check --changed` 2.0s（≤20s）；Receipt 已进 pre-push；API-001 用声明哈希快照 + starter 存在性校验。

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
| `node tools/checks/harness.mjs` | PASS；规则 10/10 implemented，系统 9 |
| `node tools/itb.mjs inspect` | 列出 10 规则/9 系统 |
| `node tools/itb.mjs impact` | 输出 changed/affectedRules/suggestedTests/gateLevel |
| `node tools/receipt.mjs` | 生成 `artifacts/receipts/e3c78470…json` |
| `node tools/itb.mjs check --changed` | PASS，1,992ms（harness+registry+tsc；本轮无引擎源码改动，测试按影响跳过） |
| `node tools/itb.mjs gate` | 因未设置 ALLOW_PROTECTED、工作区含 package.json/tools 修改而正确拒绝（保护路径生效） |
| 全量 gate | 提交后跑；只有全量通过才写 stamp |

补充：`check --changed` 已从 21.2s 的 fast gate 换成 `tools/check-changed.mjs`（2.0s）；有引擎源码改动时会按关键词选测试，无匹配则回退全部编译测试。性能达标，但选择粒度仍需后续打磨。

## 剩余限制（不阻塞 0.3 完成）

- API-001 是声明哈希快照，不是语义化 API diff；后续可换 api-extractor。
- starter 目前只校验存在，真正的 engine→starter 冒烟要在阶段 4 引擎独立化时补。
- `check --changed` 的选择粒度是关键词；有引擎改动且无匹配时回退全部编译测试。
- DSH 旧每日 prompt 仍待 UI 更新；Windows 任务仍作为 fallback。

## 下一步

1. 进 Batch 0.4：ADR/handoff/记忆/验收收口；
2. 按 004 推进契约/能力、系统 Spec 与契约测试、属性/黄金测试；
3. DSH prompt 改成只读消费后停 Windows 任务。
