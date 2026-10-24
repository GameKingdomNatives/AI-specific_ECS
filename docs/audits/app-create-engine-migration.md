# App 迁移 createEngine（2026-10-24）

## 变更

- `apps/game/src/main.ts`：
  - 不再 `new World/EventBus/CommandBuffer/FixedClock/Scheduler`；
  - 用 `createEngine({ fixedStepMs, scheduler })`；
  - `world = engine.world`、`bus = engine.events`、`commands = engine.commands`、`clock = engine.clock`、`scheduler = engine.scheduler`；
  - 场景重建：`world = engine.resetWorld()`，`applySystems` 内 `engine.resetScheduler(...)`。
- `packages/engine/src/engine.ts`：
  - 新增 `resetWorld()` / `resetScheduler(options)`；
  - 事件/命令/时钟在重置时保持不变。
- `engine-facade.test.ts` 增加 reset 测试；API surface 快照更新。

## 证据

| 验证 | 结果 |
|---|---|
| `tsc -b` | PASS |
| `engine-facade.test.js` | 4/4 PASS |
| 浏览器 `npm run dev` | tick 960 · entities 68 · bodies 66 · err 0 · scene demo · player ok |
| 全量 gate | 随提交跑 |

## 未验证/边界

- `schemaGuard` 仍绑定初始 World；场景重建后的 HMR 守卫未重新验证。
- 编辑器保存/重建链未在本轮重新做浏览器回归（现有自动化只有 build/tsc）。
- `start()` 未接入 app 的渲染循环；app 仍用自己的固定步长循环，符合边界。
