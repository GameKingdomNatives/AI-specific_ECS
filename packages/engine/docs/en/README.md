# agent-specific_ecs — English Engine Docs

Complete engine documentation shipped inside the npm package.

> Prototype only; actively evolving; not recommended as a production tool yet.

## Documents

1. [Quickstart](01-quickstart.md) — install, create, step, first system
2. [API](02-api.md) — Engine, World, Scheduler, commands/events, ports
3. [Integration](03-integration.md) — product integration, frontend/backend boundary
4. [Extending](04-extending.md) — components, systems, exported subpaths, adapters
5. [Maintenance](05-maintenance.md) — versioning, deprecation, death
6. [Agent playbook](06-agent-playbook.md) — discovery, changes, verification

Repository for source, ADRs and the engineering harness: https://github.com/GameKingdomNatives/AI-specific_ECS

## Scope

This tarball documents the runtime engine only. It does **not** include `tools/`, `contracts/`, tests, audits, or the private fixture package.

## 1-minute example

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
