import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameStats } from '../src/impl/frame-stats.js';

test('空统计给出零值', () => {
  const stats = createFrameStats(4);
  assert.deepEqual(stats.get(), { last: 0, avg: 0, p95: 0, count: 0 });
});

test('last/avg/p95 按样本计算', () => {
  const stats = createFrameStats(10);
  for (const value of [1, 2, 3, 4]) {
    stats.push(value);
  }
  const timing = stats.get();
  assert.equal(timing.last, 4);
  assert.equal(timing.avg, 2.5);
  assert.equal(timing.count, 4);
  assert.equal(timing.p95, 4);
});

test('超出容量后只保留最近 N 个并环绕', () => {
  const stats = createFrameStats(3);
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
  const stats = createFrameStats(4);
  stats.push(Number.NaN);
  stats.push(-1);
  stats.push(2);
  assert.equal(stats.get().count, 1);
  assert.equal(stats.get().last, 2);
});
