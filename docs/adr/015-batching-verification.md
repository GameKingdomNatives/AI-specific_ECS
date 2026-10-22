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

## 决定

1. **值得做**：在 `impl` 内为「带贴图的视图」增加 ParticleContainer 路径，按 `(layer, texture)` 分组；几何图元（Graphics）保持原路径。端口与 `RenderItem` 不变。
2. **先做可开关原型**：`?batch=1` 启用，默认仍走现有 Sprite 路径；用 `?stress=3000` 对比 submit avg/p95 与截图，确认无视觉回归后再决定默认值。
3. **验收**：3000 项 batch 开启时 submit avg < 0.9ms 且 p95 < 1.4ms（相对 ADR-014 基线）；截图逐项无错位/丢纹理；关闭开关行为与现在完全一致。
4. **风险**：多纹理是否退化为多批次、ParticleContainer 的排序/层级语义、池化与 HMR 清理；任一项不满足即回退到 Sprite 路径并记录。

## 后果

- 正面：合批从「凭感觉」变成有对照读数；实现失败也有明确回退路径。
- 代价：视图层多一条路径，测试与清理成本上升；探针页需随 Pixi 升级复核。
