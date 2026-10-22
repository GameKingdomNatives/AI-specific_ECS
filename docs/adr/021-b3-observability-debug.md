# ADR-021 B3 观测与调试（逐系统计时 / debug 命令集）

- 状态：已接受
- 日期：2026-10-22
- 相关：§12 可视化与调试、parity PG-07/PG-08

## 背景

§12 要求「每系统 tick 计时（环形缓冲）」与「系统可声明 debugView」。此前只有渲染 submit 的耗时统计，调度器不记录系统耗时；debug 通道只解析 `line`，没有颜色与形状。

## 决策

1. **逐系统计时（PG-07）**
   - `core/system-stats.ts`：纯环形窗口（last/avg/p95/count），单测覆盖空值、环绕、非法样本。
   - `core/scheduler-timings.ts::TimingBook`：按系统名维护统计，`report(names)` 决定顺序；`SchedulerOptions.timingCapacity` 默认 60。
   - 调度器在每次 `update` 前后用 `performance.now()` 记录（含抛错的一次，便于定位异常耗时）；`Scheduler.systemTimings()` 暴露，`__itb.timings()` 可读。
   - 计时是观测，不参与逻辑与哈希；每 tick 每系统两次 `performance.now()`，成本可忽略。
2. **debug 命令集（PG-08）**
   - `impl/debug-commands.ts` 纯解析：`line x1,y1,x2,y2 [#rrggbb]`、`circle x,y,r [#rrggbb]`、`rect x,y,w,h [#rrggbb]`；非法命令/颜色回退默认红。
   - 渲染器 `createDebugDraw` 消费解析结果，按命令颜色逐条 stroke；circle/rect 为轮廓。
   - 夹具示例：`demo.weapon` 的 debugDraw 改为「玩家圆环 + 双色十字线」；`?debug=1` 或 F3 开关。

## 验收

- 单测：system-stats 3 例、debug-commands 3 例（含非法参数与颜色回退）、scheduler `systemTimings` 顺序与计数。
- 浏览器：`__itb.timings()` 返回 7 个系统、count=60，`physics.bodySync` avg≈0.16ms；`__itb.debugLines()` 返回 `circle ... #ff5a3c` 与两条 `#ffaa66` 十字线；截图中玩家位置可见红色圆环与中心标记。
- 全量门禁 PASS（41 步）；调试开销仅在开关打开时（collectDebug 不被调用则不产生命令）。

## 后果

- 正面：定位慢系统有读数；调试叠加层支持颜色与圆形/矩形，接近 §12 的「碰撞体、格子、意图」表达力。
- 代价：调试绘制每帧重建 Graphics（当前命令量很小）；系统耗时统计每系统占 60 个 f64。
- 回退：关闭 `?debug` 即无绘制；`systemTimings` 不读取则只有记录成本（每 tick 2 次 now）。
