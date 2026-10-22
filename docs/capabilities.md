# 能力注册表

实现新系统前先查这里；已有能力就复用，不重复造。新增能力需同时补系统卡与契约测试。
（2026-10-22 校正：端口 10 个；删除 Onlook 与「待第三批」旧项；补事件级回放、世界快照、输入映射、渲染剔除/池化、覆盖率、音效与 UI 组件。）

| 能力 | 入口 | 边界 | 状态 |
|---|---|---|---|
| 实体生命周期（含 generation 防悬挂） | `World.spawn / despawn / isAlive` | core | 已具备 |
| 组件存储（SparseSet + 列式） | `defineComponent`、`World.add/get/set/remove` | core | 已具备 |
| 查询 | `World.query(...defs)` | core | 已具备 |
| 延迟结构变更 | `CommandBuffer` + 阶段末 flush | core | 已具备 |
| 依赖图调度 | `Scheduler.add/build/run` | core | 已具备 |
| 事件广播（同步/延迟/录制） | `EventBus` | core | 已具备 |
| 系统写入守卫（dev） | `SchedulerOptions.enforceWrites` + `World.beginWriteScope`（`?guard=1`） | core+app | 已具备（ADR-018） |
| 脏局无效录制 | `Recording.invalid` + `Recorder.markInvalid` + replay 拒收 | determinism | 已具备（ADR-018） |
| 世界快照 / 恢复 | `World.snapshot/restore` + `core/world-state.ts` | core | 已具备（JSON 可往返） |
| 随机流状态快照 | `Random.snapshotState/restoreState` | core | 已具备 |
| 端口契约（10 个） | `packages/engine/src/ports` | ports | 已冻结（ADR-006） |
| 方块运动夹具 | `demo.movement` | demo | 已具备 |
| 渲染表提交 | `IRenderer.submit`（Pixi 实现，图元/贴图/文本） | impl | 已具备 |
| 文本渲染 | `RenderItem.text/font/fontSize` + Pixi Text 池化 | impl | 已具备（HARD，ADR-020） |
| 相机剔除 + 渲染统计 + 提交计时 | `impl/render-cull.ts`、`impl/frame-stats.ts`、`PixiRenderer.stats()/setCulling()` | impl | 已具备（submitMs/avg/p95） |
| 相机抖动 | `PixiRenderer.shake` + `impl/camera-shake.ts`（命中事件触发） | impl+app | 已具备（ADR-019） |
| 渲染插值 | `core/interpolate.ts` + `FixedClock.alpha` + `capturePoses` | core+app | 已具备（ADR-019） |
| 贴图合批（默认开） | `impl/particle-batch.ts`、`?batch=0` 回退 | impl+app | 已具备（3000 项 avg 0.49ms；真实场景验收通过） |
| 系统自绘叠加层 | `SystemDef.debugDraw` + `Scheduler.collectDebug` + `?debug=1`/F3 | core+app | 已具备（ADR-017，line 命令） |
| 视图池化 + 代际清理 | `impl/view-pool.ts`、`pixi-views.ts` | impl | 已具备 |
| 渲染剔除基准 | `tools/render-bench.mjs`（万项、预算 4ms） | tools | 已具备（进门禁） |
| 提交簿记基准 | `tools/submit-bench.mjs`（3000 项、基线 0.432ms、预算 2ms） | tools | 已具备（进门禁） |
| 物理查询（圆／盒／胶囊／凸多边形／射线／扫掠／扇形／最近） | `IPhysics` v2 → `PhysicsWorld` | impl | 已具备（端口 v2） |
| 接触对与调试形状 | `contacts()` / `debugShapes()` / `stats()` | impl | 已具备（含独立测试） |
| 数据校验与失败隔离 | `parseContent` / `loadContent` | data | 已具备 |
| 种子随机流（按名派生） | `Random` / `stream(seed, name)` | core | 已具备 |
| 世界哈希 | `worldHash` / `worldHashGroups` / `hashHex` | determinism | 已具备 |
| 录制与序列化（事件级 v2） | `Recorder` / `serialize` / `deserialize` | determinism | 已具备（`events` 可选段） |
| 固定步长时钟 | `FixedClock`（上限防死亡螺旋、暂停/变速/单步） | core | 已具备 |
| 回放执行器（哈希 + 事件 + 序号） | `replay` / `firstDivergence` / `firstEventDivergence`（比较 seq） | determinism | 已具备 |
| 无头回放 CLI | `node tools/replay.mjs`（自测/写录制/事件比对/`--app`） | tools | 已具备（实测 999 tick / 10 事件） |
| 输入快照接入主循环 | `createBrowserInput`（app）＋每 tick 采样/录制 | app | 已具备 |
| 输入映射（键位 → 动作） | `data/input-map.ts`、`apps/game/src/data/input-map.json` | data+app | 已具备（鼠标按钮重映射待 HARD） |
| 单系统崩溃隔离 | `SchedulerOptions.maxConsecutiveFailures` / `disabledSystems` / `onSystemError` | core | 已具备 |
| 脏局失效标记 | `Scheduler.invalid` + `RunState`（停录制） | core+app | 已具备（§9） |
| 系统探针页 | `?probe=<system>` | app | 已具备 |
| 场景数据契约 | `scene` zod schema + `parseScene`（节点树/资源别名/系统清单） | scene | S0 已具备（ADR-024） |
| 场景实例化 | `instantiateScene`（节点→实体、组件、父子、资源别名） | scene | S1 已具备（ADR-024） |
| 调度数据化 | `buildSchedule`（scene 系统清单→SystemDef[]，phase/after/params） | scene | S2 已具备（ADR-025） |
| 场景编辑器（S3） | `?editor=1` 面板：场景树/检查器/资源浏览器（内存编辑） | app | S3 已具备（ADR-026） |
| 接触事件桥 | `bridge/contacts.ts`（enter/exit + 每 tick 上限） | bridge | 已具备（ADR-023） |
| 资源清单 | `parseAssetManifest`（zod）+ `loadTextureUrls` | data+app | 已具备（ADR-022） |
| schema 指纹 | `World.schemaFingerprint()` + HMR `schemaGuard` | core+app | 已具备（ADR-022） |
| 逐系统耗时 | `Scheduler.systemTimings()` + `impl/system-stats` 环形窗口 | core | 已具备（ADR-021） |
| 调试叠加层命令 | `line/circle/rect` + `#rrggbb`（`impl/debug-commands`） | impl | 已具备（ADR-021） |
| 系统热替换（HMR） | `system-registry.ts` accept + `Scheduler.dispose()`，保留世界状态 | app | 已具备（旧系统逆序 dispose） |
| 内容热加载 | `content.ts`（JSON 模块更新 → 重新校验 → 重建实体） | app | 已具备 |
| 诊断 dump（浏览器） | `__itb.dumps()` | app | 已具备 |
| 逻辑帧基准 | `tools/bench.mjs`（3000 实体，历史基线对比） | tools | 已具备（最新 0.97ms） |
| 数据迁移管线 | `applyMigrations` / `parseContentMigrated` | data | 已具备 |
| 资源加载器 | `createAssetLoader`（缓存、失败隔离、clear） | data | 已具备 |
| 程序化贴图 | `tools/gen-assets.mjs` | tools | 已具备 |
| 贴图渲染 | `RenderItem.texture` → Sprite（失败回退几何） | impl | 已具备 |
| 音频后端（WebAudio） | `createWebAudio`（可注入上下文、静音回退、sources 映射） | impl | 已具备（临时 CC0 音效） |
| 音效资源 | `apps/game/public/audio/*` + `CREDITS.md` | app | 已具备（临时，正式版替换） |
| 日志端口 | `createMemoryLogger` | impl | 已具备 |
| 故障 dump | `createDumpSink`（环形、持久化、导出） | impl | 已具备 |
| 重复重演校验 | `replay --self-test --repeat 3` | tools | 已具备（进门禁） |
| 违规演练（5 类） | `tools/drill.mjs`（越界 import / 超预算 / `as any` / 删测试 / 改阈值） | tools | 已具备（ADR-016） |
| 测试基线 | `tools/test-baseline.json` + registry `checkTestBaseline` | tools | 已具备（测试只增不减） |
| engine 独立构建 | 门禁 `engine-standalone`（`tsc -p packages/engine --noEmit`） | tools | 已具备 |
| 覆盖率门禁 | `tools/coverage.mjs`（阈值 70%，实测 81.7%） | tools | 已具备（近似口径，ADR-013） |
| UI 覆盖层 | React 19 + `UiSnapshot` 只读 + `UiIntents`（10Hz） | apps/ui | 已具备 |
| UI 组件 | `ControlBar/Button/StatusText/InfoRow` | apps/ui | 已具备 |
| 组件画布 | Storybook 10.6（18 个故事） | apps/ui | 已具备（进全量门禁） |
| 独立起步工程 | `starters/ui-storybook-kit/` | starters | 已具备（可单独复制） |
| 可视化编辑 | Onlook | 外部 | **已排除**（ADR-009） |
| 设计评审 | Storybook 本地/静态包 | apps/ui | 已具备（唯一评审面） |
| 存档 UI | 页内 存档/读档/清除/导出录制 | app | 已具备 |
| 录制干净开局校验 | `startHash` + `startHashMatches` | determinism | 已具备 |
