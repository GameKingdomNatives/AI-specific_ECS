# into-the-battlefield / agent-native ECS

一个 **agent 原生、工具无关的双内核代码库**：运行时内核负责 ECS/确定性，工程内核负责能力自描述、影响分析、审计与回执。任何能读写代码、执行命令的 agent 都可以直接消费；不需要专用 IDE、SDK 或插件。

> **进度附录：目前还只是原型，功能还处于动态推进状态，不建议直接作为生产工具。**  
> Status: prototype only; actively evolving; not recommended as a production tool yet.

## 为什么创建这个仓库

现有引擎/框架通常把“给 agent 用”做成某个 IDE 的插件、某个 Agent 的 SDK，或一份需要人先读懂的散文文档。结果是：能力被工具绑定，agent 必须先被“适配”，代码库本身不能自描述。

这个仓库想验证另一条路：

- **Agent 是唯一的集成层**：能读代码、能执行命令，就应该能发现和调用能力；
- **能力内核与工程工具解耦**：运行时内核不 import 任何 Agent/IDE/MCP；MCP 只是可选薄壳；
- **质量不是口号**：每个能力都有机器可读契约、传感器、负例演练和回执；
- **产品与内核分离**：ECS 是内核，fixture/demo 是可替换内容，应用是集成样例。

## 怎么创建

1. 先写运行时内核：稀疏集/SoA 的 ECS、七个调度阶段、CommandBuffer、EventBus、FixedClock、10 个冻结端口；
2. 把“如何证明没坏”做成工程内核：`contracts/` 规则表、`tools/gate.mjs` 全量门禁、drill 负例、pre-push/stamp/Receipt；
3. 用应用反向验证内核：`apps/game` 迁移到 `createEngine`，场景重建/热重载/确定性回放；
4. 逐步把 demo 拆成 `@itb/fixture`，让 engine 只保留运行时；
5. 最后补 `contracts/agent.json`、`itb describe`、可选 MCP、Apache-2.0 与导出 allowlist。

## 工作原理

### 1. 运行时内核 `@itb/engine`

- **World / ECS**：组件是列式存储，实体带代际 ID；系统只声明 reads/writes；
- **Scheduler**：七阶段固定顺序，系统间不直接引用；跨系统只走 EventBus（冷逻辑）或 CommandBuffer；
- **确定性**：固定步长、随机流、录制/回放、World 快照；
- **端口**：渲染、物理、输入、音频、存储等由接口隔离，核心不绑 Pixi/浏览器；
- **门面**：`createEngine()` 暴露 world/events/commands/scheduler/clock 与 step/advance/start/stop/dispose。

### 2. 工程内核

- **Agent Contract**：`contracts/agent.json` 声明 entrypoints 与 capabilities；`node tools/itb.mjs describe` 原样输出；
- **能力发现**：agent 可直接读源码/契约，或调用 `itb inspect/impact/check/gate/receipt`；
- **证据链**：`gate` 产出 `artifacts/gate/<run>/report.md`，`receipt` 记录 HEAD/tree/rules；pre-push 校验 stamp；
- **负例**：`tools/drill.mjs` 每次故意违规，证明传感器真的会红，而不是“警告通过”；
- **可选 MCP**：`tools/mcp-server.mjs` 把契约映射成 MCP tools；不要求任何 agent 使用。

### 3. 导出边界

`contracts/export-policy.json` 是唯一 allowlist：

- 导出：`packages/engine/dist/src` + `README.md`；
- 不导出：`tools/`、`contracts/`、`docs/`、`tests/`、`artifacts/`、fixture 开发文件；
- `export-policy` gate 校验运行时包不含 dev-only。

## 快速开始

```bash
npm ci
node tools/gate.mjs
node tools/itb.mjs inspect
node tools/itb.mjs describe
```

引擎用法：

```ts
import { createEngine } from '@itb/engine';
const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.step();
engine.dispose();
```

## 目录

```text
packages/engine    运行时内核（ECS/端口/确定性/场景）
packages/fixture   fixture：demo 组件与系统，可替换
apps/game          集成样例（不是内核）
tools/             工程内核：gate/harness/itb/drill/receipt
contracts/         机器可读契约
docs/              设计、ADR、验收记录
```

## 质量状态

- 10 条 harness 规则全部 guide/sensor/negativeTest；
- 属性测试（fast-check）、World 黄金测试、pack/starter 冒烟；
- 全量 gate PASS 才提交；
- 当前测试基线 45 个测试文件。

## 许可证

Apache-2.0。公开准备与发布清单见 `docs/adr/055-m4-open-source-readiness.md`。
