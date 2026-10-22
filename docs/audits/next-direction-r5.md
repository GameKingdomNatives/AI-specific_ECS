# 下一步方向（R5 及之后）

- 日期：2026-10-22
- 依据：`docs/00-最终指令.md` §7/§9/§11/§12/§13/§19/§20 对照源码与门禁实测；`docs/capabilities.md`、`docs/audits/engine-diff-and-progress.md`
- 基线：HEAD `94e2981`，工作区 0 未提交（除外来目录 `clear/`），全量门禁 38 步 PASS，覆盖率 81.7%

## 0. 一句话判断

规格里还缺三块硬能力：**渲染合批 + 提交耗时**（§7/§13/§20 第二批）、**验收演练 3 类只做了 1 类**（§19）、**HMR 旧系统没 dispose、崩溃局没标 invalid**（§11/§9）。其余是文档漂移，先修文档再动代码。

## 1. 规格对照（现状 × 差距）

### 1.1 已经达成、不再列为缺口

| 规格 | 证据 |
|---|---|
| §4 ECS（含快照/恢复） | `core/world-state.ts`、`World.snapshot/restore`，单测覆盖 JSON 往返与代际 |
| §5 事件总线（同步/延迟/录制） | `core/events.ts` + `tests/demo.contract` |
| §9 录制/回放/哈希/事件级比对 | Recording v2、`replay --self-test/--app`、999 tick/10 事件 PASS |
| §10 数据校验/迁移/资源加载 | `data/*`、`tests/data|migrate|assets` |
| §13 逻辑帧 ≤4ms | bench 最新 0.97ms（基线 0.688，容差 1.5） |
| §14 门禁解析型检查 | 38 步含 registry/depcruise/drill/findings/coverage |
| §16 面板 | 8 块，含诊断明细 |
| §19 回放一致、3000 实体 | 均已实测 |

### 1.2 真实差距（按影响排序）

| # | 规格 | 现状 | 差距 |
|---|---|---|---|
| G1 | §7「渲染器做 diff，把连续同类图元塞进 Pixi 批处理」 | 视图池化 + 剔除 + **ParticleContainer 合批（可选，默认关）** | 几何图元仍逐项 Graphics；混合贴图 z 序待验证；图集暂缓（ADR-010） |
| G2 | §13「单帧渲染提交 ≤1ms」 | `render-bench` 只测剔除判定（0.5ms/万项） | **没有 submit 耗时读数**：`RenderStats` 无 `submitMs`，3000 项提交未测 |
| G3 | §19「违规演练：越界 import、删测试、改阈值」 | `drill.mjs` 三类 = 越界 import / 文件超预算 / `as any` | **缺「删测试」「改阈值」**；且 registry 没有「每个系统至少 1 个契约测试」的存在性检查，删测试可能漏过 |
| G4 | §19「删掉 `apps/game` 后 engine 仍可独立构建与测试」 | 根 `tsc -b` 一起构建 | **无自动检查**：没有 engine 单独构建的步骤 |
| G5 | §11「HMR：调旧实例 dispose()」 | `main.ts` 的 `import.meta.hot.accept` 只重建 scheduler | **旧系统未 dispose**；`SystemDef` 无 dispose 约定 |
| G6 | §9「系统崩溃 ⇒ 该局 invalid，停止录制」 | 有熔断 + dump | **没有 invalid 标记**，录制继续、仍可能进哈希回归 |
| G7 | §12「每个系统声明 `debugView`」 | 有整页 debugDraw + 探针页 | **没有 per-system debugView** 注册与开关 |
| G8 | §22 / 文档 | `00-最终指令.md` §22 仍写 Onlook 已定；`capabilities.md` 仍写「9 个端口」「渲染表批处理 已具备」「音频占位」「回放/数据热加载待第三批」「Onlook 待用户终端」 | **规划文档与现实矛盾**，会误导后续排期；`clear/` 为未跟踪外来目录，需人裁定 |

### 1.3 有意偏离（不列为缺口）

- 测试用 `node:test`、包管理用 npm（ADR-001）；覆盖率是编译产物行号近似（ADR-013）；图集暂缓（ADR-010）；`IModHost` 按规格只有形状、无加载器；鼠标按钮→动作需要 HARD 端口变更。

## 2. 建议顺序

### P0 · 文档一致性（约 0.5 天，先做）

1. `00-最终指令.md` §22 改为「见 ADR-009：Onlook 与 Figma Dev Mode 均排除，评审用 Storybook」；
2. `capabilities.md` 校正：端口 10 个、渲染「剔除+池化（合批待做）」、音频 WebAudio、事件级回放/世界快照/输入映射/覆盖率/M2 组件补行、删掉「待第三批」的过时项；
3. `engine-diff` 与 `handoff` 指向本文件；
4. 待人裁定：`clear/ontology/` 是保留（加入 `.gitignore`）还是删除。

