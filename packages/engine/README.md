# agent-specific_ecs

English: An agent-native, tool-agnostic 2D ECS runtime kernel. It has no dependency on any Agent, IDE or MCP server; fixtures and engineering tools live outside the package.

中文：agent 原生、工具无关的 2D ECS 运行时内核。它不依赖任何 Agent、IDE 或 MCP；fixture 与工程工具在包外。

> **Status / 进度：目前还只是原型，功能还处于动态推进状态，不建议直接作为生产工具。**  
> Prototype only; actively evolving; not recommended as a production tool yet.

## Package documentation / 包内文档

English: This tarball includes complete **engine-only** documentation in two separate language sets: [`docs/en/`](docs/en/README.md) and [`docs/zh/`](docs/zh/README.md). They cover quickstart, API, integration, extension, maintenance/deprecation, and an agent playbook. Repository engineering tools (`tools/`, `contracts/`, ADRs, audits) are intentionally **not** included.

中文：本 tarball 附带完整的**仅引擎**文档，中英文各自独立：[`docs/en/`](docs/en/README.md) 与 [`docs/zh/`](docs/zh/README.md)，覆盖快速开始、API、集成、扩展、维护/废弃和 Agent 手册。仓库工程工具（`tools/`、`contracts/`、ADR、审计）刻意不随包发布。

## Quick start / 最小用法

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.add({
  name: 'my.system',
  phase: 'movement',
  reads: [],
  writes: [],
  update: (ctx) => {
    // ctx.world / ctx.events / ctx.commands
  },
});
engine.step();      // one step / 单步
engine.advance(16); // advance by real milliseconds / 按真实毫秒推进
engine.dispose();
```

## Exports / 导出

English:

- `.`: core + `createEngine`;
- `./core`, `./ports`, `./scene`, `./bridge`, `./impl`, `./determinism` are listed in `package.json`;
- rendering, physics, input and storage are port adapters, not bound into the core facade;
- demo is not in this package; it was split into `@itb/fixture` (private).

中文：

- `.`：core + `createEngine`；
- `./core`、`./ports`、`./scene`、`./bridge`、`./impl`、`./determinism` 见 `package.json`；
- 渲染、物理、输入、存储是端口适配器，不绑进核心门面；
- demo 不在本包，已拆到 `@itb/fixture`（private）。

## Package contents / 包内容

English: `npm pack` publishes `dist/src`, this `README.md`, and the complete engine-only docs in `docs/en/` + `docs/zh/`. Tests, source and tsconfig are excluded.

中文：`npm pack` 发布 `dist/src`、本 `README.md`，以及 `docs/en/` + `docs/zh/` 的完整引擎文档；测试/源码/tsconfig 不进包。

## Agent consumption / Agent 如何消费

English: Read `contracts/agent.json`, or run `node tools/itb.mjs describe`. No SDK or plugin is required.

中文：读 `contracts/agent.json`，或执行 `node tools/itb.mjs describe`。不需要 SDK 或插件。

Repository / 仓库：https://github.com/GameKingdomNatives/AI-specific_ECS

## License / 许可证

Apache-2.0.
