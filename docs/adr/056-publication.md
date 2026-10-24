# ADR-056 公开与 npm 发布

- 状态：已批准（2026-10-24 用户明确批准）
- 相关：`README.md`、`LICENSE`、`packages/engine/package.json`

## 决定

1. 仓库由 private 改为 **public**。
2. `@itb/engine` 从 private 改为可发布，目标 registry 为 `https://registry.npmjs.org/`，`access: public`。
3. root 与 `@itb/fixture` 保持 private；fixture 不单独发布。
4. 发布前必须：全量 gate PASS、API surface 未漂移、export 只含 runtime、LICENSE/README 就绪。
5. 发布后保留“原型”声明：功能动态推进，不建议直接用于生产。

## 执行记录

- GitHub 可见性：**已公开** `https://github.com/GameKingdomNatives/AI-specific_ECS`（2026-10-24）。
- npm dry-run：PASS；`@itb/engine@0.1.0`，188 files，93.2 kB。
- npm 实际发布：**未完成**；`npm publish` 返回 `ENEEDAUTH`，本机未登录 `https://registry.npmjs.org/`。需要 `npm adduser`/token 与 `@itb` scope 权限后才能上传，不能伪称已发布。
- 实际 npm 包版本：`0.1.0`（待认证后发布）。

## 边界

- 公开仓库不等于 npm 已发布；两者分别记录。
- 不在没有 npm 认证时使用 `--force` 或假 token。
