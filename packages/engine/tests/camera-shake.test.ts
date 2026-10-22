import test from 'node:test';
import assert from 'node:assert/strict';
import { shakeOffset } from '../src/impl/camera-shake.js';

test('抖动在时长为零或振幅为零时返回零偏移', () => {
  assert.deepEqual(shakeOffset(10, 0, 8), { x: 0, y: 0 });
  assert.deepEqual(shakeOffset(10, 200, 0), { x: 0, y: 0 });
  assert.deepEqual(shakeOffset(-1, 200, 8), { x: 0, y: 0 });
});

test('抖动随时间衰减，超过时长后归零', () => {
  const early = shakeOffset(10, 200, 8);
  const late = shakeOffset(150, 200, 8);
  const earlyLength = Math.hypot(early.x, early.y);
  const lateLength = Math.hypot(late.x, late.y);
  assert.ok(earlyLength > 0);
  assert.ok(lateLength < earlyLength);
  assert.deepEqual(shakeOffset(200, 200, 8), { x: 0, y: 0 });
  assert.deepEqual(shakeOffset(500, 200, 8), { x: 0, y: 0 });
});

test('偏移不超过振幅', () => {
  for (let elapsed = 0; elapsed < 200; elapsed += 7) {
    const offset = shakeOffset(elapsed, 200, 12);
    assert.ok(Math.abs(offset.x) <= 12);
    assert.ok(Math.abs(offset.y) <= 12);
  }
});
