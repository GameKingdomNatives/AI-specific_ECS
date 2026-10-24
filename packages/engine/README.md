# @itb/engine

agent 原生、工具无关的 2D ECS 运行时内核。它不依赖任何 Agent/IDE/MCP；fixture 与工程工具在包外。

> **进度附录：目前还只是原型，功能还处于动态推进状态，不建议直接作为生产工具。**

## 最小用法

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
engine.step();
engine.advance(16);
engine.dispose();
```

## 导出

- `.`：core + `createEngine`；
- `./core`、`./ports`、`./scene`、`./bridge`、`./impl`、`./determinism` 等子路径见 `package.json`；
- 渲染、物理、输入、存储是端口适配器，不绑进核心门面；
- demo 不在本包，已拆到 `@itb/fixture`（private）。

## 包内容

`npm pack` 只发布 `dist/src` + `package.json` + 本 README；测试/源码/tsconfig 不进包。

## Agent 如何消费

读 `contracts/agent.json` 或执行：

```bash
node tools/itb.mjs describe
```

仓库地址：https://github.com/GameKingdomNatives/AI-specific_ECS

## 许可证

Apache-2.0。
