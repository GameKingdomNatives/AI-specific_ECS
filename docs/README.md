# Docs Index / 文档目录

本目录是「深入战火 / agent-specific_ecs」的文档地图。新会话先读 `docs/handoff.md`，再按任务选读。

## 入口 / Entry

- [handoff.md](handoff.md) — 当前状态、最近完成、注意事项（会话交接第一读）
- [package-guide/README.md](package-guide/README.md) — **导出包从生到死总集**
- [../README.md](../README.md) — 为什么创建、怎么创建、工作原理、原型声明
- [00-最终指令.md](00-最终指令.md) — 项目宪法（工程范围）
- [publishing.md](publishing.md) — npm 发布、2FA、安全密钥、72h 冻结
- [workflow/full-workflow.md](workflow/full-workflow.md) — **完整工作流**（开工到交付、失败处理、命令速查）
- [workflow/iteration-workflow.md](workflow/iteration-workflow.md) — **迭代工作流**（证据分层、人的在场规则、收尾清单）
- [game/README.md](game/README.md) — **游戏项目**（与引擎平级；切片、操作、引擎反馈）
- [quality-adoption.md](quality-adoption.md) — **把质控方案装进别人的仓库**（npm 命令与文件索引，规划中）

## 包体指南 / Package guide

| 文档 | 内容 |
|---|---|
| [package-guide/01-lifecycle.md](package-guide/01-lifecycle.md) | 安装、定义、运行、接入、证明、发布、维护、废弃 |
| [package-guide/02-code-map.md](package-guide/02-code-map.md) | 代码地图、数据流、端口、门禁、前后端 |
| [package-guide/03-runtime-api.md](package-guide/03-runtime-api.md) | createEngine、World、Scheduler、场景、端口 |
| [package-guide/04-frontend-backend.md](package-guide/04-frontend-backend.md) | 为什么没有后端；前端样例与边界 |
| [package-guide/05-agent-playbook.md](package-guide/05-agent-playbook.md) | 其他 Agent 的发现/修改/验证/发布手册 |
| [package-guide/06-maintenance-release.md](package-guide/06-maintenance-release.md) | 版本、npm、OIDC、废弃、交接 |
| [package-guide/07-extending.md](package-guide/07-extending.md) | 扩展包体能力：组件/系统/导出/端口/规则 |
| [package-guide/08-current-project.md](package-guide/08-current-project.md) | 在本仓库/新产品中接入、验证、升级 |

## 架构与决策 / Architecture

- [adr/](adr/) — 架构决策记录（ADR-001…056）
- [proposals/006-agent-native-self-describing-core.md](proposals/006-agent-native-self-describing-core.md) — agent 原生双内核方向
- [guides/harness-lessons.md](guides/harness-lessons.md) — 质量门禁经验
- [guides/quality-primer.md](guides/quality-primer.md) — 质量入门
- [guides/local-branch-protection.md](guides/local-branch-protection.md) — 本地分支保护
- [guides/dsh-nightly-session.md](guides/dsh-nightly-session.md) — DSH 夜检边界

## 运行与维护 / Runbooks

- [runbooks/01-让规则生效.md](runbooks/01-让规则生效.md)
- [runbooks/02-提交审核流程.md](runbooks/02-提交审核流程.md)
- [runbooks/07-如何新增系统.md](runbooks/07-如何新增系统.md)
- [systems/](systems/) — 系统卡（demo/物理/场景）
- [audits/](audits/) — 批次验收、阶段验收、故障审计
- [audits/session-2026-10-25.md](audits/session-2026-10-25.md) — 本次公开/命名/发布/文档总集回顾与教训

## 关键契约 / Contracts

- `contracts/agent.json` — Agent 可读 entrypoints/capabilities
- `contracts/harness.json` — 10 条质量规则
- `contracts/capabilities.json` — 系统/阶段/Spec/契约测试
- `contracts/export-policy.json` — 导出 allowlist
- `contracts/api-surface.json` — 公开声明哈希

## 常用命令

```bash
node tools/gate.mjs
node tools/gate.mjs --fast
node tools/itb.mjs inspect
node tools/itb.mjs describe
node tools/itb.mjs impact
node tools/drill.mjs
node tools/receipt.mjs
```
