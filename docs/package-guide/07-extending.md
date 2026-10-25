# 07 · Extending the Package / 扩展包体能力

This is the recipe for adding capability **without** turning the kernel into a product.

## Decide the layer first / 先决定放在哪一层

| Change | Layer | Example |
|---|---|---|
| New ECS primitive / scheduler behavior | engine core | new component field kind, query API |
| New built-in adapter | engine `impl`/`bridge` | a new renderer/physics adapter |
| Domain components/systems | fixture or product | movement/weapon/spawner |
| Product UI/editor | app | scene editor, HUD |
| Quality rule | engineering kernel | new gate sensor/drill |

Rules:

- product/game content never goes into `packages/engine/src/core`;
- reusable demo stays in `packages/fixture` (private);
- app-specific code stays in `apps/*`;
- exported API is a deliberate decision, not a side effect.

## A. Add a component/system (no public API)

1. Define component with `defineComponent`.
2. Write `SystemDef` with `reads/writes/phase/update`.
3. Structural mutation → `ctx.commands`; cold signal → `ctx.events`.
4. Add tests (contract/property).
5. Register in scene/capability metadata if the app exposes it.
6. `node tools/gate.mjs --fast`, then full gate.

Do not import another system. Do not add a second position store.

## B. Add an exported API / subpath

Only when the capability is stable and useful outside the app.

1. Implement under `packages/engine/src/<area>`.
2. Export from `src/index.ts` or a new subpath module.
3. Add `exports` entry in `packages/engine/package.json`:
   - `types`: `./dist/src/<area>/index.d.ts`
   - `default`: `./dist/src/<area>/index.js`
4. Build: `node node_modules/typescript/bin/tsc -b`.
5. API surface:
   - update `contracts/api-surface.json` hashes deliberately;
   - run `node tools/checks/api-surface.mjs`.
6. Export policy:
   - if the file is runtime, ensure it is inside `dist/src`;
   - `node tools/checks/export-policy.mjs`.
7. Tests: add a public-import test (not only relative import).
8. Pack: `node tools/checks/package-surface.mjs` + `pack-smoke`.
9. Docs: update `03-runtime-api.md`, `packages/engine/README.md`, ADR, handoff.
10. Version: breaking public change → bump minor/major and document.

Ports/signatures:

- changing a frozen port is HARD; requires human approval + `tools/port-contract.json` update + ADR.

## C. Add a new adapter

1. Implement the port interface from `agent-specific_ecs/ports`.
2. Keep DOM/SDK imports out of core.
3. Add contract tests with a fake/real adapter.
4. Export the adapter only if it is stable; otherwise keep it in the app.

## D. Add a new capability/contract

For a system exposed to the scene/app:

1. Add `contracts/capabilities.json` entry:
   - id, phase, spec.inputs/outputs/owns, contractTest.
2. Add contract test.
3. Ensure scene `systems` ids/phase match.
4. `node tools/checks/capabilities.mjs`.
5. Update `docs/systems/` if it is a documented system.

For an agent surface:

1. Update `contracts/agent.json` entrypoints/capabilities.
2. `node tools/itb.mjs describe`.
3. `node tools/checks/agent-contract.mjs`.

## E. Add a quality rule

1. Add rule in `contracts/harness.json` with guide/sensor/negativeTest.
2. Implement sensor under `tools/checks/`.
3. Add negative drill under `tools/drill.mjs`.
4. Run `node tools/drill.mjs`; the new rule must fail without the guard.
5. ADR + handoff.

## F. Export checklist

```bash
node tools/gate.mjs
node tools/checks/api-surface.mjs
node tools/checks/package-surface.mjs
node tools/checks/export-policy.mjs
node tools/checks/pack-smoke.mjs
node tools/checks/license.mjs
```

A change is not “exported” until pack-smoke consumes the tarball via the package name.

## G. Versioning matrix

| Change | Version |
|---|---|
| internal fix | patch |
| additive public API | minor |
| breaking public API / port | major (or documented 0.x break) |
| fixture/app only | no engine version change |

## Anti-patterns

- adding game content to core;
- exporting internals “just in case”;
- changing ports to avoid adapter work;
- updating API hashes without human/ADR review;
- making a gate pass by deleting its check;
- adding `any` or `@ts-ignore`.
