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
| 种子随机流（按名派生） | `Random` / `stream(seed, name)` | core | 已具备 |
| 世界哈希 | `worldHash(world, defs)` / `hashHex` | determinism | 已具备 |
| 录制与序列化 | `Recorder` / `serialize` / `deserialize` | determinism | 已具备 |
| 固定步长时钟 | `FixedClock`（上限防死亡螺旋、暂停/变速/单步） | core | 已具备 |
| 回放执行器 | `replay(recording, hooks)` / `firstDivergence` | determinism | 已具备 |
| 无头回放 CLI | `node tools/replay.mjs`（自测/写录制/对比） | tools | 已具备 |
| 输入快照接入主循环 | `createBrowserInput`（app）＋ 每 tick 采样/录制 | app | 已具备 |
| 单系统崩溃隔离 | `SchedulerOptions.maxConsecutiveFailures` / `disabledSystems` / `onSystemError` | core | 已具备 |
| 系统探针页 | `?probe=<system>`（只跑单系统 + 最小世界） | app | 已具备 |
| 系统热替换（HMR） | `system-registry.ts` accept，保留世界状态 | app | 已具备 |
| 内容热加载 | `content.ts`（JSON 模块更新 → 重新校验 → 重建实体） | app | 已具备 |
| 录制 → 无头重演 | `__itb.recording()` + `node tools/replay.mjs --app` | app+tools | 已具备（403 tick 哈希一致） |
| 诊断 dump（浏览器） | `__itb.dumps()`（系统名/tick/错误/栈） | app | 已具备 |
| 逻辑帧基准 | `npm run bench`（默认 3000 实体，含历史基线对比） | tools | 已具备 |
| 数据迁移管线 | `applyMigrations`（逐版、缺链即失败） | data | 已具备 |
| 内容迁移接线 | `parseContentMigrated`（迁移后再 Zod 校验） | data | 已具备 |
| 存储与存档 | `createMemoryStorage` / `createLocalStorage` / `createSaveStore`（版本绑定、损坏隔离） | impl | 已具备 |
| 录制干净开局校验 | `startHash` + `replay` 返回 `startHashMatches` | determinism | 已具备 |
| 数据热加载 | — | data | 待第三批 |
| 确定性回放 | `src/determinism` | determinism | 待第三批 |
