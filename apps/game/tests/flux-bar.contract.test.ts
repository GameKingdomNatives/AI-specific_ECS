import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutFluxBar } from '../src/game/flux-bar.js';
import { FLUX_CAPACITY, FLUX_REDLINE } from '../src/game/flux-model.js';

const WIDTH = 64;

test('软硬相等时两段相接、不重叠，总宽等于真实比例', () => {
  const bar = layoutFluxBar(FLUX_REDLINE / 2, FLUX_REDLINE / 2, WIDTH);
  assert.equal(bar.soft.width, WIDTH / 2);
  assert.equal(bar.hard.width, WIDTH / 2);
  assert.equal(bar.hard.x, bar.soft.x + bar.soft.width);
  assert.ok(Math.abs(bar.totalRatio - 1) < 1e-9);
});

test('只有软辐能时硬段为零，容量线固定在 100/120', () => {
  const bar = layoutFluxBar(FLUX_CAPACITY, 0, WIDTH);
  assert.equal(bar.hard.width, 0);
  assert.ok(Math.abs(bar.soft.width - WIDTH * (FLUX_CAPACITY / FLUX_REDLINE)) < 1e-9);
  assert.ok(Math.abs(bar.capacityX - WIDTH * (FLUX_CAPACITY / FLUX_REDLINE)) < 1e-9);
});

test('超过过载线时总宽封顶，不会画出框外', () => {
  const bar = layoutFluxBar(FLUX_REDLINE, FLUX_REDLINE * 2, WIDTH);
  assert.ok(bar.soft.width <= WIDTH);
  assert.ok(bar.hard.width <= WIDTH);
  assert.ok(bar.soft.width + bar.hard.width <= WIDTH + 1e-9);
  assert.equal(bar.totalRatio, 1);
});
