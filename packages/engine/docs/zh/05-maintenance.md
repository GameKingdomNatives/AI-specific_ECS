# 05 · 维护与废弃

## 状态

本包是**原型**。公共 API 可能变化；semver 尚不是生产承诺。

## 版本

- patch：内部修复；
- minor：增加 API；
- major / 0.x 明确破坏：破坏 API 或端口。

不得复用已发布或已 staged 的版本号。

## 发布证据

```bash
npm run build
npm pack --dry-run
```

在源码仓库中还要跑全量 gate 与 pack/install 冒烟。`tsc` 绿不等于可发布。

## 废弃

包或版本被取代时：

```bash
npm deprecate agent-specific_ecs@<version> "superseded by <replacement>; see <migration>"
```

然后：

1. README 加 deprecated 通知；
2. 尽量发最终迁移/shim 版本；
3. 记录数据/schema 迁移；
4. 旧版本保持可安装；
5. 开发结束后归档/只读仓库。

## 死亡检查表

- [ ] 替代/迁移已记录
- [ ] deprecation 已发布
- [ ] 最终 release note
- [ ] 旧版本仍可安装
- [ ] CI/密钥/计划任务清理
- [ ] 仓库归档或只读
- [ ] 不静默 unpublish

## 安全

- 文档/源码不得包含 token、恢复码、TOTP 密钥；
- 适配器不得记录敏感信息；
- Scene JSON 是不可信输入，先校验再实例化；
- 位置真值留在 ECS，避免平行真相。

## 支持边界

本 tarball 只文档化引擎；仓库工具、契约、ADR、审计记录在 GitHub 仓库维护。
