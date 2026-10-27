/**
 * 回放里的「操作流」：逐 tick 记下玩家按了什么、鼠标在哪。
 *
 * 帧流说明画面上是什么，操作流说明玩家做了什么——两者按 tick 对齐，
 * 复盘时拖到某一刻就能同时看到「他在哪、朝哪、按着哪个键」。
 * 只保留可读的少量字段（按键名、按钮号、指针坐标），不持有 Set 引用。
 */

import type { InputSnapshot } from 'agent-specific_ecs/ports';

export interface ReplayInput {
  readonly tick: number;
  /** 当时按下的按键名（已排序，便于文本对比）。 */
  readonly keys: readonly string[];
  /** 当时按下的鼠标按钮号（已排序）。 */
  readonly buttons: readonly number[];
  /** 世界坐标下的指针位置。 */
  readonly x: number;
  readonly y: number;
}

export interface ReplayInputs {
  readonly count: number;
  /** 单局可留的操作条数（与帧上限同口径）。 */
  readonly capacity: number;
  record(tick: number, input: InputSnapshot): void;
  /** 精确某个 tick 的操作；没有则 null。 */
  at(tick: number): ReplayInput | null;
  /** 不晚于该 tick 的最近一条操作；早于记录起点返回 null。 */
  atOrBefore(tick: number): ReplayInput | null;
  clear(): void;
}

function toEntry(tick: number, input: InputSnapshot): ReplayInput {
  return {
    tick,
    keys: [...input.keys].sort(),
    buttons: [...input.buttons].sort((left, right) => left - right),
    x: input.pointer.x,
    y: input.pointer.y,
  };
}

function findExact(ticks: readonly number[], from: number, tick: number): number {
  let low = from;
  let high = ticks.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const value = ticks[middle] ?? 0;
    if (value < tick) low = middle + 1;
    else if (value > tick) high = middle - 1;
    else return middle;
  }
  return -1;
}

function findBefore(ticks: readonly number[], from: number, tick: number): number {
  let low = from;
  let high = ticks.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((ticks[middle] ?? 0) <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

export function createReplayInputs(capacity: number): ReplayInputs {
  const limit = Math.max(1, Math.floor(capacity));
  const entries: ReplayInput[] = [];
  const ticks: number[] = [];
  // 用 head 游标做环形窗口：满了只前移，不搬数组。
  let head = 0;
  return {
    get count(): number {
      return entries.length - head;
    },
    capacity: limit,
    record(tick: number, input: InputSnapshot): void {
      entries.push(toEntry(tick, input));
      ticks.push(tick);
      if (entries.length - head > limit) head += 1;
    },
    at(tick: number): ReplayInput | null {
      const index = findExact(ticks, head, tick);
      return index < 0 ? null : (entries[index] ?? null);
    },
    atOrBefore(tick: number): ReplayInput | null {
      const index = findBefore(ticks, head, tick);
      return index < 0 ? null : (entries[index] ?? null);
    },
    clear(): void {
      entries.length = 0;
      ticks.length = 0;
      head = 0;
    },
  };
}
