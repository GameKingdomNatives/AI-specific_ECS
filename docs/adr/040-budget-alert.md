# ADR-040 每系统超预算告警（§12）

- 状态：已接受
- 日期：2026-10-22
- 相关：`docs/00-最终指令.md` §12、`docs/audits/engine-spec-audit-2026-10-22.md` P1-11

## 背景

调度器已有每系统 `last/avg/p95` 环形统计，但没有「超预算即告警」；长时间慢系统只能靠人看 HUD。

## 决策

1. 引擎新增纯函数 `findBudgetBreach(timings, limitMs=2)`（`core/perf-budget.ts`）：
   - 只看 `p95`，忽略 `count=0`；
   - 返回最严重的系统 + 阈值，空/未超限返回 null。
2. 主循环在 `updateHud` 每 60 tick 检查一次：
   - 命中 → `logger.warn('system over budget', {...})`；
   - 写入 `dumpSink` 并 persist（HUD `err` 计数可见）。
3. `?budget=<ms>` 可覆盖阈值，仅用于开发验证；默认 2ms/系统。
4. 单测 3 组（空/最严重/冷统计）。

## 验收

- `node --test tests/perf-budget.test.ts` 通过。
- 浏览器 `?budget=0.001`：60 tick 后 HUD `err`/诊断计数增长、console 有 `system over budget`；无参数时正常阈值不误报（本地 64 箱场景系统 p95 远低于 2ms）。
- 全量门禁 PASS。

## 边界

- 阈值是「每系统 p95」而非总帧预算；总帧预算仍看 bench/HUD sub。
- 每 60 tick 最多一条告警，持续慢会持续写 dump；后续可加去重窗口/告警上限。
