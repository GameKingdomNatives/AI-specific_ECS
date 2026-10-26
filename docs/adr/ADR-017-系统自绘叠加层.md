# ADR-017 系统自绘叠加层（debugView）

- 状态：已接受（R7a）
- 日期：2026-10-22
- 相关：§12 可视化与调试、`core/scheduler.ts`、`impl/pixi-renderer.ts`、`demo/index.ts`

## 背景

§12 要求「每个系统可在注册表声明 debugView：自绘叠加层（碰撞体、查询格子、AI 意图等）」。此前只有整页 `debugDraw` 通道，没有任何系统能声明自己的叠加层。

## 决策

1. `SystemDef` 增可选 `debugDraw(ctx) => readonly string[]`，命令沿用现有渲染器通道（`line x1,y1,x2,y2`）。
2. `Scheduler.collectDebug(world,bus,commands,tick)`：按调度顺序收集**启用系统**的命令；单个系统抛错只丢弃它的命令，不影响其它系统与主循环；被熔断的系统跳过。
3. `apps/game/src/debug-view.ts`：`?debug=1` 初始开启、`F3` 切换；主循环在 submit 后把收集到的命令交给 `renderer.debugDraw`，关闭时传空数组。
4. 夹具示例：`demo.weapon` 绘制玩家十字标记（±28 世界单位）。早先尝试画「玩家→指针」方向线，但玩家系统会追到指针上，线退化为零长，故改为固定尺寸标记。
5. `__itb.debugLines()` 暴露当前命令，便于自动化断言；调试绘制不参与逻辑 tick 与录制。

## 后果

- 正面：系统可以自带可视化；探针页与调试开关复用同一通道；禁用系统不会因调试再触发错误。
- 限制：渲染器只解析 `line` 命令（圆/矩形等需扩展命令集）；没有按系统配色，多个系统叠加时靠顺序区分。
- 测试：`scheduler.test.ts` 覆盖「只收集启用系统 + 单个抛错隔离」。

## 验收

- 单测通过；`?debug=1` 浏览器可见玩家红色十字（截图 `artifacts/panel/debug-crosshair.png`）；`__itb.debugLines()` 返回两条 `line` 命令。
