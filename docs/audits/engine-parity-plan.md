# 引擎 parity 计划（目标：与规划无明显功能差距）

- 日期：2026-10-22
- 基线：HEAD `a0ea7f1`，工作区干净（`clear/` 已忽略）
- 依据：`docs/00-最终指令.md` §4–§22；源码与门禁实测
- 目标定义：**§4–§22 的规范性条目，要么有实现 + 测试/浏览器证据，要么在 ADR 中明确暂缓或属于已接受的偏离；不允许「没人知道还没做」的条目**。
- 状态（2026-10-22）：**B1–B5 全部完成**，parity 结论见 `docs/audits/engine-parity-matrix-2026-10-22.md`。

## 0. 事实基线

| 项 | 数值 |
|---|---|
| 提交 / 文件 | 70 / 257 |
| 引擎源码 / 测试 | 41 / 24 文件 |
| 门禁步骤 | 41（PASS） |
| 覆盖率 | 82.5%（近似，ADR-013） |
| 逻辑帧 / 提交（3000） | 0.73ms / 0.49ms avg |
| 端口 | 10 个（含 `IModHost` 占位） |

## 1. 复核结果：仍然存在的差距

### 1.1 规格有明确要求、代码未实现

| ID | 规格 | 现状（源码取证） | 判定 |
|---|---|---|---|
| PG-01 | §4「声明之外的写入由只读代理拦截」 | 只有启动期读写冲突校验；运行时 `World.set` 不检查系统声明 | 缺失 |
| PG-02 | §9「脏局 ⇒ invalid，不进入哈希回归」 | `Scheduler.invalid` 与 `RunState` 已停录制，但 `Recording` 无 invalid 字段，replay 不拒收 | 部分 |
| PG-03 | §5「事件 id 单调递增，回放时按 id 校验」 | `EventRecord.seq` 存在；`firstEventDivergence` 不比较 seq | 部分 |
| PG-04 | §7「文本：Pixi 内 Canvas 纹理缓存」 | `RenderItem` 无文本字段；渲染器只处理 Sprite/Graphics | 缺失 |
| PG-05 | §7「相机：抖动与缩放」 | 只有 `setCamera(x,y,zoom)`，无 shake | 缺失 |
| PG-06 | §9「渲染插值」 | 固定步长后直接渲染当前 tick，无 prev/current 插值 | 缺失 |
| PG-07 | §12「每系统 tick 计时（环形缓冲）」 | 只有 `frame-stats` 测 submit；scheduler 不记录系统耗时 | 缺失 |
| PG-08 | §12「debugView 自绘叠加层」 | 已有 `debugDraw`/`collectDebug`，但渲染器只解析 `line`，无颜色/形状 | 部分 |
| PG-09 | §10「启动时全量校验」 | `manifest.json` 存在但**无任何代码引用**；加载器不消费清单 | 部分 |
| PG-10 | §11「组件 schema 变更 → 整页降级并打印原因」 | HMR 只重建系统，无 schema 指纹与降级 | 缺失 |
| PG-11 | §8「接触对以事件形式回灌」 | `contacts()` 可查；无接触事件，命中由 `demo.hit` 主动查询 | 缺失 |
| PG-12 | §13「GPU 侧耗时」 | 只有 JS submit 耗时 | 缺失（观测项） |

### 1.2 已接受偏离 / 明确暂缓（保持记录，不算未解释缺口）

| 项 | 状态 |
|---|---|
| 图集（§7） | 暂缓：ADR-010 门槛（>32 贴图或 >2000 Sprite）未到，当前 3 张 |
| 鼠标按钮→动作（R7） | HARD 提案待裁定；不改 `InputSnapshot` 语义 |
| 录制压缩（§9） | 未做；当前录制 JSON 体积小，先量后定 |
| dump 落 `diagnostics/` 目录（§11） | 浏览器环境改为 localStorage + 可导出 JSON（沙箱限制），ADR 记录 |
| 面板趋势曲线（§16） | 观测增强，非功能缺口 |
| vitest/pnpm | ADR-001 已接受 |

### 1.3 文档漂移（一并修）

- §6 表仍写 `IAudio` 桩实现、`IStorage` 桩：实际已 WebAudio / localStorage；
- `IAudio` 端口实现描述与 `createGameAudio` 能力不一致。

## 2. 目标范围（按批次）

### B1 · 契约与确定性修补（已完成，ADR-018）

1. ~~**PG-01 写入守卫**~~（已完成）：`SchedulerOptions.enforceWrites`（默认关，dev 开）；调度器在调用系统前设置写入作用域，`World.set/add/remove` 越界即抛错并走既有故障隔离。补单测（越界写触发 onSystemError，合法写不受影响）。
2. ~~**PG-02 invalid 入档**~~（已完成）：`Recording.invalid?: boolean`；`Recorder.markInvalid()`；序列化/反序列化；`replay` 对 invalid 录制返回明确拒绝状态；CLI 打印原因并非零退出。补测试。
3. ~~**PG-03 事件序号校验**~~（已完成）：`firstEventDivergence` 比较 seq；补「同内容不同 seq」测试。
4. ~~**§6 文档修正**~~（已完成）：IAudio/IStorage 端口表与实现一致。

