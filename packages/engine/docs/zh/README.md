# agent-specific_ecs — 中文引擎文档

本包内附带**完整的中文引擎文档**，与 `docs/en/` 英文版一一对应。

> 状态：原型。功能动态推进，不建议直接作为生产工具。

## 文档

1. [快速开始](01-quickstart.md)
2. [API](02-api.md)
3. [集成](03-integration.md)
4. [扩展](04-extending.md)
5. [维护与废弃](05-maintenance.md)
6. [Agent 手册](06-agent-playbook.md)

源码/ADR/工程门禁在仓库：https://github.com/GameKingdomNatives/AI-specific_ECS

## 范围

本 npm 包只包含运行时引擎文档；不包含 `tools/`、`contracts/`、测试、审计记录和私有 fixture 包。

## 一分钟示例

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.add({
  name: 'example',
  phase: 'movement',
  reads: [],
  writes: [],
  update: () => {},
});
engine.step();
engine.dispose();
```
