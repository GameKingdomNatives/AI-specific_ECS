# agent-specific_ecs — Engine Docs

This package ships **engine-only documentation** in two complete language sets:

- [English](en/README.md)
- [中文](zh/索引.md)

The repository also contains engineering-harness documents (`tools/`, `contracts/`, ADRs, audits). Those are **not** part of this npm tarball; this package documents the runtime engine only.

> Status: prototype. Actively evolving; not recommended as a production tool yet.

## Read order

1. `en/01-快速开始.md` — install, create, step
2. `en/02-API.md` — engine/World/Scheduler/ports
3. `en/03-集成.md` — products, frontend/backend boundary
4. `en/04-扩展.md` — components/systems/exported subpaths
5. `en/05-维护与废弃.md` — versioning, deprecation, death
6. `en/06-智能体手册.md` — discovery and safe modification

## Package scope

- Runtime kernel: `dist/src` + this documentation + `README.md`.
- Not included: repository tools, contracts, tests, ADRs, audits, private fixture.
- `@itb/fixture` is private; external products must supply their own demo content.
