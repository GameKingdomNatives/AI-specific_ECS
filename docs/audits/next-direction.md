# 下一步开发方向（引擎侧）

- 日期：2026-10-21
- 依据：`git` 源码实测 + `docs/audits/engine-diff-and-progress.md` + `docs/00-最终指令.md`
- 结论：**先做 R1 渲染规模化**；R2 确定性快照/事件重演；R3 端口补全；质量项随迭代带入

## 进展

| 迭代 | 状态 | 证据 |
|---|---|---|
| R1a 相机剔除 + 渲染统计 | **已完成** | `impl/render-cull.ts`、`pixi-renderer.ts`、`tests/render-cull.test.ts`；浏览器实测 zoom 2.5 → `submitted 14/65, culled 51, views 65`，关剔除 `65/65` |
| R1b 视图池化 + 代际标记 | **已完成** | `impl/view-pool.ts`、`pixi-views.ts`（lastSeen 代际替代每帧 Set）；实测开火 `views 59→67 / pooled 87→79`，停火回到 `57 / 89`（复用而非累积） |
| R1c 图集 + render-bench 进门禁 | **基准已完成；图集暂缓** | `tools/render-bench.mjs` + `tools/render-bench-baseline.json` 进 gate（10000 项、95.3% 剔除、0.507ms 基线，预算 4ms）。图集按 ADR-010 暂缓：当前仅 3 张贴图，收益不可测，等 >32 张或 >2000 Sprite 再引入 |
| R2a Recording v2 + 事件级重演 | **已完成** | 录制带 `events`；`replay --self-test` 与 `--app` 均比对事件；实测浏览器 999 tick / 10 事件，CLI `事件对比 PASS`；单测覆盖 v2 往返与首个事件偏离定位 |
| R2b 世界快照/恢复 + 属性测试 | **已完成** | `World.snapshot()/restore()`（实体代际/空闲表/组件列，可 JSON 往返）、`Random.snapshotState/restoreState`；单测 4 例；浏览器实测 `h0=0eddd239 → 开火 h1=2a2a0dbc → 恢复 h2=0eddd239` |
| R3a WebAudio 后端 + 静音回退 | **已完成** | `impl/audio.ts` 增 `createWebAudio`（可注入上下文/加载器、静音回退、统计含 decoded/failures/started）；6 个单测；应用改用之 |
| R3b 输入映射（键位） | **已完成** | `data/input-map.ts` v1 schema + `resolveActions`；`apps/game/src/data/input-map.json`；实测 `KeyW → keys:["up"]`；鼠标重映射需端口变更 |
| R4 覆盖率与演练补强 | **已完成** | `tools/coverage.mjs`（NODE_V8_COVERAGE + 最内层区间）进门禁，阈值 70%，实测 81.7%；physics 增 2 例；drill 增「as any」第三类，3/3 拦截；ADR-013 |
| 临时 CC0 音效 | **已完成** | Kenney Sci-Fi / Interface 六条，`createWebAudio.sources` 映射；浏览器实测 `decoded/started = 1`；见 `apps/game/public/audio/CREDITS.md` |
| M2 控制条拆分 | **已完成** | `ControlBar/Button/StatusText/InfoRow` + stories（6 组标题 / 18 故事），门禁 storybook PASS |

## 0. 一句话判断

逻辑帧已经达标（3000 实体 **0.788ms**，预算 4ms），而渲染表是**每帧全量提交、每实体一个 Container、无剔除/无池化/无图集/无统计**——在弹幕类目标下，下一堵墙在渲染，不在 ECS。

## 1. 源码取证（不是印象）

| 能力 | 现状 | 证据 |
|---|---|---|
| 引擎规模 | 34 文件 / 2810 行；测试 21 文件 | `git ls-files packages/engine/src` |
| 渲染提交 | `submit(items)` 全量遍历；无相机剔除、无批处理、无对象池 | `impl/pixi-renderer.ts:101-104`、`impl/pixi-views.ts:102-114` |
| 视图 | 每实体一个 Container；纹理变化时 `destroy()` 重建；`seen` Set 每帧新建 | `pixi-views.ts:85-100` |
| 渲染统计 | 无（draw call / 可见数 / 提交耗时都拿不到） | `IRenderer` 只有 submit/setCamera/debugDraw/resize/destroy |
| 逻辑性能 | 3000 实体 200 tick 中位数 0.788ms | `artifacts/gate/<run>/bench.log` |
| 确定性 | 录制只有输入；哈希覆盖位置/组件 | `determinism/recording.ts:10-16` |
| 事件记录 | `EventBus.startRecording/stopRecording` 已存在，但**未进端口、未参与 replay** | `core/events.ts:76-93`；`ports/index.ts` 的 `IEventBusPort` 只有 emit/on |
| 音频 | 只有静音占位，无 WebAudio 后端 | `impl/audio.ts`（`createNullAudio`） |
| 输入 | 浏览器原始 keydown/keyup/pointer，无按键映射层 | `apps/game/src/input.ts:48-60` |
| 物理 | contacts/debugShapes/stats 已实现，但无独立测试 | `impl/physics.ts:249-257` |
| 门禁 | 34 步；无覆盖率阈值 | `tools/gate.mjs`、`artifacts/gate/<run>/codes.txt` |

审计给分：渲染 **75%** 是全部层里最低，端口 85%（音频占位）、确定性 90%（事件级未接）、门禁 92%。