**验收**：新增测试通过；全量门禁 PASS；重演 CLI 对 invalid 录制给出可读拒绝。

### B2 · 表现能力（已完成，ADR-019/020）

5. ~~**PG-04 文本渲染**~~（已完成；HARD：`RenderItem.text/font/fontSize`，`port-contract.json` 已更新 + ADR-020）：
   - `Pixi Text` 按 `(text,font,size,tint)` 池化；默认 monospace/16、字号取整；文本变化即重建视图；
   - 单测 `text-style`（默认/夹取/池键）；浏览器 OCR 读到 `KILLS 0`，射击后读到 `KILLS 29`，`vis` 恒为实体数 +1。
6. ~~**PG-05 相机抖动**~~（已完成，ADR-019）：`PixiRenderer.shake(amp, ms)`（impl，不改端口），衰减由 tick/时间驱动；命中事件触发；浏览器验证。
7. ~~**PG-06 渲染插值**~~（已完成，ADR-019）：引擎纯函数 `interpolate(prev, curr, alpha)` + 应用层 prev/current 位置表；`renderTable(alpha)`；补纯函数测试；固定步长逻辑不变。

**验收**：截图/读数；插值纯函数测试；提交耗时无明显回退。

### B3 · 观测与调试（已完成，ADR-021）

8. ~~**PG-07 逐系统计时**~~（已完成）：`system-stats` 环形窗口 + `TimingBook` + `Scheduler.systemTimings()`；`__itb.timings()` 实测 7 系统 / count 60，`physics.bodySync` avg≈0.16ms。
9. ~~**PG-08 debug 命令集**~~（已完成）：`impl/debug-commands.ts` 纯解析 line/circle/rect + 颜色；渲染器逐条 stroke；夹具圆环+十字；截图确认。

**验收**：单测 + 浏览器截图；调试开销只在开关打开时产生。

### B4 · 数据与热更（已完成，ADR-022）

10. ~~**PG-09 manifest 接入**~~（已完成）：`assets-manifest.ts` zod（版本/尺寸/重复名）+ `parseAssetManifest`；应用 `loadTextureUrls` 启动校验并映射名字→URL，失败回退同名约定；浏览器 manifest 200、3 资源。
11. ~~**PG-10 schema 指纹降级**~~（已完成）：`schemaFingerprint` + `World.schemaFingerprint()`；`createSchemaGuard` 在系统 HMR 前比对，变化则打印原因并整页 reload；单测覆盖顺序无关与三类变化。

**验收**：测试 + 浏览器（改 schema 的模拟路径可断言 reload 条件）。

### B5 · 物理事件（已完成，ADR-023）

12. ~~**PG-11 接触事件回灌**~~（已完成）：`bridge/contacts.ts` 比较前后接触集合，发 `physics.contactEnter/Exit` 延迟事件（每 tick 上限 64，溢出计数），桥层 `physics.contacts` 系统；单测用真实 `PhysicsWorld` 验证进入/离开/上限；浏览器 8 系统无错。

**验收**：测试；事件顺序确定；不影响逻辑哈希（事件不参与世界哈希）。

### 范围外（本目标内只记录，不实现）

- 图集（门槛未到）、鼠标映射（HARD 待裁定）、录制压缩（先测体积）、GPU 精确计时（尝试只读探针，不可行则 ADR 记录）、面板趋势。

## 3. 顺序与依赖

```
B1 契约/确定性 ──> B2 表现 ──> B3 观测 ──> B4 数据/热更 ──> B5 物理事件
                                                   └─> 最终 parity 审计
```

- B1 先做：改动小、为后面批次提供确定性/失败语义保障；
- B2 的文本字段是唯一 HARD 端口变更，单独 ADR 与 `port-contract.json` 更新；
- 每批：测试 → 全量门禁 → 文档/ADR/handoff → 提交；
- 最终：更新 `gap-review` 为 parity 矩阵，逐条标注「实现/暂缓（ADR）/偏离」，无可解释缺口即达成。

## 4. 完成定义（DoD）

1. PG-01…PG-11 全部有实现 + 测试（或浏览器证据）；
2. 仅剩 §1.2 的已接受偏离与门槛暂缓项；
3. 全量门禁 PASS、覆盖率不低于当前（允许小幅波动但需说明）；
4. `docs/audits/gap-review-*` 更新为矩阵，`capabilities.md` 同步；
5. 端口变更（若有）走 HARD：ADR + `tools/port-contract.json` 更新 + 记录在 handoff。

## 5. 风险与待裁定

| 风险 | 处理 |
|---|---|
| 文本字段改动端口（HARD） | ADR-018 单独记录；若否决，则文本改为渲染器扩展方法（不推荐，破坏 SoA 表） |
| 写入守卫性能 | 默认关闭，仅 dev/测试开启；正式运行零开销 |
| 插值影响确定性 | 只影响渲染，不进入逻辑/哈希；单测 + 回放哈希不变 |
| 接触事件量 | 每 tick 上限 + 延迟派发；先量后调 |
| GPU 计时不可得 | 只读探针失败即记录为观测限制，不阻塞 parity |
