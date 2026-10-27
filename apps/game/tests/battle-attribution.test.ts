import assert from 'node:assert/strict';
import test from 'node:test';
import type { BattleEvent } from '../src/game/battle-review.js';
import { createTimeline, FLUX_WINDOW, fluxCause, fluxStats } from '../src/game/battle-attribution.js';

const PLAYER = 1;
const ENEMY = 7;

function shot(tick: number, heat: number, entity = PLAYER): BattleEvent {
  return { tick, kind: 'shot', entity, slot: 0, heat };
}

function overload(tick: number, entity = PLAYER): BattleEvent {
  return { tick, kind: 'overload', entity };
}

function vent(tick: number, entity = PLAYER): BattleEvent {
  return { tick, kind: 'vent', entity };
}

test('辐能统计只数窗口内的玩家事件，热值累加', () => {
  const events = [shot(10, 3.6), shot(100, 3.6), shot(250, 9), shot(400, 3.6), shot(260, 9, ENEMY)];
  const stats = fluxStats(events, PLAYER, 300, 120);
  assert.equal(stats.fromTick, 180);
  assert.equal(stats.shots, 1);
  assert.equal(stats.heatTotal, 9);
  assert.equal(stats.lastShotTick, 250);
});

test('默认窗口是 300 tick，且过载/排散分别计数', () => {
  const events = [overload(500), vent(520), overload(540), overload(542, ENEMY)];
  const stats = fluxStats(events, PLAYER, 560);
  assert.equal(stats.windowTicks, FLUX_WINDOW);
  assert.equal(stats.overloads, 2);
  assert.equal(stats.vents, 1);
  assert.equal(stats.lastVentTick, 520);
});

test('越线归因：越线前的开火次数、累计热与沉默间隔', () => {
  const events = [shot(100, 3.6), shot(160, 9), overload(178), vent(210)];
  const cause = fluxCause(events, PLAYER, overload(178));
  assert.equal(cause.atTick, 178);
  assert.equal(cause.shots, 2);
  assert.equal(cause.heatTotal, 12.6);
  assert.equal(cause.quietTicks, 18);
  assert.equal(cause.ventAfter, 32);
});

test('空放越线：窗口内没有开火时 quietTicks 为 null，未排散时 ventAfter 为 null', () => {
  const events = [overload(900)];
  const cause = fluxCause(events, PLAYER, overload(900));
  assert.equal(cause.shots, 0);
  assert.equal(cause.quietTicks, null);
  assert.equal(cause.ventAfter, null);
});

test('时间轴：span / at / range / next / cursors 都是精确 tick', () => {
  const events = [shot(10, 3.6), shot(10, 3.6), overload(20), vent(35)];
  const timeline = createTimeline(events);
  assert.deepEqual(timeline.span(), { fromTick: 10, toTick: 35 });
  assert.equal(timeline.at(10).length, 2);
  assert.equal(timeline.at(11).length, 0);
  assert.deepEqual(timeline.range(15, 35).map((item) => item.tick), [20, 35]);
  assert.equal(timeline.next(11), 20);
  assert.equal(timeline.next(36), null);
  assert.deepEqual(timeline.cursors(), [10, 20, 35]);
});

test('空时间轴：span 为 null，next 为 null，cursors 为空', () => {
  const timeline = createTimeline([]);
  assert.equal(timeline.span(), null);
  assert.equal(timeline.next(0), null);
  assert.deepEqual(timeline.cursors(), []);
});
