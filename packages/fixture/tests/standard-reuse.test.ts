import assert from 'node:assert/strict';
import test from 'node:test';
import { Box, Position, Velocity } from 'agent-specific_ecs/data';
import { Box as FixtureBox, Bullet, Position as FixturePosition, Velocity as FixtureVelocity } from '../src/index.js';

test('夹具转出引擎的标准组件，而不是自己再定义一份', () => {
  assert.equal(FixturePosition, Position);
  assert.equal(FixtureVelocity, Velocity);
  assert.equal(FixtureBox, Box);
});

test('Bullet 仍是夹具演示组件，不混进标准词汇表', () => {
  assert.equal(Bullet.name, 'Bullet');
  assert.notEqual(Bullet as unknown, Position as unknown);
  assert.equal(Object.hasOwn(Bullet, 'name'), true);
});
