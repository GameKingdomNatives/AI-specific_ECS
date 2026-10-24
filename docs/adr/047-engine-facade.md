# ADR-047 createEngine 单一门面（Phase 1）

- 状态：已接受
- 日期：2026-10-24
- 相关：`packages/engine/src/engine.ts`、`packages/engine/tests/engine-facade.test.ts`

## 背景

外部调用方目前需要自己 new `World`/`EventBus`/`CommandBuffer`/`Scheduler`/`FixedClock` 并知道构建顺序；违反“复杂隐于内部、外部简单易懂”。

## 决策

新增 `createEngine(options)`，返回：

- `world` / `events` / `commands` / `scheduler` / `clock`；
- `add(system)` / `step()` / `advance(realMs)` / `start()` / `stop()` / `dispose()`；
- `running` 只读。

行为：

- 构造时按 `systems` 添加并 `scheduler.build()`；
- `step()` 走一 tick；`advance(ms)` 按固定步长跑对应次数，tick 从旧值连续；
- `start()` 用 `setInterval(stepMs)` 推进；`stop()` 清除；`dispose()` 可重复；
- 门面只绑核心世界/调度，不绑 Pixi/物理/输入；平台适配器由调用方接入。

## 验收

- `engine-facade.test.js` 3 组：step/advance/start-stop-dispose。
- 全量 gate PASS；API surface 快照更新为人工评审结果。

## 边界

- `start()` 是定时器驱动，不替代浏览器 `requestAnimationFrame` 的插值渲染；渲染循环仍由应用层负责。
- 现在应用 `apps/game` 尚未迁移到门面；迁移要单独验证输入/渲染/物理。
- 门面 API 进入公共面，API-001 快照会因它变化；更新快照需评审。
