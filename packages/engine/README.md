# @itb/engine

English: An agent-native, tool-agnostic 2D ECS runtime kernel. It has no dependency on any Agent, IDE or MCP server; fixtures and engineering tools live outside the package.

中文：agent 原生、工具无关的 2D ECS 运行时内核。它不依赖任何 Agent、IDE 或 MCP；fixture 与工程工具在包外。

> **Status / 进度：目前还只是原型，功能还处于动态推进状态，不建议直接作为生产工具。**  
> Prototype only; actively evolving; not recommended as a production tool yet.

## Quick start / 最小用法

```ts
import { createEngine } from '@itb/engine';

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

English: `npm pack` publishes only `dist/src` + `package.json` + this README. Tests, source and tsconfig are excluded.

中文：`npm pack` 只发布 `dist/src` + `package.json` + 本 README；测试/源码/tsconfig 不进包。

## Agent consumption / Agent 如何消费

English: Read `contracts/agent.json`, or run `node tools/itb.mjs describe`. No SDK or plugin is required.

中文：读 `contracts/agent.json`，或执行 `node tools/itb.mjs describe`。不需要 SDK 或插件。

Repository / 仓库：https://github.com/GameKingdomNatives/AI-specific_ECS

## License / 许可证

Apache-2.0.
