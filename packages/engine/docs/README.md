# agent-specific_ecs — Engine Docs

This package ships **engine-only documentation** in two complete language sets:

- [English](en/README.md)
- [中文](zh/README.md)

The repository also contains engineering-harness documents (`tools/`, `contracts/`, ADRs, audits). Those are **not** part of this npm tarball; this package documents the runtime engine only.

> Status: prototype. Actively evolving; not recommended as a production tool yet.

## Read order

1. `en/01-quickstart.md` — install, create, step
2. `en/02-api.md` — engine/World/Scheduler/ports
3. `en/03-integration.md` — products, frontend/backend boundary
4. `en/04-extending.md` — components/systems/exported subpaths
5. `en/05-maintenance.md` — versioning, deprecation, death
6. `en/06-agent-playbook.md` — discovery and safe modification

## Package scope

- Runtime kernel: `dist/src` + this documentation + `README.md`.
- Not included: repository tools, contracts, tests, ADRs, audits, private fixture.
- `@itb/fixture` is private; external products must supply their own demo content.
