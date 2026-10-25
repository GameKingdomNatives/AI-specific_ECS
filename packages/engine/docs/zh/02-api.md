# 02 · API

## Engine 门面

```ts
interface Engine {
  readonly world: World;
  readonly events: EventBus;
  readonly commands: CommandBuffer;
  readonly scheduler: Scheduler;
  readonly clock: FixedClock;
  readonly running: boolean;
  add(system: SystemDef): this;
  step(): void;
  advance(realMs: number): number;
  start(): void;
  stop(): void;
  resetWorld(): World;
  resetScheduler(options?: SchedulerOptions): Scheduler;
  dispose(): void;
}
```

`createEngine` 选项：`fixedStepMs`、`maxStepsPerFrame`、`scheduler`、`systems`。

## World / ECS

- 组件按列存储，实体带代际 ID；
- `spawn`、`despawn`、`add`、`get`、`set`、`remove`、`query`；
- 系统声明 `reads` / `writes`；
- 系统内结构变更必须走 `CommandBuffer`。

## 调度阶段

```text
input → ai → movement → collision → damage → cleanup → renderSync
```

规则：

- 系统之间不得直接调用；
- 跨系统冷信号走 `EventBus`；
- 结构变更走 `CommandBuffer`；
- 热路径不得使用 EventBus。

## 时钟与确定性

- 固定步长、累加器、最大追帧；
- `core/random` 提供确定性随机流；
- `determinism` 录制/回放；
- `core/world-state` 快照/哈希。

## 端口

`IRenderer`、`IInput`、`IAudio`、`IPhysics`、`IEventBusPort`、`IClock`、`IRandom`、`ILogger`、`IStorage`、`IModHost`。

核心不得依赖适配器；由应用注入。

## 场景

```ts
import { parseScene, instantiateScene } from 'agent-specific_ecs/scene';
```

Scene JSON 是作者数据；加载/保存由应用负责。未知组件/字段进入 issues，不得静默丢弃。

## 导入路径

```ts
import { createEngine } from 'agent-specific_ecs';
import { defineComponent, World, Scheduler } from 'agent-specific_ecs/core';
import type { IRenderer } from 'agent-specific_ecs/ports';
import { parseScene } from 'agent-specific_ecs/scene';
```

## 不变量

- 固定步长必须为正；
- `dispose` 后不得继续 step；
- `resetWorld`/`resetScheduler` 保留 events/commands/clock，但旧引用失效；
- 系统错误必须暴露，不得吞掉。
