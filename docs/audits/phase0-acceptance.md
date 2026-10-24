# 阶段 0 验收记录（本地质量护栏）

- 日期：2026-10-24
- 仓库：`GameKingdomNatives/AI-specific_ECS`（private）
- HEAD：以本文件所在提交为准
- 结论：**本地护栏可运行；0.3 完成、0.1 完成、0.2 仍部分（DSH 每日 prompt 未改只读），因此不能宣称阶段 0 全绿。**

## 批次矩阵

| 批次 | 状态 | 证据 | 缺口 |
|---|---|---|---|
| 0.1 本地护栏 | ✅ 完成 | pre-push/tree stamp/main 直推拦截/safe-merge；`npm run hooks:test` 5 组 PASS；`docs/audits/phase0-batch-0.1.md` | `--no-verify` 可绕过；远端 required checks 未接 |
| 0.2 深检/夜检 | ⚠️ 部分 | deep-audit、每 5 次提交拦截、20:00 任务、`engineering/audits`；DSH 原生 schedule 投递与 `dsh-review` 实测 | DSH 每日 prompt 仍是 nightly 旧命令，需 UI 改只读；Windows 任务暂作 fallback |
| 0.3 规则/CLI/回执 | ✅ 完成 | 10/10 rules；`itb` CLI；`check --changed` 2.0s；Receipt 进 pre-push；`docs/audits/phase0-batch-0.3.md` | API 快照非语义 diff；starter 真冒烟待阶段 4 |
| 0.4 收口 | 🟡 本次 | 本文件 + handoff + 005 状态 + 记忆 | 依赖 0.2 DSH 收口 |

## 关键证据

- 全量 gate：`artifacts/gate/20261024T103606Z/report.md` PASS（之后每次提交再刷新）。
- 深检：`deep` PASS；stamp 链在 `.gate/`，`gitfacts` 校验未盖章提交。
- 规则表：`contracts/harness.json` 10 条全部 implemented；每条有 guide/sensor/negativeTest。
- drill：11 条违规演练全部“拦住 PASS”（含 API 声明漂移、预算告警删除、热路径 emit、系统直改结构、删系统卡）。
- Receipt：`pre-push` 校验 `artifacts/receipts/<HEAD>.json` 的 head 与 gatePassed。
- 检查性能：`itb check --changed` 1.99s（工具改动场景；有引擎改动按关键词选测试，无匹配回退全部）。

## 残余风险（必须继续跟踪）

1. **DSH 只读不是 OS 级**：专用会话是 workspace-write，靠 prompt 约束；提醒回投原 Session，不是每轮新会话。
2. **旧 DSH 每日 prompt**：仍会跑 `nightly.mjs`，在沙箱 EPERM；测试 schedule 已 inactive，但每日条目需 UI 改。
3. **Windows 任务**：`AI-specific_ECS-Nightly` 20:00 Ready，作为 DSH 修好前 fallback；两者都跑会重复。
4. **报告不可追溯**：`.gate/` 与 `engineering/audits/` gitignore；远端无法复核 stamp，CI 接入后再补。
5. **API surface 快照**：哈希只能发现变化，不能表达语义；api-extractor 后置。
6. **check 选择粒度**：impact→测试仍是关键词启发式，遇到跨模块改动需回退全量。
7. **没有分支保护服务端**：GitHub Free 私有库 403；本地 guard 是唯一防线。

## 阶段 0 出口判定

- 本地“提交前可验证、推送前可拦、回执可查、夜检可留证”成立。
- “DSH 独立只读会话闭环”不成立，只能写“原生定时投递可用，只读角色未强制”。
- 因此：**阶段 0 部分完成**；完成 0.2 的 DSH prompt 后再宣布阶段 0 收口。

## 下一阶段（004/005）

1. 契约/能力：`createEngine` 单一门面、能力注册表、系统 Spec。
2. 契约测试 + 属性/黄金测试（fast-check 已批准）。
3. 引擎独立化：demo 抽出、private 本地 pack、starter 真冒烟。
4. 变异测试/MCP 后置。
