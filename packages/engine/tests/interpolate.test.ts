import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp01, interpolatePoint, lerp } from '../src/core/interpolate.js';

test('alpha 被夹在 0..1，非法值视为 0', () => {
  assert.equal(clamp01(-1), 0);
  assert.equal(clamp01(0.5), 0.5);
  assert.equal(clamp01(2), 1);
  assert.equal(clamp01(Number.NaN), 0);
});

test('lerp 在两端与中点正确', () => {
  assert.equal(lerp(10, 20, 0), 10);
  assert.equal(lerp(10, 20, 1), 20);
  assert.equal(lerp(10, 20, 0.5), 15);
  assert.equal(lerp(10, 20, 4), 20);
});

test('没有上一帧时直接使用当前点', () => {
  assert.deepEqual(interpolatePoint(undefined, { x: 3, y: 4 }, 0.5), { x: 3, y: 4 });
});

test('有上一帧时按 alpha 插值', () => {
  assert.deepEqual(interpolatePoint({ x: 0, y: 10 }, { x: 10, y: 0 }, 0.25), { x: 2.5, y: 7.5 });
});
