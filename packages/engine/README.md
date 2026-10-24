# @itb/engine

private 2D ECS 引擎核心。当前只在本地/私有仓库使用，未发布 npm。

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
engine.step();      // 单步
engine.advance(16); // 按真实毫秒推进
engine.dispose();
```

## 导出

- `.`：core + `createEngine`；
- `./core` / `./ports` / `./scene` / `./bridge` / `./demo` / `./impl` 等子路径见 `package.json`。
- 渲染、物理、输入、存储是端口适配器，不绑进核心门面。

## 包内容

`npm pack` 只发布 `dist/src` + `package.json` + 本 README；测试/源码/tsconfig 不进包。

## 状态

- private，未上传 npm；
- `createEngine` 是核心运行时门面，应用层尚未全部迁移；
- demo/impl 仍在包内，完全独立化会拆到 fixture/适配器。
