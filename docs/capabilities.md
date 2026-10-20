# 能力注册表

实现新系统前先查这里；已有能力就复用，不重复造。新增能力需同时补系统卡与契约测试。

| 能力 | 入口 | 边界 | 状态 |
|---|---|---|---|
| 实体生命周期（含 generation 防悬挂） | `World.spawn / despawn / isAlive` | core | 已具备 |
| 组件存储（SparseSet + 列式） | `defineComponent`、`World.add/get/set/remove` | core | 已具备 |
| 查询 | `World.query(...defs)` | core | 已具备 |
| 延迟结构变更 | `CommandBuffer` + 阶段末 flush | core | 已具备 |
| 依赖图调度 | `Scheduler.add/build/run` | core | 已具备 |
| 事件广播（同步/延迟/录制） | `EventBus` | core | 已具备 |
| 端口契约 | `packages/engine/src/ports` | ports | 已冻结（9 个） |
| 方块运动夹具 | `demo.movement` | demo | 已具备 |
| 渲染表批处理 | `IRenderer.submit`（Pixi 实现） | impl | 已具备 |
| 物理查询（圆／盒／胶囊／凸多边形／射线／扫掠／扇形／最近） | `IPhysics` v2 → `PhysicsWorld` | impl | 已具备（端口 v2） |
| 接触对与调试形状 | `contacts()` / `debugShapes()` / `stats()` | impl | 已具备 |
| 数据校验与失败隔离 | `parseContent` / `loadContent` | data | 已具备 |
| 数据热加载 | — | data | 待第三批 |
| 确定性回放 | `src/determinism` | determinism | 待第三批 |
