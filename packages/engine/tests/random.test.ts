import test from 'node:test';
import assert from 'node:assert/strict';
import { Random, stream } from '../src/core/random.js';

test('同一种子给出同一序列', () => {
  const first = new Random(12345);
  const second = new Random(12345);
  const left = [first.next(), first.next(), first.next()];
  const right = [second.next(), second.next(), second.next()];
  assert.deepEqual(left, right);
});

test('不同种子给出不同序列', () => {
  const a = new Random(1).next();
  const b = new Random(2).next();
  assert.notEqual(a, b);
});

test('fork 的序列由种子与流名决定，与已抽取次数无关', () => {
  const base = new Random(7);
  base.next();
  base.next();
  const forked = base.fork('wingman');
  const direct = stream(7, 'wingman');
  assert.equal(forked.next(), direct.next());
  assert.equal(forked.next(), direct.next());
});

test('不同流名互不污染', () => {
  const a = stream(9, 'ai').next();
  const b = stream(9, 'loot').next();
  assert.notEqual(a, b);
});

test('int 落在 [0, max) 且拒绝非法上界', () => {
  const random = new Random(3);
  for (let index = 0; index < 50; index += 1) {
    const value = random.int(6);
    assert.ok(value >= 0 && value < 6);
    assert.equal(Number.isInteger(value), true);
  }
  assert.throws(() => random.int(0), /必须为正/);
});
