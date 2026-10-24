# 006 · Agent 原生、工具无关的自描述能力内核

- 状态：方向已确认（2026-10-24 用户裁定）
- 日期：2026-10-24
- 关联：`docs/proposals/004-engine-ai-quality-next-stage.md`、`005-phase0-local-quality-implementation.md`
- 前提：当前引擎仍是 private；M4 前不公开、不发 npm。

## 0. 用户已裁定

| 问题 | 决定 |
|---|---|
| 内核边界 | **双内核**：运行时内核（ECS/确定性）+ 工程/质量内核（agent contract/harness/itb/证据链） |
| 导出边界 | 只导出运行时内核与显式 allowlist；tools/tests/docs/审计产物等 dev-only 不进产物 |
| 公开时间 | **M4** 后再公开 |
| 许可证 | **Apache-2.0** |
| MCP | 可选适配器；Agent 直接操作源码同等一等 |
| 命名/格式 | 统一用 **agent**，不用 AI；格式按规范整理 |

## 一句话

做一个**不依赖任何具体 Agent/IDE/SDK 的自描述能力内核**：任何具备读写代码与执行命令能力的 Agent，都能发现、理解、调用它，并围绕它构建产品。

## 1. 现有生态与缺口

| 项目 | 核心资产 | 与我们的差异 |
|---|---|---|
| Tooli / aclif | 自描述 CLI | 核心是 CLI 接口，不是领域内核 |
| agentfront | 单一声明派生 CLI/MCP/HTTP | 核心是注册表，偏 Agent 应用 |
| Dendron | 动态工具发现 / 执行树 | 核心是工具组织层，不是领域逻辑 |
| perfect-harness | 纯方法核心 + 适配器 | 核心是改进方法，不是可消费的引擎能力 |
| **本项目目标** | **领域能力内核 + 机器可读契约** | Agent 直接读代码/调 CLI 即可；不需要为每个工具写插件 |

真正的缺口不是“再做一个工具框架”，而是：

> 一个**领域逻辑自包含**、**能力自描述**、**调用面只有通用命令/代码**的代码库；Agent 围绕它组装产品。

## 2. 我们的资产

- ECS 内核、10 个冻结端口、确定性、场景数据、调度/命令/事件；
- `contracts/harness.json`：10 条 guide/sensor/negativeTest 规则；
- `contracts/agent.json`：6 entrypoints / 4 capabilities，`itb describe` 输出；
- `contracts/export-policy.json`：运行时 allowlist + dev-only 清单；
- `itb` CLI（inspect/describe/impact/check/gate/receipt）；
- Receipt、drill、stamp、deep-audit、属性/黄金测试；
- `createEngine` 单一门面、pack/starter 冒烟；
- 应用 `apps/game` 作为集成样例，不属于产品内核。

## 3. 目标架构

```text
@itb/contracts     机器可读能力契约（capabilities/agent contract/schema）
      │
agent-specific_ecs        纯领域内核：ECS/确定性；不依赖 Agent/IDE/MCP
      │
@itb/fixture       demo/场景/系统（可替换的产品内容）
      │
itb CLI            自描述：describe/capabilities/inspect/impact/check
      │
可选适配器          MCP/HTTP；只是薄壳，不进入核心依赖
```

### 双内核与导出边界

```text
运行时内核  packages/engine → dist/src + README（产品产物）
工程内核    tools/contracts/engineering/docs（dev-only，不进产物）
```

- `contracts/export-policy.json` 是唯一导出 allowlist；
- `export-policy` gate 校验运行时 package.files 不含 dev-only；
- Agent 可以直接读 dev-only 源码，但产品导出不包含它们。

### Agent Contract（M1，已落地）

`contracts/agent.json` + `itb describe` 已落地；每个能力有 id/summary/command/inputs/outputs/errors；gate `agent-contract` 校验；`删Agent入口` drill 验证会红。

### 设计原则

1. **无强制集成**：不要求 MCP、不要求插件、不要求特定 IDE；CLI/源码就是接口。
2. **核心零 Agent 依赖**：引擎不 import 任何 Agent SDK；适配器在边界。
3. **可验证**：每个能力有 sensor/negativeTest/receipt；Agent 调用后能拿到证据。
4. **产品分离**：ECS 是内核，demo 是 fixture，`apps/game` 是集成样例；产品逻辑不写进内核。
5. **可替换表面**：CLI 是首选；MCP/HTTP 可选，不改变核心契约。

## 4. 路线图

| 里程碑 | 内容 | 验收 |
|---|---|---|
| M0 当前质量 | 0.2 夜检首次投递、npm ci、app 门面、规则 10/10 | 全量 gate + receipt |
| M1 Agent Contract v1 | `contracts/agent.json`、`itb describe`、能力发现 | ✅ 已落地（ADR-052） |
| M2 可选 MCP | 薄 MCP server 暴露 describe/inspect/impact/check | ✅ 已落地（ADR-053），仍非必需路径 |
| M3 内核独立化 | fixture 拆出、private pack、starter 真安装 | ✅ fixture 已拆（ADR-054）；pack/starter 冒烟通过 |
| M4 开源准备 | Apache-2.0/公开 API 冻结/README/发布流程 | 🟡 LICENSE/README/ADR 就绪；仍 private，公开待用户批准 |

## 5. 执行顺序（已裁定）

1. 双内核：运行时内核 + 工程/质量内核；导出只走 allowlist。
2. M4 前保持 private；公开时 Apache-2.0。
3. MCP 可选，源码操作同等一等。
4. 统一用 agent 命名；不再用 AI 作为产品术语。
5. M1 已落地；下一步 M3 fixture 拆分、M2 可选 MCP、M4 开源准备。

## 6. 非目标

- 不做另一个 CLI 框架/Agent 编排器；
- 不把游戏内容写进内核；
- 不依赖某个 IDE/Agent 的插件机制；
- 不在私有稳定前上传 npm。
