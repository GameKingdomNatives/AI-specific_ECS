# Phase 1 · 能力/场景一致性（第一批）

- 日期：2026-10-24
- 状态：完成
- 目标：机器可读能力表与运行时 scene 系统清单不能各说各话。

## 新增

- `tools/checks/capabilities.mjs`：
  - scene `systems[]` 的每个 id 必须能在 `contracts/capabilities.json` 找到；
  - phase 必须一致；
  - 能力表里的系统必须出现在 demo scene 中。
- gate 步骤 `capabilities`；`删能力条目` drill 验证会红。
- `contracts/capabilities.json` 以 scene 为运行时真值修正两处 phase：
  - `demo.weapon`：ai → damage；
  - `physics.bodySync`：movement → collision。
- 每个系统新增 `spec: { inputs, outputs, owns }`，capabilities 检查要求三个字段都是非空数组；`删系统Spec` drill 验证会红。

## 证据

| 检查 | 结果 |
|---|---|
| `node tools/checks/capabilities.mjs` | PASS：9 个系统 |
| `node tools/drill.mjs` | 13 条全部“拦住 PASS”，含 `删能力条目`、`删系统Spec` |
| `node tools/gate.mjs --fast` | PASS `20261024T104354Z` |
| 全量 gate | 随提交/推送跑 |

## createEngine 门面（Phase 1）

- 新增 `packages/engine/src/engine.ts` + `createEngine(options)`：单一入口创建 World/EventBus/CommandBuffer/Scheduler/FixedClock。
- `step()`/`advance()`/`start()`/`stop()`/`dispose()`；`engine-facade.test.ts` 3 组通过。
- API surface 快照已随门面更新（人工评审）；ADR-047。
- 应用 `apps/game` 尚未迁移到门面，迁移需单独验证输入/渲染/物理。

## 说明

- scene 是**运行时系统清单**的真值；能力表是索引，phase 不一致时以 scene 为准并同步能力表。
- 该检查不验证系统行为，只验证“索引不漂移”；行为契约仍在 `packages/engine/tests/*.contract.test.ts`。
- 下一步 Phase 1：`createEngine` 单一门面、系统 Spec 字段（输入/输出/所有权/不变式）与契约测试矩阵。
