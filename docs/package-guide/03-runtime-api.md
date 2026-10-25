# 03 · Runtime API / 运行时 API

Package: `agent-specific_ecs` (engine workspace `packages/engine`).  
This is the supported surface; internals may change.

## Create

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({
  fixedStepMs: 1000 / 60, // default fixed step
  maxStepsPerFrame: 5,    // spiral-of-death guard
  scheduler: undefined,   // optional scheduler options
  systems: [],            // optional initial systems
});
```

### Engine options

| Field | Meaning |
|---|---|
| `fixedStepMs` | fixed simulation step; default 1/60s |
| `maxStepsPerFrame` | max catch-up steps |
| `scheduler` | scheduler build options |
| `systems` | systems registered at construction |

## Engine facade

| Member | Meaning |
|---|---|
| `world` | current `World` |
| `events` | `EventBus` (cold paths) |
| `commands` | `CommandBuffer` (structural, phase boundaries) |
| `scheduler` | current `Scheduler` |
| `clock` | `FixedClock` |
| `running` | timer active |
| `add(system)` | add + rebuild schedule |
| `step()` | exactly one fixed tick |
| `advance(realMs)` | consume real ms; returns steps run |
| `start()` / `stop()` | real-time interval loop |
| `resetWorld()` | new World; keeps events/commands/clock |
| `resetScheduler(options?)` | new Scheduler; keeps core objects |
| `dispose()` | stop timer and release scheduler |

## ECS

```ts
import { defineComponent } from 'agent-specific_ecs/core';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Box = defineComponent('Box', { size: 'f32', tint: 'u32' });
```

- Components are **columns**; entities are generational IDs.
- `world.spawn()`, `add`, `get`, `set`, `remove`, `despawn`, `query`.
- Systems declare `reads` / `writes`; use types, not stringly access.
- Do not mutate structure during a system; use `ctx.commands`.

## Systems

```ts
engine.add({
  name: 'my-system',
  phase: 'movement',
  reads: [Position, Velocity],
  writes: [Position],
  update(ctx) {
    for (const entity of ctx.world.query(Position, Velocity)) {
      const p = ctx.world.get(entity, Position);
      const v = ctx.world.get(entity, Velocity);
      if (p && v) ctx.world.set(entity, Position, { x: p.x + v.x, y: p.y + v.y });
    }
  },
});
```

Phases: `input`, `ai`, `movement`, `collision`, `damage`, `cleanup`, `renderSync`.

Rules:

- no direct system-to-system calls;
- cold signal → EventBus;
- structural change → CommandBuffer;
- no EventBus on hot per-frame paths;
- no wall-clock / `Math.random` in deterministic systems.

## Clock and determinism

```ts
engine.advance(16.7);
const tick = engine.clock.tick;
```

- fixed step; accumulator; max catch-up;
- deterministic streams in `core/random`;
- recording/replay in `determinism`;
- snapshot/hash in `core/world-state`.

## Scene

```ts
import { parseScene, instantiateScene } from 'agent-specific_ecs/scene';
```

Scene JSON is the authoring truth; instantiate nodes → entities; unknown components/fields become issues, not silent drops. Scene rebuild should use `resetWorld` + `resetScheduler`.

## Ports and adapters

| Port | Adapter / responsibility |
|---|---|
| `IRenderer` | Pixi adapter; renders `RenderItem` |
| `IInput` | DOM/keyboard/pointer |
| `IPhysics` | physics query adapter |
| `IAudio` | WebAudio/null |
| `IStorage` | memory/local storage |
| `ILogger` | console/memory/dump |
| `IClock` | fixed clock |
| `IRandom` | deterministic stream |
| `IModHost` | mod boundary |
| `IEventBusPort` | event bus boundary |

Core never imports adapters. The app injects them.

## Errors and invariants

- `createEngine` requires positive fixed step; invalid values should fail fast.
- `step()` after `dispose()` is invalid.
- `resetWorld` preserves events/commands/clock; clear stale references in systems.
- `resetScheduler` disposes old scheduler; re-add systems.
- A system error is surfaced by scheduler failure policy; do not swallow.

## Example: headless loop

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 10 });
let count = 0;
engine.add({ name: 'count', phase: 'movement', reads: [], writes: [], update: () => { count += 1; } });
for (let i = 0; i < 10; i += 1) engine.step();
if (count !== 10) throw new Error('unexpected tick count');
engine.dispose();
```

## API stability

- `index.ts` / `engine.ts` / ports are the public surface.
- Declaration hashes live in `contracts/api-surface.json`; changes require an ADR.
- The package is **prototype**; semver is not yet a promise.