## 2. 方向排序（影响 × 风险 × 依赖）

### R1 · 渲染规模化（推荐先做）

**为什么是现在**：目标类型（俯视弹幕/STG）的实体量级会从 65 涨到数千；逻辑已经够快，渲染的全量提交与每实体 Container 会先撞墙。这是**引擎能力**，不涉及游戏内容。

范围（全部在 `impl/` 内，**不动端口**）：

1. **相机剔除**：renderer 内部已知 camera(x,y,zoom) 与窗口尺寸；按世界坐标 AABB 判断是否可见，只提交可见项；统计「提交数 / 剔除数」。
2. **对象池**：Sprite/Graphics 视图按类型复用，实体销毁时回收而不是 `destroy()` 重建；`seen` Set 改为代际标记（避免每帧分配）。
3. **图集**：把已生成的 `player/box/bullet` 合并为一张 atlas + JSON 帧表；`RenderItem.texture` 增加可选的帧名（附加字段，HARD 需 ADR）。
4. **渲染基准**：`tools/render-bench.mjs` 用 stub renderer 测 `submit` 的 JS 耗时与剔除比例；真实 GPU 侧在页面用 `__itb.render()` 读可见数/提交数。

验收：

- 5000–10000 个 item 时，`submit` 的 JS 耗时不随总量线性增长（剔除生效）；
- 池化后稳定运行 60s，视图对象数不增长（无泄漏）；
- 页面 `__itb.render()` 能读到 `{visible, submitted, culled, views}`；
- 全量门禁新增 `render-bench` 步骤，有基线。

风险：低（不动端口；Pixi 内部实现）。回退：保留旧全量提交路径开关。

### R2 · 确定性快照 + 事件级重演

**为什么第二**：确定性是项目的质量底线能力。现在只验证「输入 → 位置哈希」，事件（命中、销毁、UI 反馈）没有进入重演；也没有世界快照，无法做中途存档/回滚。

范围：

1. `Recording` v2：可选 `events` 段（`EventBus.stopRecording()` 已有数据）；
2. `replay` 钩子增加 `events()`，`--verify-events` 比对序列；不一致时给首个偏离 tick；
3. 世界快照：`snapshot(world)` / `restore(world, snapshot)`，包含组件列 + RNG 流状态 + 实体代际；
4. 属性测试：随机输入 × N seeds，重演哈希与事件均一致。

验收：三次一致扩展到「哈希 + 事件」；快照→恢复→哈希一致；`replay --verify-events` 进 gate。

风险：中（涉及确定性算法与端口，需 ADR-010；快照格式需版本号）。

### R3 · 端口补全（音频 / 输入映射）

- `IAudio` WebAudio 后端：加载失败静音回退、音量/静音、mock AudioContext 测试；
- 输入映射数据化：`InputMap` schema（v2）+ 既有迁移管线；键盘/手柄/鼠标动作绑定，`IInput` 只产出快照；
- `IModHost` 暂缓（规格明确是占位，加载器不在本轮）。

### R4 · 质量项（随 R1/R2 带入）

- 覆盖率阈值（先 60%，只统计 `packages/engine/src`）；
- `contacts`/`debugShapes` 独立测试；
- 渲染基准进 gate；
- 违规演练增加「改门禁阈值」一条。

## 3. 建议的执行顺序（每步一个可交付）

| 迭代 | 内容 | 完成标志 |
|---|---|---|
| **R1a** | 相机剔除 + 渲染统计（`__itb.render()`） | 5000 item 剔除比例 > 60%，统计可读 |
| **R1b** | 视图池化 + 代际标记（去每帧 Set 分配） | 60s 运行视图数稳定，GC 抖动可测 |
| R1c | 图集 + 帧索引 + render-bench 进 gate | 基线写入 `tools/render-bench-baseline.json` |
| R2a | Recording v2（events）+ `--app`/`--self-test` 事件比对 | 事件序列三次一致 |
| R2b | 世界快照/恢复 + 属性测试 | 快照→恢复哈希一致 |
| R3a WebAudio 后端 + 静音回退 | **已完成** | `impl/audio.ts` 增 `createWebAudio`（可注入上下文/加载器，静音回退，统计含 decoded/failures/started）；4 个单测；应用改用之 |
| R3b 输入映射 schema + 迁移 | **已完成（键位）** | `data/input-map.ts`（v1 schema + 校验 + resolveActions）、`apps/game/src/data/input-map.json`、`input.ts` 接 map；实测 `KeyW → keys:["up"]`；鼠标按钮重映射需改端口，留待 ADR |
| R4 覆盖率与演练补强 | 待做 | — |

## 4. 暂不做

- 游戏内容（机甲/辐能/僚机/关卡）——AGENTS 明确不在范围；
- `IModHost` 加载器——规格占位；
- UI M2 拆组件——属于应用侧（`apps/game/src/ui`），不阻塞引擎能力；
- Onlook / Figma Dev Mode——已排除（ADR-009）。

## 5. 如果目标是「先让 AI 生成代码更安全」

把 R2 提前到 R1 之前：事件级重演与快照是「AI 改坏逻辑能被抓住」的最直接保障；R1 是性能扩展，晚一轮不影响正确性。

当前推荐仍是 **R1 先行**：它风险最低、不动端口，且能把「渲染侧不可观测」变成可观测（统计 + 基准），为后续所有视觉改动提供读数。
