import test from 'node:test';
import assert from 'node:assert/strict';
import { findBudgetBreach } from '../src/core/perf-budget.js';

const timing = (system: string, p95: number, count = 60) => ({ system, last: p95, avg: p95, p95, count });

test('未超预算返回 null', () => {
  assert.equal(findBudgetBreach([timing('a', 0.5), timing('b', 1.9)], 2), null);
  assert.equal(findBudgetBreach([], 2), null);
});

test('返回最严重的超预算系统并保留阈值', () => {
  const breach = findBudgetBreach([timing('fast', 0.2), timing('slow', 5.5), timing('mid', 3)], 2);
  assert.deepEqual(breach, { system: 'slow', p95: 5.5, limit: 2 });
});

test('空统计不参与告警', () => {
  assert.equal(findBudgetBreach([timing('cold', 99, 0)], 2), null);
});
