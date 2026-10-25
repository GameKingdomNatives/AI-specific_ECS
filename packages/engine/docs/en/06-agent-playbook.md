# 06 · Agent Playbook

## Discover the package

An agent with basic code/command ability can:

1. read this `docs/` tree in `node_modules/agent-specific_ecs/docs`;
2. inspect `dist/src/*.d.ts` and `package.json` exports;
3. import the package and run a small script;
4. read source maps if included.

No IDE plugin, SDK, MCP server, or special agent integration is required.

## First commands

```bash
node -e "import('agent-specific_ecs').then(m => console.log(Object.keys(m)))"
```

In a TypeScript project:

```ts
import { createEngine } from 'agent-specific_ecs';
```

## Import paths

```text
agent-specific_ecs          core + createEngine
agent-specific_ecs/core     ECS primitives
agent-specific_ecs/ports    interfaces
agent-specific_ecs/scene    scene schema/parse/instantiate
agent-specific_ecs/bridge
agent-specific_ecs/impl
agent-specific_ecs/data
agent-specific_ecs/determinism
agent-specific_ecs/logger /audio /diagnostics /physics /storage
```

## Safe changes

- add components/systems in the product, not core;
- structural changes via CommandBuffer;
- cold signals via EventBus;
- deterministic systems: no wall clock/`Math.random`;
- do not change ports/exports without a versioning decision;
- keep fixture/private content out of the kernel.

## Verification

- unit/contract test for the new behavior;
- replay/determinism test if simulation changes;
- pack/install smoke if changing package surface;
- full repository gate when working from source.

## Common traps

| Trap | Correct |
|---|---|
| import `@itb/engine` | use `agent-specific_ecs` |
| import a sibling system | use events/commands |
| mutate entities in system | CommandBuffer |
| use EventBus in hot loop | direct data/command |
| use `Math.random` | deterministic stream |
| put UI in core | adapter/product |
| treat package as backend | it is a runtime library |

## Handoff

When changing the package:

- update this docs tree;
- update root README;
- bump version;
- produce release evidence;
- leave migration/deprecation notes when removing capability.
