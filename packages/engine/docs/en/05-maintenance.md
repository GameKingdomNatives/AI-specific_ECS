# 05 · Maintenance & Death

## Status

This package is a **prototype**. Public API may change; semver is not yet a production promise.

## Versioning

- patch: internal fix;
- minor: additive API;
- major / documented 0.x break: breaking API or port change.

Never reuse a version that has been published or staged.

## Release evidence

Before publishing:

```bash
npm run build
npm pack --dry-run
```

Also run the repository gate and pack/install smoke when working from source. A green TypeScript build is not enough.

## Deprecation

When a package or version is superseded:

```bash
npm deprecate agent-specific_ecs@<version> "superseded by <replacement>; see <migration>"
```

Then:

1. add a deprecated notice to README;
2. publish a final migration/shim version if possible;
3. document data/schema migration;
4. keep old versions installable;
5. archive/read-only the repository if development ends.

## Death checklist

- [ ] replacement/migration documented
- [ ] deprecation published
- [ ] final release notes
- [ ] old versions remain installable
- [ ] CI/secrets/scheduled jobs removed
- [ ] repository archived or marked read-only
- [ ] no silent unpublish

## Security

- no tokens/recovery codes/TOTP secrets in docs or source;
- adapters should not log secrets;
- scene JSON is untrusted input: validate before instantiate;
- keep physical positions in ECS; avoid duplicate truth.

## Support boundary

This tarball documents the engine only. Repository tooling, contracts, ADRs and audits are maintained in the GitHub repository.
