# 04 · Extending

## Choose the layer

| Change | Put it in |
|---|---|
| ECS primitive / scheduler | engine core |
| adapter | engine impl/bridge or product |
| domain components/systems | product or fixture |
| UI/editor | product |
| quality rule | repository harness (not shipped) |

Do not put game content into core.

## Components and systems

```ts
const Health = defineComponent('Health', { hp: 'f32' });

engine.add({
  name: 'damage',
  phase: 'damage',
  reads: [Health],
  writes: [Health],
  update(ctx) {
    for (const e of ctx.world.query(Health)) {
      const h = ctx.world.get(e, Health);
      if (h) ctx.world.set(e, Health, { hp: h.hp - 1 });
    }
  },
});
```

Rules:

- no system imports another system;
- cold signals → EventBus;
- structural changes → CommandBuffer;
- no wall clock / `Math.random` in deterministic systems.

## Add an exported subpath

Only for stable public capability:

1. implement under `packages/engine/src/<area>`;
2. export from `src/index.ts` or a subpath module;
3. add `exports` in package.json (types + default);
4. build with `tsc -b`;
5. add a public-import test;
6. update API docs/version;
7. verify `npm pack` and install smoke.

Ports/signatures are a compatibility contract; changing them is a breaking change.

## Add an adapter

Implement the port; keep SDK/DOM imports out of core; test with a fake or real adapter. Export only when stable.

## Add a scene capability

Update scene schema/parse/instantiate and product registration; add contract tests; unknown fields must remain errors, not silent drops.

## Versioning

- internal fix → patch;
- additive public API → minor;
- breaking API/port → major (or documented 0.x break).

## Anti-patterns

- exporting internals “just in case”;
- changing ports to avoid adapter work;
- adding `any`/`@ts-ignore`;
- putting app logic in core;
- publishing without pack/install smoke.
