import assert from 'node:assert/strict';
import test from 'node:test';
import { createBattleReview, REVIEW_CAPACITY, summarize, type BattleEvent } from '../src/game/battle-review.js';

const PLAYER = 1;
const ENEMY = 7;

function event(kind: BattleEvent['kind'], tick: number, extra: Partial<BattleEvent> = {}): BattleEvent {
  return { tick, kind, entity: PLAYER, ...extra };
}

test('空日志：全零摘要，且不给 lastHit / firstOverload', () => {
  const summary = summarize([], PLAYER, 0, 0);
  assert.equal(summary.playerShots, 0);
  assert.equal(summary.damageDealt, 0);
  assert.equal(summary.damageTaken, 0);
  assert.equal(summary.lastHit, undefined);
  assert.equal(summary.firstOverload, undefined);
  assert.deepEqual(summary.tail, []);
});

test('命中按受击方分流：打敌人计输出，被敌人打计承受', () => {
  const events = [
    event('hit', 10, { target: ENEMY, damage: 6, slot: 0 }),
    event('hit', 20, { target: ENEMY, damage: 26, slot: 1 }),
    event('hit', 30, { target: PLAYER, damage: 9, shielded: true }),
  ];
  const summary = summarize(events, PLAYER, 40);
  assert.equal(summary.playerHits, 2);
  assert.equal(summary.damageDealt, 32);
  assert.equal(summary.damageTaken, 9);
  assert.equal(summary.lastHit?.tick, 30);
  assert.equal(summary.lastHit?.shielded, true);
});

test('开火、击杀、过载、排散只统计玩家自己的', () => {
  const events = [
    event('shot', 1, { slot: 0 }),
    event('shot', 2, { entity: ENEMY, slot: 9 }),
    event('kill', 3, { target: ENEMY }),
    event('overload', 5),
    event('overload', 6, { entity: ENEMY }),
    event('vent', 7),
  ];
  const summary = summarize(events, PLAYER, 8);
  assert.equal(summary.playerShots, 1);
  assert.equal(summary.kills, 1);
  assert.equal(summary.overloads, 1);
  assert.equal(summary.vents, 1);
  assert.equal(summary.firstOverload?.tick, 5);
});

test('玩家被击杀会单独标出，且不计入击杀数', () => {
  const summary = summarize([event('kill', 9, { target: PLAYER })], PLAYER, 10);
  assert.equal(summary.playerKilled, true);
  assert.equal(summary.kills, 0);
});

test('容量上限：超出后只保留最近的记录', () => {
  const review = createBattleReview(3);
  for (let tick = 1; tick <= 5; tick += 1) review.record(event('shot', tick));
  assert.equal(review.capacity, 3);
  assert.equal(review.events.length, 3);
  assert.deepEqual(review.events.map((item) => item.tick), [3, 4, 5]);
});

test('tail 按时间升序，且长度受 tailSize 控制', () => {
  const review = createBattleReview();
  for (let tick = 1; tick <= 6; tick += 1) review.record(event('shot', tick));
  const summary = summarize(review.events, PLAYER, 6, 2);
  assert.deepEqual(summary.tail.map((item) => item.tick), [5, 6]);
  assert.equal(summarize(review.events, PLAYER, 6, 0).tail.length, 0);
  assert.equal(REVIEW_CAPACITY, 512);
});
