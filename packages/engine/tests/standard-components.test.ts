import assert from 'node:assert/strict';
import test from 'node:test';
import { Box, Position, Velocity } from '../src/data/components.js';
import { Box as BoxFromIndex, Position as PositionFromIndex } from '../src/data/index.js';

test('标准组件名与字段固定：Position / Velocity / Box', () => {
  assert.equal(Position.name, 'Position');
  assert.deepEqual(Position.fields, { x: 'f64', y: 'f64' });
  assert.equal(Velocity.name, 'Velocity');
  assert.deepEqual(Velocity.fields, { x: 'f64', y: 'f64' });
  assert.equal(Box.name, 'Box');
  assert.deepEqual(Box.fields, { size: 'f32', tint: 'u32' });
});

test('定义不可变：防止运行期被改字段而破坏回放', () => {
  assert.equal(Object.isFrozen(Position), true);
  assert.equal(Object.isFrozen(Velocity), true);
  assert.equal(Object.isFrozen(Box), true);
});

test('data 入口导出的是同一份对象（不是重新定义）', () => {
  assert.equal(PositionFromIndex, Position);
  assert.equal(BoxFromIndex, Box);
});
