# 08 · Using It in This Project / 在当前项目中使用包体

This is the concrete integration path for this repository (`apps/game`) and for a product that consumes `agent-specific_ecs`.

## A. In this repository / 本仓库内

The app is a workspace consumer. No npm install is needed beyond `npm ci`.

### Entry

`apps/game/src/main.ts`:

```ts
import { createEngine } from 'agent-specific_ecs';
import { Box, BoxSpawner, Bullet, Position, spawnBoxes } from '@itb/fixture';
import { createPixiRenderer } from 'agent-specific_ecs/impl';

const engine = createEngine({ fixedStepMs: 1000 / 60 });
let world = engine.world;
const bus = engine.events;
```

### Rebuild

- scene/world rebuild: `world = engine.resetWorld()`; recreate `schemaGuard`;
- scheduler rebuild: `applySystems(...)` uses `engine.resetScheduler()`;
- keep `events`/`commands`/`clock` alive across rebuild.

### Systems

`apps/game/src/system-registry.ts` maps scene systems to fixture/kernel factories. Add a system there only if the scene schema/capabilities register it.

### Frontend/adapters

- `createPixiRenderer` (`agent-specific_ecs/impl`) implements `IRenderer`;
- app input implements `IInput`;
- app physics uses `agent-specific_ecs/physics` + bridge;
- UI/editor consumes Scene documents;
- `apps/game/scene-save-plugin.mjs` is dev-only Vite middleware.

### Run / verify

```bash
npm run dev
node tools/gate.mjs --fast
node tools/gate.mjs
```

Browser smoke should check: tick advances, entities > 0, error count 0, scene loads/rebuilds.

### What not to do

- do not import `@itb/engine` (old name);
- do not import internals from `packages/engine/src`;
- do not put app/UI code into the kernel;
- do not fork the engine to fix an app issue;
- do not claim app success from `tsc` alone.

## B. In a new product / 新产品

### Install

Once published:

```bash
npm install agent-specific_ecs
```

Until then, use a workspace/link/pack tarball; do not assume npm registry has it.

### Minimal shell

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.add({
  name: 'game.update',
  phase: 'movement',
  reads: [],
  writes: [],
  update: () => {},
});
requestAnimationFrame(function loop() {
  engine.advance(16.7);
  requestAnimationFrame(loop);
});
```

### Ports

Provide your own renderer/input/physics/audio/storage. Do not import Pixi/React into core.

### Fixture

`@itb/fixture` is **private**; external products cannot install it. Either:

- copy the demo components/systems into your product;
- build your own fixture;
- keep fixture unpublished and only use it in this repo.

### Scene

Use `agent-specific_ecs/scene` for JSON schema/parse/instantiate; the app owns file I/O and persistence.

### Upgrade

- read release notes/ADR;
- run your contract tests;
- check `contracts/api-surface.json` and package version;
- pin a version until migration is proven.

## C. Two integration modes / 两种集成模式

| Mode | Use when | Tradeoff |
|---|---|---|
| **Library** | product owns UI/loop/ports | more control, more wiring |
| **Workspace sample** | learning/prototyping | fast, but app code is not package API |

The engine is designed for library mode; `apps/game` is a sample, not a framework you import.

## D. Testing your integration

- one system contract test;
- one replay/determinism test;
- one app smoke test (tick/entities/errors);
- one pack/install smoke if consuming a tarball;
- full gate before release.

## E. Current repo status

- `agent-specific_ecs` is not on npm yet;
- `@itb/fixture` is private;
- app uses workspace packages;
- npm staged 0.1.0; 72h hold until ~2026-10-28 00:34 +08.

Do not describe the app as “using the published package” until npm actually serves it.
