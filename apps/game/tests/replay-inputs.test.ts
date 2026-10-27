import assert from 'node:assert/strict';
import test from 'node:test';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { createReplayInputs } from '../src/game/replay-inputs.js';

function snap(tick: number, keys: readonly string[] = [], buttons: readonly number[] = [], x = 0, y = 0): InputSnapshot {
  return { tick, keys: new Set(keys), buttons: new Set(buttons), pointer: { x, y } };
}

test('按 tick 记录操作：按键、按钮、指针都留在当时那一刻', () => {
  const inputs = createReplayInputs(16);
  inputs.record(4, snap(4, ['KeyW', 'KeyA'], [0], 640, 360));
  const entry = inputs.at(4);
  assert.ok(entry !== null);
  assert.deepEqual([...entry.keys], ['KeyA', 'KeyW']);
  assert.deepEqual([...entry.buttons], [0]);
  assert.equal(entry.x, 640);
  assert.equal(entry.y, 360);
});

test('按键与按钮排好序，便于文本对比', () => {
  const inputs = createReplayInputs(4);
  inputs.record(1, snap(1, ['KeyD', 'KeyA', 'Space'], [2, 0]));
  const entry = inputs.at(1);
  assert.ok(entry !== null);
  assert.deepEqual([...entry.keys], ['KeyA', 'KeyD', 'Space']);
  assert.deepEqual([...entry.buttons], [0, 2]);
});

test('atOrBefore 取不晚于目标 tick 的最近一条；早于起点返回 null', () => {
  const inputs = createReplayInputs(8);
  inputs.record(10, snap(10));
  inputs.record(20, snap(20));
  assert.equal(inputs.at(15), null);
  assert.equal(inputs.atOrBefore(15)?.tick, 10);
  assert.equal(inputs.atOrBefore(20)?.tick, 20);
  assert.equal(inputs.atOrBefore(9), null);
});

test('容量到顶后丢最旧的，但最新一条仍可取', () => {
  const inputs = createReplayInputs(3);
  for (let tick = 1; tick <= 6; tick += 1) inputs.record(tick, snap(tick));
  assert.equal(inputs.count, 3);
  assert.equal(inputs.at(1), null);
  assert.equal(inputs.at(6)?.tick, 6);
  assert.equal(inputs.atOrBefore(2), null);
  assert.equal(inputs.atOrBefore(5)?.tick, 5);
  assert.equal(inputs.atOrBefore(4)?.tick, 4);
});

test('clear 之后回到空状态', () => {
  const inputs = createReplayInputs(4);
  inputs.record(1, snap(1));
  inputs.clear();
  assert.equal(inputs.count, 0);
  assert.equal(inputs.at(1), null);
});
