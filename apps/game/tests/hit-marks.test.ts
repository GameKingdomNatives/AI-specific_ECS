import assert from 'node:assert/strict';
import test from 'node:test';
import { createHitMarks } from '../src/hit-marks.js';

test('命中事件被记录并带出槽位', () => {
  const marks = createHitMarks();
  const slot = marks.handle({ x: 10, y: 20, damage: 4, slot: 1, shielded: false, ew: false }, 7);
  assert.equal(slot, 1);
  assert.equal(marks.list.length, 1);
  assert.deepEqual(marks.list[0], { x: 10, y: 20, damage: 4, slot: 1, shielded: false, ew: false, tick: 7 });
});

test('形状不合法的命中被丢弃', () => {
  const marks = createHitMarks();
  assert.equal(marks.handle({}, 1), null);
  assert.equal(marks.handle({ x: Number.NaN, y: 3 }, 1), null);
  assert.equal(marks.list.length, 0);
});

test('只保留最近 limit 条', () => {
  const marks = createHitMarks(3);
  for (let index = 0; index < 5; index += 1) marks.handle({ x: index, y: 0, damage: index }, index);
  assert.equal(marks.list.length, 3);
  assert.equal(marks.list[0]?.damage, 2);
  assert.equal(marks.list[2]?.damage, 4);
});
