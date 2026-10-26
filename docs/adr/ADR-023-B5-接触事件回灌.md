# ADR-023 B5 接触事件回灌（物理事件化）

- 状态：已接受
- 日期：2026-10-22
- 相关：§8 物理、parity PG-11

## 背景

`IPhysics.contacts()` 只提供当前 tick 的接触对（按 `(a,b)` 升序），玩法若每帧轮询会散落在系统里；规格要求把「进入/离开」作为事件回灌给逻辑层，并限制每 tick 事件量。

## 决策

1. **桥层系统**：`bridge/contacts.ts::createContactEvents(physics, options)` 返回 `SystemDef`（`name=physics.contacts`，`phase=collision`，`reads/writes=[]`），每 tick：
   - 读取 `physics.contacts()` 建 `Map<pairKey, Contact>`；
   - 与上一 tick 比较：新增发 `physics.contactEnter`，消失发 `physics.contactExit`，payload `{a,b,key}`；
   - 用 `ctx.bus.emitDeferred` 入队，阶段末统一派发（冷路径，符合「热路径不走事件总线」）；
   - `maxEventsPerTick`（默认 64）限制进出合计，溢出累加 `stats().overflow`，不阻塞逻辑；
   - `stats()` 暴露 `active/overflow/enterType/exitType`。
2. **确定性**：接触对顺序由 physics 保证 `(a,b)` 升序，Map 迭代顺序稳定；事件不进入世界哈希、不参与录制输入，回放不受影响。
3. **不新增端口**：复用 `IPhysics.contacts()` 与 `EventBus.emitDeferred`，端口契约零变更。
4. **导出**：`bridge/index.ts` 汇总 `physics` 与 `contacts`；`packages/engine/package.json` 的 `./bridge` 子路径指向 `index`（保护路径改动已记录；门禁以 `ALLOW_PROTECTED=1` 跑过）。
5. **应用**：系统注册表在 `createPhysicsBridge` 之后挂 `createContactEvents(deps.physics)`；浏览器实测 8 个系统、`physics.contacts` count=60、无错误。

## 验收

- 单测（真实 `PhysicsWorld` + EventBus）：重叠圆 → 一次 enter；原地不动 → 不重复发；移开 → 一次 exit；cap=1 时只发 1 条且 overflow≥2。
- 浏览器：`__itb.timings()` 含 `physics.contacts`，tick 600 无 err/dump。
- 全量门禁 PASS（含覆盖率、回放、依赖边界）。

## 后果

- 正面：玩法可用事件消费接触，不需要各自轮询；事件量与顺序可控。
- 代价：每 tick 一次 contacts() 全量扫描（当前 65 刚体，实测 avg≈0.01ms）；事件量受上限约束，极端堆叠时溢出只计数、不丢逻辑（下一 tick 仍可比较）。
- 回退：不注册该系统即回到查询模式。
