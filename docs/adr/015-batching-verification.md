# ADR-015 合批验证：ParticleContainer 对照探针

- 状态：验证完成，实施待做（R5c）
- 日期：2026-10-22
- 相关：§7 批处理、ADR-014 提交计时、`apps/game/batch-probe.html`

## 背景

ADR-014 实测 3000 项提交 avg 0.95ms、p95 1.4ms：均值压线、p95 超预算。§7 又明确要求「连续同类图元塞进 Pixi 批处理」。在改视图层之前，先用独立探针回答一个问题：**Pixi 8 的 ParticleContainer 到底能省多少**。

## 探针

`apps/game/batch-probe.html`（仅开发期页面，不进构建）：

- 3000 个对象，960×540 画布，纹理 `Texture.WHITE`，每帧改位置与旋转；
- A 组：普通 `Container` + 3000 `Sprite`（锚点 0.5）；
- B 组：`ParticleContainer`（dynamicProperties: position/rotation/color）+ 3000 `Particle`（anchor 0.5）；
- 预热 20 帧、采样 90 帧，取中位数与 p95；同页先 A 后 B，同一渲染器。

## 结果（2026-10-22，Chrome/Edge 本机）

| 组 | 中位 | p95 | min | max |
|---|---|---|---|---|
| 3000 Sprite（Container） | **1.2ms** | 6.5ms | 0.5ms | 7.3ms |
| 3000 Particle（ParticleContainer） | **0.2ms** | 3.3ms | 0ms | 6.4ms |

比值 **0.167（约 6 倍）**。Particle 支持 x/y/scale/rotation/anchor/tint/alpha/texture，覆盖当前 `RenderItem` 的变换字段。

## 实施结果（2026-10-22，`?batch=1`）

- 视图层新增 `impl/particle-batch.ts`：带贴图项按 `(layer, texture)` 分桶到 `ParticleContainer`；`impl/texture-cache.ts` 抽出贴图缓存；`pixi-views.ts` 增加 `batching` 选项，几何图元保持原路径。
- `RenderStats` 增 `batching` 与 `batched`，避免「看起来像」的误判；HUD 同步。
- 浏览器实测（`?stress=3000`，3001 项全可见，窗口 1280×720 左右）：

| 模式 | avg | p95 | batched |
|---|---|---|---|
| 合批 `?batch=1` | **0.49ms** | **0.80ms** | 3001 |
| 未合批 | 1.16ms | 1.80ms | 0 |

- 视觉：两张截图（`artifacts/panel/batch-on.png` / `batch-off.png`）均为 3000 方块 + HUD，粗看无缺失/错位；由于画面在动，像素级 diff 不可用。
- 第一版实现因每帧重建字符串键 + 重复 Map 查找反而更慢（1.33ms）；改为条目缓存 texture/layer 后降到 0.49ms。

## 决定（更新）

**保留为可开关路径，默认关闭**：`?batch=1` 开启。原因：同一层内不同贴图的相对绘制顺序由容器创建顺序决定，混合贴图层的 z 序尚未用真实场景验证；HMR 下的 ParticleContainer 清理也未覆盖。等这两项验证后再决定是否默认开启。验收值（avg<0.9、p95<1.4）已达成。


## 后果

- 正面：合批从「凭感觉」变成有对照读数；实现失败也有明确回退路径。
- 代价：视图层多一条路径，测试与清理成本上升；探针页需随 Pixi 升级复核。
