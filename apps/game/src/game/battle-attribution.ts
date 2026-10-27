/**
 * 有限归因 + 精确时间轴：只回答「辐能为什么越线」，以及「任意 tick 上发生了什么」。
 *
 * 归因为什么是「有限」的：`game.hit` 只带受击方、不带射手，所以本模块不假装能指出是谁打的；
 * 它归因的是玩家自己的辐能账——越线前这段时间放了几发、加了多少热、沉默了多久、多久后排出。
 * 事件形状见 `./battle-review.ts`，来源见 `systems/flux.ts`（overload）与 `systems/weapon.ts`（shot.heat）。
 */

import type { BattleEvent } from './battle-review.js';

/** 默认窗口 5 秒（300 tick）：「最近一段时间」的默认口径，与 HUD 的辐能读数同屏可见。 */
export const FLUX_WINDOW = 300;

export interface FluxStats {
  readonly windowTicks: number;
  readonly fromTick: number;
  readonly toTick: number;
  /** 窗口内玩家开火次数。 */
  readonly shots: number;
  /** 窗口内玩家开火累计热值。 */
  readonly heatTotal: number;
  /** 窗口内玩家过载次数。 */
  readonly overloads: number;
  /** 窗口内玩家排散次数。 */
  readonly vents: number;
  readonly lastShotTick?: number;
  readonly lastVentTick?: number;
}

export interface FluxCause {
  readonly atTick: number;
  readonly windowTicks: number;
  readonly shots: number;
  readonly heatTotal: number;
  /** 越线前最后一次开火到越线的间隔（tick）；窗口内没有开火则 null——「空放越线」。 */
  readonly quietTicks: number | null;
  /** 越线后第一次排散相对越线的间隔（tick）；窗口内没有排散则 null。 */
  readonly ventAfter: number | null;
}

export interface TimelineSpan {
  readonly fromTick: number;
  readonly toTick: number;
}

/** 精确时间轴：按 tick 取事件，不做插值、不做采样。 */
export interface Timeline {
  readonly events: readonly BattleEvent[];
  span(): TimelineSpan | null;
  /** 该 tick 上的全部事件，保持记录顺序。 */
  at(tick: number): readonly BattleEvent[];
  /** [fromTick, toTick] 闭区间内的事件。 */
  range(fromTick: number, toTick: number): readonly BattleEvent[];
  /** 首个 tick ≥ 给定值的事件所在 tick；没有则 null——回放时用它跳到下一批事件而不空转。 */
  next(tick: number): number | null;
  /** 有事件的全部 tick（升序去重）——回放的关键帧列表。 */
  cursors(): readonly number[];
}

interface Tally {
  shots: number;
  heatTotal: number;
  overloads: number;
  vents: number;
  lastShotTick?: number;
  lastVentTick?: number;
}

function emptyTally(): Tally {
  return { shots: 0, heatTotal: 0, overloads: 0, vents: 0 };
}

function countEvent(tally: Tally, event: BattleEvent, player: number): void {
  if (event.entity !== player) return;
  if (event.kind === 'shot') {
    tally.shots += 1;
    tally.heatTotal += event.heat ?? 0;
    tally.lastShotTick = event.tick;
    return;
  }
  if (event.kind === 'overload') {
    tally.overloads += 1;
    return;
  }
  if (event.kind === 'vent') {
    tally.vents += 1;
    tally.lastVentTick = event.tick;
  }
}

export function fluxStats(events: readonly BattleEvent[], player: number, toTick: number, windowTicks = FLUX_WINDOW): FluxStats {
  const window = Math.max(0, Math.floor(windowTicks));
  const fromTick = toTick - window;
  const tally = emptyTally();
  for (const event of events) {
    if (event.tick < fromTick || event.tick > toTick) continue;
    countEvent(tally, event, player);
  }
  return {
    windowTicks: window,
    fromTick,
    toTick,
    shots: tally.shots,
    heatTotal: tally.heatTotal,
    overloads: tally.overloads,
    vents: tally.vents,
    ...(tally.lastShotTick === undefined ? {} : { lastShotTick: tally.lastShotTick }),
    ...(tally.lastVentTick === undefined ? {} : { lastVentTick: tally.lastVentTick }),
  };
}

function ventAfter(events: readonly BattleEvent[], player: number, fromTick: number, limit: number): number | null {
  for (const event of events) {
    if (event.tick <= fromTick) continue;
    if (event.tick > limit) return null;
    if (event.kind === 'vent' && event.entity === player) return event.tick - fromTick;
  }
  return null;
}

export function fluxCause(events: readonly BattleEvent[], player: number, overload: BattleEvent, windowTicks = FLUX_WINDOW): FluxCause {
  const stats = fluxStats(events, player, overload.tick, windowTicks);
  const quietTicks = stats.lastShotTick === undefined ? null : overload.tick - stats.lastShotTick;
  return {
    atTick: overload.tick,
    windowTicks: stats.windowTicks,
    shots: stats.shots,
    heatTotal: stats.heatTotal,
    quietTicks,
    ventAfter: ventAfter(events, player, overload.tick, overload.tick + stats.windowTicks),
  };
}

export function createTimeline(events: readonly BattleEvent[]): Timeline {
  return {
    events,
    span(): TimelineSpan | null {
      const first = events[0];
      const last = events[events.length - 1];
      if (first === undefined || last === undefined) return null;
      return { fromTick: first.tick, toTick: last.tick };
    },
    at(tick: number): readonly BattleEvent[] {
      return events.filter((event) => event.tick === tick);
    },
    range(fromTick: number, toTick: number): readonly BattleEvent[] {
      return events.filter((event) => event.tick >= fromTick && event.tick <= toTick);
    },
    next(tick: number): number | null {
      for (const event of events) {
        if (event.tick >= tick) return event.tick;
      }
      return null;
    },
    cursors(): readonly number[] {
      const ticks: number[] = [];
      for (const event of events) {
        if (ticks[ticks.length - 1] !== event.tick) ticks.push(event.tick);
      }
      return ticks;
    },
  };
}
