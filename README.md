# into-the-battlefield / agent-native ECS

中文：一个 **agent 原生、工具无关的双内核代码库**：运行时内核负责 ECS/确定性，工程内核负责能力自描述、影响分析、审计与回执。任何能读写代码、执行命令的 agent 都可以直接消费；不需要专用 IDE、SDK 或插件。

English: An **agent-native, tool-agnostic dual-kernel codebase**. The runtime kernel owns ECS and determinism; the engineering kernel owns capability discovery, impact analysis, auditing and receipts. Any agent that can read/write code and run commands can consume it directly, with no IDE plugin, SDK or mandatory MCP layer.

> **进度 / Status：目前还只是原型，功能还处于动态推进状态，不建议直接作为生产工具。**  
> Prototype only; actively evolving; not recommended as a production tool yet.

## 为什么创建 / Why this exists

中文：现有引擎/框架通常把“给 agent 用”做成某个 IDE 的插件、某个 Agent 的 SDK，或一份需要人先读懂的散文文档。结果是能力被工具绑定，agent 必须先被“适配”，代码库本身不能自描述。这个仓库验证另一条路：agent 是唯一集成层；能力内核与工程工具解耦；质量靠机器可读契约与证据；产品与内核分离。

English: Most engines/frameworks treat “agent support” as an IDE plugin, an agent-specific SDK, or prose docs a human must read first. Capabilities become tool-bound, agents need adapters, and the codebase cannot describe itself. This repository tests another path: the agent is the only integration layer; the kernel is decoupled from engineering tools; quality is enforced by machine-readable contracts and evidence; products are separated from the kernel.

## 怎么创建 / How it was built

中文：先写运行时内核（稀疏集/SoA ECS、七阶段调度、CommandBuffer、EventBus、FixedClock、10 个冻结端口）；再把“如何证明没坏”做成工程内核（`contracts/`、`tools/gate.mjs`、drill、pre-push/stamp/Receipt）；用 `apps/game` 反向验证；把 demo 拆成 `@itb/fixture`；最后补 `contracts/agent.json`、`itb describe`、可选 MCP、Apache-2.0 与导出 allowlist。

English: First the runtime kernel (sparse-set/SoA ECS, seven-phase scheduler, CommandBuffer, EventBus, FixedClock, 10 frozen ports). Then the engineering kernel that proves it is not broken (`contracts/`, `tools/gate.mjs`, drills, pre-push/stamp/Receipt). Then an app (`apps/game`) to validate it from the outside; demo code was split out into `@itb/fixture`; finally `contracts/agent.json`, `itb describe`, optional MCP, Apache-2.0 and the export allowlist.

## 工作原理 / How it works

### 1. 运行时内核 / Runtime kernel `agent-specific_ecs`

中文：组件列式存储，实体带代际 ID；系统只声明 reads/writes；七阶段固定顺序；跨系统只走 EventBus 或 CommandBuffer；固定步长、随机流、录制/回放、World 快照；渲染/物理/输入/音频/存储通过端口隔离；`createEngine()` 是唯一门面。

English: Components are stored in columns; entities carry generational IDs; systems declare reads/writes; seven fixed phases; cross-system traffic goes only through the EventBus or CommandBuffer; fixed-step clock, random streams, recording/replay and World snapshots; rendering/physics/input/audio/storage are isolated behind ports; `createEngine()` is the single facade.

### 2. 工程内核 / Engineering kernel

中文：`contracts/agent.json` 声明 entrypoints 与 capabilities；`itb describe` 原样输出；agent 可直接读源码/契约，或调用 `itb inspect/impact/check/gate/receipt`；gate 产出报告，receipt 记录 HEAD/tree/rules；drill 故意违规，证明传感器会红；`tools/mcp-server.mjs` 是可选的薄 MCP 适配器。

English: `contracts/agent.json` declares entrypoints and capabilities; `itb describe` emits it verbatim; an agent can read source/contracts directly or call `itb inspect/impact/check/gate/receipt`; gate writes a report and receipt records HEAD/tree/rules; drills deliberately violate rules to prove sensors fail closed; `tools/mcp-server.mjs` is an optional thin MCP adapter.

### 3. 导出边界 / Export boundary

中文：`contracts/export-policy.json` 是唯一 allowlist。只导出 `packages/engine/dist/src` + `README.md`；`tools/`、`contracts/`、`docs/`、`tests/`、`artifacts/` 与 fixture 开发文件不进入产物。

English: `contracts/export-policy.json` is the only allowlist. Only `packages/engine/dist/src` + `README.md` are exported; `tools/`, `contracts/`, `docs/`, `tests/`, `artifacts/` and fixture development files never enter the artifact.

## 快速开始 / Quick start

```bash
npm ci
node tools/gate.mjs
node tools/itb.mjs inspect
node tools/itb.mjs describe
```

Engine usage:

```ts
import { createEngine } from 'agent-specific_ecs';
const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.step();
engine.dispose();
```

## 目录 / Layout

```text
packages/engine    runtime kernel: ECS / ports / determinism / scene
packages/fixture   fixture: demo components and systems, replaceable
apps/game          integration sample, not the kernel
tools/             engineering kernel: gate / harness / itb / drill / receipt
contracts/         machine-readable contracts
docs/              design, ADRs, acceptance records
```

## 质量 / Quality

中文：10 条 harness 规则全部有 guide/sensor/negativeTest；属性测试、World 黄金测试、pack/starter 冒烟；全量 gate PASS 才提交；当前测试基线 45 个测试文件。

English: All 10 harness rules have guide/sensor/negativeTest; property tests, World golden test and pack/starter smoke exist; nothing is committed without a full gate PASS; the current test baseline is 45 test files.

## 许可证 / License

Apache-2.0. Public-readiness and release checklist: `docs/adr/055-m4-open-source-readiness.md`.
