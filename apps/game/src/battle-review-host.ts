/**
 * 总线接线：把 `game.shot / game.hit / game.kill / game.flux / game.vent` 的原始负载
 * 收成复盘事件，并对外提供摘要、辐能统计与精确时间轴。
 *
 * 只解包、不加工：负载到事件的映射集中在这里，呈现层只消费 `BattleEvent`，不必再认识总线负载。
 */

import type { IEventBusPort } from 'agent-specific_ecs/ports';
import { createBattleReview, summarize, type BattleEvent, type BattleSummary } from './game/battle-review.js';
import { createTimeline, fluxCause, fluxStats, type FluxCause, type FluxStats, type Timeline } from './game/battle-attribution.js';

type BusTap = Pick<IEventBusPort, 'on'>;

export interface BattleLogOptions {
  readonly player: () => number;
  readonly tick: () => number;
  readonly capacity?: number;
}

export interface BattleLog {
  readonly events: readonly BattleEvent[];
  summary(durationTicks: number, tailSize?: number): BattleSummary;
  /** 最近 windowTicks 内的辐能账；不传终点则用当前 tick。 */
  flux(windowTicks?: number, toTick?: number): FluxStats;
  /** 单次过载的有限归因。 */
  cause(overload: BattleEvent, windowTicks?: number): FluxCause;
  timeline(): Timeline;
}

const EVENT_TYPES = { shot: 'game.shot', hit: 'game.hit', kill: 'game.kill', flux: 'game.flux', vent: 'game.vent' } as const;

function numberAt(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === 'number' ? value : undefined;
}

function flagAt(payload: Record<string, unknown>, key: string): boolean | undefined {
  const value = payload[key];
  return typeof value === 'boolean' ? value : undefined;
}

function shotEvent(payload: Record<string, unknown>, tick: number): BattleEvent | null {
  const entity = numberAt(payload, 'entity');
  if (entity === undefined) return null;
  const slot = numberAt(payload, 'slot');
  const heat = numberAt(payload, 'heat');
  return { tick, kind: 'shot', entity, ...(slot === undefined ? {} : { slot }), ...(heat === undefined ? {} : { heat }) };
}

function hitEvent(payload: Record<string, unknown>, tick: number): BattleEvent | null {
  const target = numberAt(payload, 'target');
  if (target === undefined) return null;
  const slot = numberAt(payload, 'slot');
  const damage = numberAt(payload, 'damage');
  const shielded = flagAt(payload, 'shielded');
  const ew = flagAt(payload, 'ew');
  return {
    tick,
    kind: 'hit',
    entity: target,
    target,
    ...(slot === undefined ? {} : { slot }),
    ...(damage === undefined ? {} : { damage }),
    ...(shielded === undefined ? {} : { shielded }),
    ...(ew === undefined ? {} : { ew }),
  };
}

function killEvent(payload: Record<string, unknown>, tick: number): BattleEvent | null {
  const target = numberAt(payload, 'target');
  if (target === undefined) return null;
  return { tick, kind: 'kill', entity: target, target };
}

function fluxEvent(payload: Record<string, unknown>, tick: number): BattleEvent | null {
  if (payload['kind'] !== 'overload') return null;
  const entity = numberAt(payload, 'entity');
  if (entity === undefined) return null;
  return { tick, kind: 'overload', entity };
}

function ventEvent(payload: Record<string, unknown>, tick: number): BattleEvent | null {
  const entity = numberAt(payload, 'entity');
  if (entity === undefined) return null;
  return { tick, kind: 'vent', entity };
}

export function attachBattleReview(bus: BusTap, options: BattleLogOptions): BattleLog {
  const review = createBattleReview(options.capacity);
  function record(eventOrNull: BattleEvent | null): void {
    if (eventOrNull !== null) review.record(eventOrNull);
  }
  const at = options.tick;
  bus.on(EVENT_TYPES.shot, (payload) => record(shotEvent(payload, at())));
  bus.on(EVENT_TYPES.hit, (payload) => record(hitEvent(payload, at())));
  bus.on(EVENT_TYPES.kill, (payload) => record(killEvent(payload, at())));
  bus.on(EVENT_TYPES.flux, (payload) => record(fluxEvent(payload, at())));
  bus.on(EVENT_TYPES.vent, (payload) => record(ventEvent(payload, at())));
  return {
    get events(): readonly BattleEvent[] {
      return review.events;
    },
    summary(durationTicks: number, tailSize?: number): BattleSummary {
      return summarize(review.events, options.player(), durationTicks, tailSize);
    },
    flux(windowTicks?: number, toTick?: number): FluxStats {
      return fluxStats(review.events, options.player(), toTick ?? at(), windowTicks);
    },
    cause(overload: BattleEvent, windowTicks?: number): FluxCause {
      return fluxCause(review.events, options.player(), overload, windowTicks);
    },
    timeline(): Timeline {
      return createTimeline(review.events);
    },
  };
}
