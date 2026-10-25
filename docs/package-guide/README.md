# Package Guide / 包体总集

This directory is the **from-birth-to-death** guide for the exported package `agent-specific_ecs` and the engineering system around it.

本目录是导出包 `agent-specific_ecs` 及其工程体系的**从生到死**总集，供其他 Agent / 其他会话直接阅读、调用、维护。

> **Status / 状态：prototype.** 功能动态推进；npm 尚未公开发布（包已 staged，账号在 72h 安全冻结内）。  
> Prototype only; actively evolving; not recommended as a production tool yet.

## Read order / 阅读顺序

| # | 文档 | 回答什么 |
|---|---|---|
| 1 | [01-lifecycle.md](01-lifecycle.md) | 从安装、接入、运行、维护到废弃的完整生命周期 |
| 2 | [02-code-map.md](02-code-map.md) | 代码地图：包、目录、数据流、前后端边界 |
| 3 | [03-runtime-api.md](03-runtime-api.md) | 运行时 API：createEngine、World、Scheduler、端口 |
| 4 | [04-frontend-backend.md](04-frontend-backend.md) | 为什么没有传统后端；前端样例如何接入 |
| 5 | [05-agent-playbook.md](05-agent-playbook.md) | 其他 Agent 如何发现能力、改代码、跑证据 |
| 6 | [06-maintenance-release.md](06-maintenance-release.md) | 版本、门禁、npm 发布、OIDC、废弃 |
| 7 | [07-extending.md](07-extending.md) | 如何新增组件/系统/导出/端口/规则 |
| 8 | [08-current-project.md](08-current-project.md) | 如何在本仓库/新产品中接入与升级 |

## 1 分钟入口 / One-minute start

```bash
npm ci
node tools/gate.mjs
node tools/itb.mjs describe
node tools/itb.mjs inspect
```

运行时：

```ts
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 1000 / 60 });
engine.add({
  name: 'example.system',
  phase: 'movement',
  reads: [],
  writes: [],
  update: () => {},
});
engine.step();
engine.dispose();
```

## Package identity / 包身份

```text
package:  agent-specific_ecs
version:  0.1.0
repo:     https://github.com/GameKingdomNatives/AI-specific_ECS
license:  Apache-2.0
runtime:  package/engine only (dist/src + docs/en + docs/zh + README)
dev-only: repo tools/ contracts/ root docs/ tests/ artifacts/ fixture
```

## What this is / 是什么

- a deterministic 2D ECS runtime kernel;
- a machine-readable engineering kernel: agent contract, gates, drills, receipts;
- a fixture/app separated from the kernel;
- an agent-consumable codebase: read source/contracts or run `itb`.

## What this is not / 不是什么

- 不是游戏内容库（没有机甲/关卡/数值内容）；
- 不是 Web 后端或数据库；
- 不是某个 IDE/Agent 的插件；
- 不是已稳定的生产框架。

## Evidence / 证据

- Runtime: `packages/engine/tests`
- Fixture: `packages/fixture/tests`
- Gate: `artifacts/gate/<run>/report.md`
- Receipt: `artifacts/receipts/<HEAD>.json`
- Contract: `contracts/agent.json`, `contracts/harness.json`
- ADRs: `docs/adr/`
- Handoff: `docs/handoff.md`
