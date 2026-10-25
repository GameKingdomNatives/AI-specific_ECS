# 02 · API

## Engine facade

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

`createEngine` options: `fixedStepMs`, `maxStepsPerFrame`, `scheduler`, `systems`.

## World / ECS

- components are columns; entities carry generational IDs;
- `spawn`, `despawn`, `add`, `get`, `set`, `remove`, `query`;
- systems declare `reads` and `writes`;
- structural changes during a system must use `CommandBuffer`.

## Scheduler phases

```text
input → ai → movement → collision → damage → cleanup → renderSync
```

Rules:

- no direct system-to-system calls;
- cold cross-system signal → `EventBus`;
- structural change → `CommandBuffer`;
- no EventBus on hot per-frame paths.

## Clock and determinism

- fixed step; accumulator; max catch-up;
- deterministic random streams in `core/random`;
- recording/replay in `determinism`;
- snapshots/hashes in `core/world-state`.

## Ports

`IRenderer`, `IInput`, `IAudio`, `IPhysics`, `IEventBusPort`, `IClock`, `IRandom`, `ILogger`, `IStorage`, `IModHost`.

Core must not import adapters. The application injects them.

## Scene

```ts
import { parseScene, instantiateScene } from 'agent-specific_ecs/scene';
```

Scene JSON is authoring data; the app owns loading/saving. Unknown fields/components become issues, not silent drops.

## Imports

```ts
import { createEngine } from 'agent-specific_ecs';
import { defineComponent, World, Scheduler } from 'agent-specific_ecs/core';
import type { IRenderer } from 'agent-specific_ecs/ports';
import { parseScene } from 'agent-specific_ecs/scene';
```

## Invariants

- fixed step must be positive;
- disposed engine must not be stepped;
- `resetWorld`/`resetScheduler` keep events/commands/clock but invalidate old references;
- system errors are surfaced, not swallowed.
