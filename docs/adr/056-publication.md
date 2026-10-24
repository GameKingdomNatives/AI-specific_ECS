# ADR-056 公开与 npm 发布

- 状态：已批准（2026-10-24 用户明确批准）
- 相关：`README.md`、`LICENSE`、`packages/engine/package.json`

## 决定

1. 仓库由 private 改为 **public**。
2. `agent-specific_ecs` 从 private 改为可发布，目标 registry 为 `https://registry.npmjs.org/`，`access: public`。
3. root 与 `@itb/fixture` 保持 private；fixture 不单独发布。
4. 发布前必须：全量 gate PASS、API surface 未漂移、export 只含 runtime、LICENSE/README 就绪。
5. 发布后保留“原型”声明：功能动态推进，不建议直接用于生产。

## 执行记录

- GitHub 可见性：**已公开** `https://github.com/GameKingdomNatives/AI-specific_ECS`（2026-10-24）。
- npm dry-run：PASS；`agent-specific_ecs@0.1.0`，188 files，约 94 kB。
- npm 登录/令牌：用户已写入 token；但 `npm whoami` 返回 **401 Unauthorized**，token 本身不被 npmjs 接受（长度/前缀正常，非格式问题）。
- npm 实际发布：**未完成**；改名后 `npm publish` 返回 404（认证失败后的权限遮蔽）。没有创建任何 npm 包。
- 需要重新生成 **Granular Access Token**（read/write + Bypass 2FA + 可选 package `agent-specific_ecs`）或使用当前 OTP，才能上传。
- 公开文件已中英双语/英语优先（`README.md`、`packages/engine/README.md`、package description）。
- 实际 npm 包版本：`0.1.0`（待认证后发布）。

## 边界

- 公开仓库不等于 npm 已发布；两者分别记录。
- 不在没有 npm 认证时使用 `--force` 或假 token。
