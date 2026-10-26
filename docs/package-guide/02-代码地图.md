# 02 · Code Map / 代码地图

This is the shortest path from “I need to change X” to the right file. Paths are repository-relative.

## Top-level map

```text
packages/engine      runtime kernel — exported as agent-specific_ecs
  src/core           ECS, scheduler, commands, events, clock, random, snapshots
  src/ports          pure interfaces; no implementation imports
  src/impl           adapters: Pixi renderer, physics, audio, storage, logger
  src/bridge         contacts/physics bridges
  src/scene          scene schema, parse, instantiate, edit, meta
  src/determinism    recording/replay
  src/data           content/asset manifests
  tests              45-file baseline (kernel + contracts + properties + golden)

packages/fixture     demo components/systems (@itb/fixture, private)
apps/game            integration sample: Vite + React + Pixi; not the kernel
tools/               engineering kernel: gate, harness, itb, drill, receipts
contracts/           machine-readable contracts (agent/harness/capabilities/export)
docs/                design, ADRs, audits, runbooks, this guide
starters/            headless/storybook starter smoke
```

## Runtime data flow

```text
InputSnapshot
   │
   ▼
[phase input] → [ai] → [movement] → [collision] → [damage] → [cleanup] → [renderSync]
   │                 │                       │
   │                 └── EventBus (cold) ────┘
   │
   └── CommandBuffer (structural; flushed between phases)
                         │
                         ▼
                      World (SoA columns + generational entities)
                         │
                         ▼
                  IRenderer port → Pixi adapter (outside core)
```

## Where to change what / 改哪里

| Goal | Edit | Do not |
|---|---|---|
| Add component | `packages/engine/src/core/types.ts` usage + domain file | touch `ports` signatures without ADR |
| Add system | domain/fixture file + scene/capability registration | import another system directly |
| Structural change | `CommandBuffer` at phase boundary | mutate entities/components inside system update |
| Cross-system signal | `EventBus` (cold only) | use EventBus on hot path |
| Rendering | `impl/pixi-renderer.ts` / `IRenderer` consumer | put Pixi types in core/ports |
| Physics | `impl/physics.ts` + `bridge` | keep a second authoritative position store |
| Scene format | `scene/schema.ts` + `parseScene` | add unknown fields silently |
| Determinism | `determinism/` + clock/random | use `Math.random` or wall clock in systems |
| Public facade | `src/engine.ts` + `src/index.ts` | expose internals by default |
| Quality rule | `contracts/harness.json` + `tools/checks` | weaken a sensor to make it green |
| Agent surface | `contracts/agent.json` + `tools/itb.mjs describe` | require a specific IDE/plugin |

## Core files

| File | Role |
|---|---|
| `packages/engine/src/core/world.ts` | SoA stores, entity generations, snapshots |
| `core/types.ts` | `defineComponent`, field kinds |
| `core/scheduler.ts` | seven fixed phases; system order |
| `core/commands.ts` | deferred structural changes |
| `core/events.ts` | recording-capable cold event bus |
| `core/clock.ts` | fixed step, accumulator, max steps |
| `core/random.ts` | deterministic streams |
| `core/world-state.ts` | snapshot/hash/restore |
| `src/engine.ts` | `createEngine` facade; reset/start/stop |
| `src/ports/index.ts` | 10 stable ports + shared types |

## Ports (10)

`IRenderer`, `IInput`, `IAudio`, `IPhysics`, `IEventBusPort`, `IClock`, `IRandom`, `ILogger`, `IStorage`, `IModHost`.

Rule: `ports` contains only types/constants. Core must not import `ports`, `impl`, `data`, `demo`, `apps`.

## Scene and fixture

- `packages/engine/src/scene`: JSON schema, parse validation, instantiate nodes→entities, schedule editing, meta coercion.
- `packages/fixture`: demo `Position/Velocity/Box/Bullet/BoxSpawner`, movement/weapon/hit/spawner systems.
- `apps/game`: consumes both; uses `createEngine`; rebuilds with `resetWorld`/`resetScheduler`.

## Engineering kernel

| Path | Role |
|---|---|
| `tools/gate.mjs` | full/fast gate; steps + report |
| `tools/checks/*` | harness, capabilities, registry, boundary, size, API, pack, MCP |
| `tools/itb.mjs` | inspect/describe/impact/check/gate/receipt |
| `tools/drill.mjs` | deliberate violations; proves fail-closed |
| `tools/hooks/pre-push.mjs` | stamp + receipt + deep cadence |
| `tools/deep-audit.mjs` | deep audit |
| `tools/nightly.mjs` | 20:00 report producer |
| `contracts/agent.json` | machine-readable entrypoints/capabilities |
| `contracts/harness.json` | 10 rules with guide/sensor/negativeTest |
| `contracts/capabilities.json` | systems + phases + specs + contract tests |
| `contracts/export-policy.json` | runtime allowlist |

## Frontend / app map

```text
apps/game/src/main.ts          createEngine + loop + rebuild
apps/game/src/ui/              React UI
apps/game/src/editor/          scene/schedule editor surfaces
apps/game/src/render-table.ts  ECS → RenderItem
apps/game/src/scene-apply.ts   scene mutations / rebuild
apps/game/scene-save-plugin.mjs dev-only Vite save middleware
```

The app is **not** part of the exported package. It is an integration sample and a regression harness.

## Package export map

```text
agent-specific_ecs
├─ .          src/index.ts → core + createEngine
├─ /core      ECS primitives
├─ /ports     interfaces
├─ /scene     scene schema/instantiate
├─ /bridge    contacts/physics bridges
├─ /impl      adapters
├─ /data      content/assets
├─ /determinism
├─ /logger /audio /diagnostics /physics /storage
├─ docs/en, docs/zh    engine-only docs shipped in tarball
└─ no /demo   fixture is separate/private
```

## Dependency direction

```text
apps → engine + fixture
fixture → engine
engine core → nothing (no ports/impl/apps)
engine ports → types only
tools → repo files, not engine runtime
```

Violations are caught by `dependency-cruiser` + `gate`.
