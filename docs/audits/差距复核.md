# 差距复核（以 git 现实为准）

- 日期：2026-10-22
- 基线：HEAD `592162c`，工作区干净（除 DSH 工作目录 `clear/`，已忽略）
- 对照：`docs/00-最终指令.md` §4–§22

## 0. 事实基线（git/门禁读取）

| 项 | 数值 |
|---|---|
| 提交数 | 70 |
| 受版本管理文件 | 257 |
| 引擎源码 | 41 文件 |
| 引擎测试 | 24 文件（全部通过） |
| 应用代码 | 28 文件 |
| 工具链 | 29 文件 |
| 文档 | 38 文件 |
| 门禁步骤 | 41（全量 PASS） |
| 引擎源码覆盖率 | 82.5%（2054/2489 行，近似口径 ADR-013） |
| 逻辑帧（3000 实体） | 0.73ms（预算 4ms） |
| 提交耗时（3000 项） | 合批 avg 0.49ms / p95 0.80ms（预算 1ms，ADR-014/015） |

## 1. 上一轮差距的关闭情况

| 编号 | 差距 | 现状 | 证据 |
|---|---|---|---|
| G1 | §7 没有合批 | **已关闭**：ParticleContainer 按 layer+texture 分桶，默认开启，`?batch=0` 回退 | ADR-015；真实场景验收；`batched` 读数 |
| G2 | §13 没有提交耗时 | **已关闭**：`submitMs/avg/p95` + `submit-bench` 进门禁 | ADR-014；41 步 |
| G3 | §19 演练只覆盖 1/3 | **已关闭**：5 类演练（越界/超预算/as any/删测试/改阈值） | ADR-016；drill 5/5 |
| G4 | engine 独立构建无检查 | **已关闭**：`engine-standalone` 步骤 | 门禁 PASS |
| G5 | HMR 旧系统未 dispose | **已关闭**：`SystemDef.dispose?()` + `Scheduler.dispose()` 逆序 | ADR-016；3 单测 |
| G6 | 脏局无 invalid | **部分关闭**：`Scheduler.invalid` + `RunState`，失效停录制 | 单测 + `__itb.valid` |
| G7 | 无 per-system debugView | **已关闭（最小实现）**：`debugDraw` + `collectDebug` + `?debug=1`/F3 | ADR-017；截图 |
| G8 | 文档漂移（§22 Onlook 等） | **已关闭**：§22 指向 ADR-009；capabilities 校正 | P0 提交 |

## 2. 仍然存在的差距

### P1 · 规格有明确条目、尚未落地

| # | 规格 | 差距 | 影响 | 建议动作 |
|---|---|---|---|---|
| N1 | §7「文本：Pixi 内 Canvas 纹理缓存」 | 渲染表没有文本字段，engine 无文本渲染；HUD 走 DOM | 游戏内伤害数字/弹幕文字无法用引擎画 | 增 `RenderItem.text`（端口 HARD）+ 位图/Canvas 纹理缓存；先出 ADR |
| N2 | §7「相机：抖动与缩放」 | 只有 `setCamera(x,y,zoom)`，无 shake | 打击感表现缺一块 | 加 `camera.shake(amp, ms)`（端口 SOFT）并补测试 |
| N3 | §8「接触对与射线命中以事件形式回灌」 | `contacts()` 可查，但物理不通过总线发事件；命中由 `demo.hit` 主动查询 | 规格的事件化输出未成立 | 物理桥增 `contactsChanged` 冷事件或系统查询策略的 ADR（避免热路径事件） |
| N4 | §11「组件 schema 变更 → 明确降级整页重载并打印原因」 | HMR 只重建系统，未检测 schema 变更 | 改组件定义可能静默错位 | 注册表加 schema 指纹比对；不一致时 `location.reload()` + 原因 |
| N5 | §9「崩溃局不进入哈希回归」 | 标记了 invalid 并停录制，但录制文件没有 invalid 字段，回放器无法拒收 | 脏局录制仍可被手动回放/混入回归 | `Recording` 增 `invalid`（可选）+ replay 拒绝/告警 |
| N6 | §7 图集 | 暂缓（ADR-010 门槛：>32 贴图或 >2000 Sprite 未到；当前 3 张） | 合批之后的下一层优化 | 保持门槛，资产增长后触发 |
| N7 | §13 GPU 侧耗时 | 只有 JS 提交耗时；无 GPU/绘制调用读数 | 无法定位 GPU 瓶颈 | 浏览器侧 `renderer.render` 后延、或 WebGL timer query 探针（仅记录，不进硬门禁） |

### P2 · 质量与工具债

| # | 项 | 现状 | 建议 |
|---|---|---|---|
| N8 | 覆盖率读数近似 | dist 行号映射回 src，ADR-013 已声明 | source map 映射（低优先） |
| N9 | debug 命令集 | 只有 `line`；无按系统配色/圆/矩形 | 扩命令集 + 系统配色，配合探针页 |
| N10 | 探针页与 debugView 联调 | `?probe=` 与 `?debug=1` 可组合，但未做端到端验收 | 补一次探针页验收 |
| N11 | 鼠标按钮→动作映射 | 仍是原始 `buttons`，R7 待办 | HARD 提案：`InputSnapshot` 语义变更 + 回放验证 |
| N12 | 资产清单 | 贴图按需加载，无 manifest/atlas 清单 | 与 N6 一起做 |

### P3 · 已接受偏离（不算缺口，保持记录）

- 测试 `node:test` 替代 vitest、npm 替代 pnpm（ADR-001）；
- `IModHost` 只有端口形状、无加载器（规格即如此）；
- Onlook / Figma Dev Mode 排除（ADR-009）；
- 音频为临时 CC0 资源（正式版替换）。

## 3. 建议的下一步顺序

1. **N2 相机抖动**（小、闭环快）：`setCamera` 旁加 shake，补单测与浏览器验证。
2. **N1 文本渲染**（端口 HARD，需 ADR）：先定 `RenderItem.text/font/size` 契约，再做 Canvas 纹理缓存。
3. **N5 invalid 入录制**（小）：录制格式加可选字段，replay 遇 invalid 直接拒绝并说明。
4. **N4 schema 指纹**（中）：注册表启动时记录组件定义指纹，HMR 不匹配即整页重载。
5. **N3 物理事件化**（设计取舍）：先写 ADR 决定「冷事件回灌」还是「系统查询」，不直接改热路径。
6. N6/N7/N8/N9/N10/N11/N12 按资产与团队节奏排。

## 4. 结论

与规划相比，**引擎主干能力已齐**：ECS、事件、端口、渲染（含合批/剔除/计时）、物理查询、数据层、确定性、热重载与隔离、门禁与演练。剩余差距集中在**表现层细节（文本/抖动）**、**规格的事件化/降级语义（接触事件、schema 降级、invalid 入档）**与**工具精度（GPU、覆盖率、debug 命令集）**，没有结构性缺口。
