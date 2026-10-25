# 06 · Maintenance & Release / 维护与发布

## Current release state / 当前发布状态

| Item | State |
|---|---|
| GitHub repo | **PUBLIC** `GameKingdomNatives/AI-specific_ECS` |
| Package name | `agent-specific_ecs` |
| Version | `0.1.0` |
| npm | **not published** |
| Staged package | `ec2e8ee5-c630-40d8-bd39-8defb7544de1`, status `staged` |
| npm account | 72h recovery-code hold, until ~**2026-10-28 00:34 +08** |
| TOTP | Microsoft Authenticator has **no npm entry** yet |
| Browser passkey | Edge has a passkey; must be registered to npm to work |
| License | Apache-2.0 |

Do not say “published” until `npm view agent-specific_ecs version` returns `0.1.0`.

## Release gate / 发布门禁

```bash
node tools/gate.mjs
node tools/checks/api-surface.mjs
node tools/checks/package-surface.mjs
node tools/checks/pack-smoke.mjs
node tools/checks/export-policy.mjs
node tools/checks/license.mjs
```

Requirements:

- full gate PASS;
- API surface unchanged or consciously updated;
- pack contains only `dist/src` + package.json/README;
- export policy contains runtime only;
- docs/ADR/handoff updated;
- version bumped when public API changes.

## Versioning / 版本

- Prototype: `0.x`; breaking changes allowed, but must be documented.
- First public version: `0.1.0`.
- Do not reuse a version already staged/published. If staged expires, reject/restage same version or bump.

## npm authentication / npm 认证

### Preferred after first release: OIDC

Configure npm Trusted Publishing:

- package → Settings → Trusted publishing → GitHub Actions;
- repo `GameKingdomNatives/AI-specific_ECS`;
- workflow `publish.yml`;
- workflow uses `id-token: write`, `npm publish --provenance`.

No long-lived token; no TOTP per release.

### First release: human 2FA

1. Wait out the 72h recovery-code hold.
2. Use **TOTP from Microsoft Authenticator** (npm entry) to approve staged:
   ```bash
   npm stage approve ec2e8ee5-c630-40d8-bd39-8defb7544de1 --otp=<6-digit>
   ```
3. Or, if npm has the Edge passkey registered, use interactive direct publish:
   ```bash
   npm publish --workspace packages/engine --access public
   ```
   Windows Hello prompts for the local PIN; the PIN is never typed into npm.

`npm stage approve` accepts OTP, not WebAuthn/passkey.

### Recovery codes / 恢复码

- Emergency only.
- A recovery-code sign-in triggers a 72h security hold; publishing is paused.
- Do not burn codes trying to bypass the hold.
- If no TOTP/passkey works, use npm Support or a new account; do not fake tokens.

## 2FA / passkey notes

- Edge passkey is usable only if it is also registered in npm **Security Keys**.
- Windows Hello PIN is a local unlock factor; it is not a TOTP and not a code for `--otp`.
- Edge passkey + Windows Hello can complete the browser WebAuthn ceremony for `npm publish`.
- Register a backup key/recovery method after the first successful release.

## Network / 网络

npm registry may be blocked in CN even when GitHub works. If `npm ping` times out:

```powershell
npm config set proxy http://127.0.0.1:<your-proxy-port>
npm config set https-proxy http://127.0.0.1:<your-proxy-port>
npm ping --registry=https://registry.npmjs.org/
```

Do not use random public proxies for credentials.

## CI / OIDC flow

`.github/workflows/publish.yml` is manual (`workflow_dispatch`):

```yaml
permissions:
  contents: read
  id-token: write
steps:
  - checkout
  - setup-node
  - npm ci
  - node tools/gate.mjs
  - npm publish --workspace packages/engine --access public --provenance
```

After the first publish, configure trusted publisher before running it.

## Deprecation / death / 废弃

```bash
npm deprecate agent-specific_ecs@0.1.0 "superseded by ..."
```

Then:

1. README: deprecated + replacement + migration link;
2. GitHub release note;
3. final migration version if possible;
4. archive repository/read-only;
5. remove CI secrets and scheduled jobs;
6. keep history; avoid unpublish unless legally required.

## Handoff checklist / 交接

- [ ] full gate PASS
- [ ] receipt generated
- [ ] `docs/handoff.md` updated
- [ ] `docs/package-guide/` updated if surface changed
- [ ] npm/GitHub status accurate
- [ ] no secrets/recovery codes in repo
- [ ] commit + push
- [ ] memory/runtime facts updated
