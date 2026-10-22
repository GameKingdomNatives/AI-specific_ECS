import type { SystemTimingEntry } from './scheduler-timings.js';

export interface BudgetBreach {
  readonly system: string;
  readonly p95: number;
  readonly limit: number;
}

/**
 * 每系统 p95 超预算检测（§12）：返回最严重的系统，空数组/未超限返回 null。
 * 纯函数，方便主循环之外的测试与面板复用。
 */
export function findBudgetBreach(timings: readonly SystemTimingEntry[], limitMs = 2): BudgetBreach | null {
  let worst: BudgetBreach | null = null;
  for (const timing of timings) {
    if (timing.count === 0 || timing.p95 <= limitMs) continue;
    if (worst === null || timing.p95 > worst.p95) {
      worst = { system: timing.system, p95: timing.p95, limit: limitMs };
    }
  }
  return worst;
}
