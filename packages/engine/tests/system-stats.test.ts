import test from 'node:test';
import assert from 'node:assert/strict';
import { createSystemStats } from '../src/core/system-stats.js';

test('空统计为零', () => {
  assert.deepEqual(createSystemStats(4).get(), { last: 0, avg: 0, p95: 0, count: 0 });
});

test('统计最近 N 次并环绕', () => {
  const stats = createSystemStats(3);
  for (const value of [1, 2, 3, 10]) {
    stats.push(value);
  }
  const timing = stats.get();
  assert.equal(timing.count, 3);
  assert.equal(timing.last, 10);
  assert.equal(timing.avg, 5);
  assert.equal(timing.p95, 10);
});

test('非法样本被忽略', () => {
  const stats = createSystemStats(2);
  stats.push(Number.NaN);
  stats.push(-2);
  stats.push(4);
  assert.equal(stats.get().count, 1);
  assert.equal(stats.get().last, 4);
});
