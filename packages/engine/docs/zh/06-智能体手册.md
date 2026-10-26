# 06 · Agent 手册

## 发现包

具备基本读写代码/执行命令能力的 Agent 可以：

1. 读 `node_modules/agent-specific_ecs/docs/`；
2. 检查 `dist/src/*.d.ts` 与 `package.json` exports；
3. import 包并跑最小脚本；
4. 如有 source map 就读实现。

不需要 IDE 插件、SDK、MCP 或特殊集成。

## 第一条命令

```bash
node -e "import('agent-specific_ecs').then(m => console.log(Object.keys(m)))"
```

TypeScript：

```ts
import { createEngine } from 'agent-specific_ecs';
```

## 导入路径

```text
agent-specific_ecs          core + createEngine
agent-specific_ecs/core     ECS 原语
agent-specific_ecs/ports    接口
agent-specific_ecs/scene    场景 schema/parse/instantiate
agent-specific_ecs/bridge
agent-specific_ecs/impl
agent-specific_ecs/data
agent-specific_ecs/determinism
agent-specific_ecs/logger /audio /diagnostics /physics /storage
```

## 安全修改

- 组件/系统加在产品，不进 core；
- 结构变更走 CommandBuffer；
- 冷信号走 EventBus；
- 确定性系统不得用墙钟/`Math.random`；
- 不改端口/exports，除非做版本决策；
- fixture/private 内容不进内核。

## 验证

- 新行为有单元/契约测试；
- 模拟变化有回放/确定性测试；
- 改包面有 pack/install 冒烟；
- 在源码仓库改代码跑全量 gate。

## 常见坑

| 坑 | 正确做法 |
|---|---|
| import `@itb/engine` | 用 `agent-specific_ecs` |
| 系统直接 import 另一系统 | 走事件/命令 |
| 系统内改实体结构 | CommandBuffer |
| 热循环用 EventBus | 直接读写/命令 |
| 用 `Math.random` | 确定性随机流 |
| UI 放进 core | 适配器/产品 |
| 把包当后端 | 它是运行时库 |

## 交接

改包时：

- 更新本 docs 树；
- 更新根 README；
- 升版本；
- 产生发布证据；
- 删除能力时写迁移/废弃说明。