**验收**：`grep Onlook` 只剩 ADR/教训中的「已排除」；capabilities 无「待第三批」「9 个端口」等旧说法。

### R5 · 渲染收尾（R5a/R5b/R5c 均已实现；合批默认关闭待验证）

1. ~~**submit 计时**~~：已完成，`RenderStats.submitMs/submitAvgMs/submitP95Ms`，HUD 显示 `sub x.xxms`（ADR-014）。
2. ~~**3000 项提交基准**~~：已完成，`tools/submit-bench.mjs` 基线 0.432ms，进门禁；浏览器 `?stress=3000` 实测 avg 0.95ms / p95 1.4ms。
3. **合批验证（已完成）**：`apps/game/batch-probe.html` 对照 3000 Sprite vs 3000 Particle：中位 1.2ms → **0.2ms**（约 6 倍，ADR-015）。**实施完成（默认关闭）**：`particle-batch.ts` 按 layer+texture 分桶，`?batch=1` 开启；实测 avg 0.49ms / p95 0.80ms（未合批 1.16/1.80），batched=3001；默认关闭待混合贴图 z 序与 HMR 清理验证。
4. **验收**：3000 项 avg ≤1ms 已达成；p95 1.4ms 未达标，R5c 用原型验证合批后再判定；`submit-bench` 已进门禁。

**风险**：ParticleContainer 对旋转/逐项缩放支持有限（需验证）；分组 Graphics 在 tint 多样时退化。回退：保留现有 per-item 路径开关。

### R6 · 验收补齐（R6a/R6b 均已完成）

1. ~~**演练 3 类补齐**~~（已完成，ADR-016）：新增「删测试」与「改阈值」：
   - 删测试：临时删除一个契约测试文件 → `registry` 的「每个系统至少 1 个契约测试」检查必须失败（**先加这条检查**，否则删测试不会红）；
   - 改阈值：临时给 `tools/gate.mjs` 追加一行 → `tools/checks/gitfacts.mjs` 在未设 `ALLOW_PROTECTED` 时必须失败。
2. ~~**engine 独立构建**~~（已完成）：门禁增 `engine-standalone` 步骤（`tsc -p packages/engine/tsconfig.json --noEmit`），全量 PASS。
3. ~~**HMR dispose**~~（已完成）：`SystemDef.dispose?()` + `Scheduler.dispose()` 逆序调用、抛错不阻断；`applySystems` 替换前先 dispose；3 个单测。
4. ~~**脏局规则**~~（已完成）：`Scheduler.invalid` + `RunState`；失效后停录制、写日志/dump，`__itb.valid()` 可读。
5. **验收**：门禁步骤新增 3 条且全绿；drill 输出 5 类全拦；HMR 测试通过。

### R7 · 进行中（R7a 已完成）

- ~~per-system `debugView` 注册与开关~~（已完成，ADR-017）：`SystemDef.debugDraw` + `Scheduler.collectDebug` + `?debug=1`/F3；渲染器目前只解析 `line` 命令。
- 资产清单/图集：**暂缓**（ADR-010 门槛 >32 贴图或 >2000 Sprite 未到）。
- 鼠标按钮→动作映射：**HARD 提案待裁定**（改 `InputSnapshot.buttons` 语义，需 ADR + 端到端回放验证）。
- 覆盖率读数精确化（source map 映射）：待做，优先级低（当前近似读数已能防下降）。
- debug 命令集扩展（circle/rect/按系统配色）：待做，与探针页一起评估。

## 3. 顺序与依赖

```
P0 文档 ──> R5 渲染收尾 ──> R7 可选
        └─> R6 验收补齐（可与 R5 并行）
```

- R5 先做：它是 §7/§13 唯一未达成的引擎能力，且读数会成为后续所有视觉改动的基线；
- R6 与 R5 无写冲突（R6 动 `tools/`、`core/scheduler`、`main`），可并行推进，但提交分开、各自过门禁；
- P0 必须最先，否则 capabilities/00 会继续误导「批处理已完成」。

## 4. 验收口径（完成定义）

- R5：`__itb.render()` 含 `submitMs`；3000 项提交 p50 ≤1ms；门禁新增提交基准且 PASS；合批方案有 ADR 记录（做或不做都要有读数与理由）。
- R6：drill 覆盖 §19 三类（越界 import / 删测试 / 改阈值）+ 现有两类；`engine-standalone` 步骤 PASS；HMR dispose 测试 PASS；invalid 标记测试 PASS。
- P0：上述文档 grep 无旧说法。
