# Publishing / 发布

## 结论 / Summary

English: Do not rely on a 2FA-bypass token. Use a human 2FA approval (OTP or staged publishing), or configure npm **Trusted Publishing (OIDC)** from GitHub Actions.

中文：不要依赖绕过 2FA 的 token。使用人工 2FA 批准（OTP 或 staged publishing），或在 GitHub Actions 配 npm **Trusted Publishing（OIDC）**。

## Option A — Interactive OTP / 交互式 OTP

English: Run in a real terminal so npm can prompt for the 6-digit code.

```bash
npm login --auth-type=web
npm publish --workspace packages/engine --access public --otp
```

中文：在真实终端里执行，让 npm 提示输入 6 位验证码。`--otp` 不带值时会交互询问。

## Option B — Staged publishing / 暂存发布

English: Stage from CLI, then approve with 2FA. This is useful when the publishing shell cannot prompt.

```bash
npm stage publish --workspace packages/engine --access public
npm stage list
npm stage approve <stage-id>
```

中文：CLI 先暂存，再由有 2FA 的人批准。npm 11.20 支持 `npm stage`；可创建新包。

## Option C — Trusted Publishing (OIDC) / 可信发布

English: Recommended for repeatable CI. Configure the package on npmjs.com as a trusted publisher for this repository and workflow (`publish.yml`), then run the workflow. No long-lived npm token is stored.

1. Publish the first version interactively (Option A or B).
2. On npmjs.com → package → Settings → Trusted publishing → GitHub Actions:
   - repository: `GameKingdomNatives/AI-specific_ECS`
   - workflow: `publish.yml`
   - environment: leave empty unless configured.
3. Run the `publish` workflow manually.

Workflow: `.github/workflows/publish.yml` uses `id-token: write` and `npm publish --provenance`.

中文：推荐用于可重复 CI。先在 npm 网页把包配置为可信发布者（仓库 + `publish.yml`），再手动跑 workflow；不保存长期 token。

## Deprecated / 已废弃

English: The 2FA-bypass granular token no longer skips 2FA for account changes and is being restricted for direct publishing. Do not build a release process around it.

中文：2FA-bypass token 已不能跳过账户类敏感操作的 2FA，直接发布也在被限制；不要把发布流程建立在它上面。

Reference: https://github.blog/changelog/2026-07-08-npm-install-time-security-and-gat-bypass2fa-deprecation/
