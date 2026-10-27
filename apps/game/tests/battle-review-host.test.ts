import assert from 'node:assert/strict';
import test from 'node:test';
import { EventBus } from 'agent-specific_ecs/core';
import { attachBattleReview } from '../src/battle-review-host.js';

const PLAYER = 1;
const ENEMY = 7;

function setup(): { bus: EventBus; log: ReturnType<typeof attachBattleReview>; setTick: (tick: number) => void } {
  const bus = new EventBus();
  let tick = 0;
  const log = attachBattleReview(bus, { player: () => PLAYER, tick: () => tick });
  return { bus, log, setTick: (next: number) => { tick = next; } };
}

test('总线负载落成事件：shot 带热值与槽位，hit 记受击方与伤害', () => {
  const { bus, log, setTick } = setup();
  setTick(10);
  bus.emit('game.shot', { entity: PLAYER, slot: 0, heat: 3.6 });
  setTick(12);
  bus.emit('game.hit', { target: ENEMY, damage: 6, shielded: false, ew: false, slot: 0 });
  const [first, second] = log.events;
  assert.equal(first?.kind, 'shot');
  assert.equal(first?.tick, 10);
  assert.equal(first?.heat, 3.6);
  assert.equal(second?.kind, 'hit');
  assert.equal(second?.entity, ENEMY);
  assert.equal(second?.damage, 6);
});

test('摘要经由总线推出：输出/承受/击毁分得清', () => {
  const { bus, log, setTick } = setup();
  setTick(10);
  bus.emit('game.shot', { entity: PLAYER, slot: 0, heat: 3.6 });
  setTick(12);
  bus.emit('game.hit', { target: ENEMY, damage: 6 });
  setTick(20);
  bus.emit('game.hit', { target: PLAYER, damage: 9 });
  setTick(30);
  bus.emit('game.kill', { target: ENEMY });
  const summary = log.summary(30, 4);
  assert.equal(summary.playerShots, 1);
  assert.equal(summary.playerHits, 1);
  assert.equal(summary.damageDealt, 6);
  assert.equal(summary.damageTaken, 9);
  assert.equal(summary.kills, 1);
  assert.equal(summary.tail.length, 4);
});

test('辐能事件只收 overload，非 overload 的 flux 事件被忽略', () => {
  const { bus, log, setTick } = setup();
  setTick(40);
  bus.emit('game.flux', { entity: PLAYER, kind: 'warning' });
  setTick(50);
  bus.emit('game.flux', { entity: PLAYER, kind: 'overload' });
  setTick(80);
  bus.emit('game.vent', { entity: PLAYER });
  assert.equal(log.events.length, 2);
  const stats = log.flux(300, 100);
  assert.equal(stats.overloads, 1);
  assert.equal(stats.vents, 1);
  const firstOverload = log.events[0];
  assert.ok(firstOverload !== undefined);
  assert.equal(log.cause(firstOverload).atTick, 50);
});

test('缺字段的负载不会写进日志（不猜实体）', () => {
  const { bus, log } = setup();
  bus.emit('game.hit', { damage: 6 });
  bus.emit('game.shot', { heat: 3.6 });
  bus.emit('game.vent', {});
  assert.equal(log.events.length, 0);
});
