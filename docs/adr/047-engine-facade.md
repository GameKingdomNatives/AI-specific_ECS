# ADR-047 createEngine 单一门面（Phase 1）

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/src/engine.ts`、`packages/engine/tests/engine-facade.test.ts`、`apps/game/src/main.ts`

## 背景

外部调用方和应用原来各自 new `World`/`EventBus`/`CommandBuffer`/`Scheduler`/`FixedClock`；场景重建时还要手动替换世界与调度器。

## 决策

1. `createEngine(options)` 创建核心运行时，并提供：
   - `add` / `step` / `advance` / `start` / `stop` / `dispose`；
   - `resetWorld()`：替换 World，保留 events/commands/clock；
   - `resetScheduler(options)`：替换 Scheduler，保留 World/events/commands/clock。
2. `apps/game/src/main.ts` 已迁移：
   - 初始化用 `createEngine`；
   - `world`/`scheduler` 从 engine 读取；
   - `applySystems` 用 `engine.resetScheduler`；
   - 场景重建用 `engine.resetWorld` + `applySystems`。
3. 应用事件总线、命令缓冲、固定时钟不再由 app 自己构造。

## 验收

- `engine-facade.test.ts` 4 组 PASS（含 resetWorld/resetScheduler）。
- 浏览器：`npm run dev` → tick 960、entities 68、bodies 66、err 0、scene demo、player ok。
- 全量 gate PASS；API surface 快照更新。

## 边界

- `start()` 是定时器驱动；渲染插值循环仍由 app 负责。
- app 的 `schemaGuard` 仍绑定初始 World；场景重建后的 HMR 守卫行为未重新验证。
- reset 不是“热重载所有系统”；系统注册仍由 app 的 applySystems 完成。
