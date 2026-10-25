# 03 · Integration

## This is a library, not a backend

The package is a runtime kernel. It has no HTTP server, database, auth service, or network API.

```text
product UI / app
      │
      ▼
ports + adapters (renderer/input/physics/audio/storage)
      │
      ▼
agent-specific_ecs runtime
```

## Frontend

The product owns:

- UI/framework;
- renderer/input;
- scene file I/O;
- persistence and networking.

The engine must not import React, Pixi, DOM, or app code.

## Backend

If the product needs a backend, keep it outside the kernel:

```text
product backend ──HTTP/WS──▶ product frontend
                                  │
                                  ▼
                          agent-specific_ecs
```

Do not add server calls to systems.

## Adapters

Implement ports from `agent-specific_ecs/ports`:

- `IRenderer` — draw `RenderItem`;
- `IInput` — input snapshot;
- `IPhysics` — query-only physics; positions stay in ECS;
- `IAudio`, `IStorage`, `ILogger`.

Adapters may live in the product; stable ones can be proposed as package subpaths.

## Fixture

`@itb/fixture` is private and not in this tarball. External products must:

- copy demo components/systems into the product; or
- create their own fixture.

## Scene data

`agent-specific_ecs/scene` parses/validates/instantiates scene JSON. The app owns file loading/saving and rebuilds.

## In this repository

`apps/game` is a browser integration sample:

- `apps/game/src/main.ts` owns `createEngine` and loop;
- `render-table.ts` maps ECS to `RenderItem`;
- `apps/game/scene-save-plugin.mjs` is dev-only Vite middleware.

It is not part of the package.

## Security boundary

- never commit tokens/recovery codes/TOTP secrets;
- npm publishing is a release action, separate from runtime;
- passkey/OTP is a release concern, not an engine API.
