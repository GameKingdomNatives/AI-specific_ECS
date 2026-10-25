# 04 · Frontend / Backend / 前后端边界

## Short answer / 结论

**This package has no traditional backend.** It is a runtime library. There is no HTTP server, database, auth service, or network API in `packages/engine`.

`agent-specific_ecs` 没有传统后端：它是运行时库，不是 Web 服务。仓库里的 `apps/game` 是前端集成样例；`tools/` 是开发期工程内核，不会进入发布包。

## Three layers / 三层

```text
┌──────────────────────────────────────────────┐
│ app / product                                │
│  apps/game: React UI, input, Pixi, scene I/O │
│  product-specific backend (if any)           │
├──────────────────────────────────────────────┤
│ adapters / ports                             │
│  IRenderer, IInput, IPhysics, IAudio...      │
├──────────────────────────────────────────────┤
│ runtime kernel: agent-specific_ecs           │
│  World / Scheduler / Commands / Events       │
│  deterministic clock, scene, replay          │
└──────────────────────────────────────────────┘
```

## Frontend sample / 前端样例

`apps/game` is a browser app and regression harness:

- Vite + React + Pixi;
- `main.ts` creates engine and owns the loop;
- `render-table.ts` converts ECS state to `RenderItem`;
- editor/UI consume scene documents;
- `scene-save-plugin.mjs` is a **dev-only** Vite middleware, not a production backend.

It is intentionally outside the exported package:

- consumers should build their own UI;
- the engine must not import React/DOM/Pixi;
- `apps/game` may break while the kernel stays stable.

## Backend / 后端

There is no backend in this repository. If a product needs one, it belongs **outside** the kernel:

```text
product backend  ──HTTP/WS──▶  product frontend
                                  │
                                  ▼
                          agent-specific_ecs
```

Rules:

- never add network/database/auth into `packages/engine/src/core`;
- never add server calls to systems;
- pass data through components/events or app-level services;
- keep secrets outside the repo.

## Ports are the boundary / 端口即边界

| Port | Implemented by | Product may replace |
|---|---|---|
| `IRenderer` | Pixi adapter | any renderer |
| `IInput` | browser input | any input source |
| `IPhysics` | physics adapter | any physics SDK |
| `IAudio` | WebAudio/null | any audio |
| `IStorage` | memory/local | any storage |
| `ILogger` | console/memory | any logger |
| `IClock` / `IRandom` | core | deterministic overrides |
| `IModHost` | host boundary | sandbox/mod system |
| `IEventBusPort` | event bus | transport adapter |

## Scene data / 场景数据

- Scene JSON is authoring data, not a backend.
- `parseScene` validates; `instantiateScene` maps nodes to entities.
- The app owns file loading/saving; the engine only parses/instantiates.
- The Vite save endpoint exists only for local authoring.

## Agent consumption / Agent 如何消费

An agent can:

1. read `contracts/agent.json`;
2. run `node tools/itb.mjs describe`;
3. call `inspect/impact/check/gate/receipt`;
4. read source and tests;
5. optionally use MCP (`tools/mcp-server.mjs`).

No frontend/backend service is required to discover capabilities.

## Security boundary / 安全边界

- npm publishing is a **release action**, separate from runtime.
- Current account is in a 72h recovery-code hold (until about 2026-10-28 00:34 +08).
- Edge passkey is a viable browser route **only if registered to the npm account**; the 6-digit Windows Hello PIN is local, not an npm OTP.
- `stage approve` supports `--otp`; WebAuthn/passkey is used by interactive `npm publish`, not `stage approve`.
- Never commit npm tokens, recovery codes, TOTP secrets, or Windows Hello PINs.

## Deployment / 部署

Typical product deployment:

```text
build frontend bundle
→ host static assets
→ runtime kernel runs in the browser/worker
→ optional product backend outside the engine
```

The kernel is runtime-agnostic at the port level; DOM/Pixi/WebAudio live in adapters/app.
