# ADR-019 B2 表现：相机抖动与渲染插值

- 状态：已接受（B2 部分；文本渲染见 ADR-020）
- 日期：2026-10-22
- 相关：§7 相机抖动、§9 渲染插值

## 背景

规格要求相机支持抖动（§7），固定步长逻辑要配合渲染插值（§9）。此前相机只有 `setCamera(x,y,zoom)`，渲染直接使用当前 tick 的位置。

## 决策

1. **相机抖动（PG-05）**：
   - 纯函数 `impl/camera-shake.ts::shakeOffset(elapsedMs, durationMs, amplitude)`：随时间线性衰减的双正弦，返回屏幕像素偏移。
   - `createCamera` 保存 `{amplitude, duration, startedAt}`，每次 `apply()` 把偏移叠加到各层位置；`PixiRenderer.shake(amp, ms)` 暴露（**不改端口**），幅度夹在 0–64px、时长 0–2000ms。
   - 应用在 `demo.hit` 事件上触发 `shake(10, 180)`；另暴露 `__itb.shake(amp, ms)` 方便验收。
   - 抖动只影响渲染，不写世界、不进哈希、不参与录制。
2. **渲染插值（PG-06）**：
   - 纯函数 `core/interpolate.ts`：`clamp01 / lerp / interpolatePoint`，无上一帧（新实体）直接用当前值。
   - `FixedClock.alpha` = 累计零头 / 步长（暂停为 0）。
   - 应用每帧在推进逻辑前用 `capturePoses(world)` 采集渲染起点，`renderTable(alpha, previous)` 对位置插值；逻辑与哈希不变。

## 验收

- 单测：抖动零值/衰减/上限；插值端点、无 prev、alpha 夹取；`FixedClock.alpha`。
- 浏览器（`?capture=1`）：`__itb.shake(30,800)` 后逐帧采样层位置——x 依次 9.21 → 28.29 → 20.88 → -6.74 → -26.65 …，y 同步变化并衰减；HUD 显示 `a 0.30/0.32` 逐帧变化，说明插值路径生效。
- 相机抖动在命中事件上触发（`demo.hit` → shake），不影响击杀计数与哈希。

## 后果

- 正面：表现层有打击反馈与平滑渲染；两者都不污染确定性。
- 代价：插值每帧多一次位置采集（当前规模 <0.1ms）；抖动频率为固定双正弦，不做随机化。
- 回退：不调用 `shake` 即无抖动；`renderTable` 传 `alpha=1` 即回到旧行为。

## 待续

PG-04 文本渲染需要给 `RenderItem` 增 `text/font/size`（HARD），单独 ADR-020 并更新 `tools/port-contract.json`。
