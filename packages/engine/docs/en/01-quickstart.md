# 01 · Quickstart

## Install

When the package is available on npm:

```bash
npm install agent-specific_ecs
```

Until then, use a workspace link or an unpacked tarball. Do not assume the registry has it.

## Create an engine

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({
  fixedStepMs: 1000 / 60,
  maxStepsPerFrame: 5,
});
```

`createEngine` creates:

- `world` — ECS data;
- `events` — cold-path event bus;
- `commands` — deferred structural changes;
- `scheduler` — seven fixed phases;
- `clock` — fixed-step clock.

## Define a component

```ts
import { defineComponent } from 'agent-specific_ecs/core';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Velocity = defineComponent('Velocity', { x: 'f64', y: 'f64' });
```

## Add a system

```ts
engine.add({
  name: 'move',
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

## Step or run

```ts
engine.step();        // exactly one fixed tick
engine.advance(16.7); // real ms → fixed ticks
engine.start();       // interval loop
engine.stop();
engine.dispose();
```

## First lifecycle

```text
createEngine → define components → add systems → step/advance
→ app renders → test/replay → version → deprecate → remove
```

Read `02-API.md` before adding complexity.
