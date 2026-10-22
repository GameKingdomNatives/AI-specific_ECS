import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedClock } from '../src/core/index.js';

test('按固定步长推进，零头留到下一次', () => {
  const clock = new FixedClock(16.6667);
  assert.equal(clock.advance(10), 0);
  assert.equal(clock.advance(10), 1);
  assert.equal(clock.tick, 1);
});

test('alpha 反映累计零头，暂停时为 0', () => {
  const clock = new FixedClock(10);
  clock.advance(4);
  assert.ok(Math.abs(clock.alpha - 0.4) < 1e-9);
  clock.setPaused(true);
  assert.equal(clock.alpha, 0);
});

test('单帧步数有上限，避免死亡螺旋', () => {
  const clock = new FixedClock(10, 4);
  assert.equal(clock.advance(1000), 4);
  assert.equal(clock.advance(5), 0);
});

test('暂停时不推进，恢复后从头累积', () => {
  const clock = new FixedClock(10);
  clock.setPaused(true);
  assert.equal(clock.advance(100), 0);
  assert.equal(clock.tick, 0);
  clock.setPaused(false);
  assert.equal(clock.advance(10), 1);
});

test('变速影响累积，单步不依赖真实时间', () => {
  const clock = new FixedClock(10);
  clock.setScale(0.5);
  assert.equal(clock.advance(20), 1);
  clock.stepOnce();
  assert.equal(clock.tick, 2);
});

test('reset 回到初始状态', () => {
  const clock = new FixedClock(10);
  clock.advance(50);
  clock.setScale(2);
  clock.reset();
  assert.equal(clock.tick, 0);
  assert.equal(clock.isPaused, false);
  assert.equal(clock.advance(10), 1);
});
