import test from 'node:test';
import assert from 'node:assert/strict';
import { defineComponent, entityGeneration, World } from '../src/core/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Velocity = defineComponent('Velocity', { x: 'f64', y: 'f64' });
const Frozen = defineComponent('Frozen', { value: 'bool' });
const Health = defineComponent('Health', { hp: 'i32' });

test('spawn 后组件可读写', () => {
  const world = new World();
  const entity = world.spawn();
  world.add(entity, Position, { x: 1, y: 2 });
  assert.deepEqual(world.get(entity, Position), { x: 1, y: 2 });
  world.set(entity, Position, { x: 5 });
  assert.deepEqual(world.get(entity, Position), { x: 5, y: 2 });
  assert.equal(world.aliveCount, 1);
});

test('despawn 后 generation 递增，旧句柄失效', () => {
  const world = new World();
  const first = world.spawn();
  const generation = entityGeneration(first);
  assert.equal(world.despawn(first), true);
  assert.equal(world.isAlive(first), false);
  assert.equal(world.despawn(first), false);
  const second = world.spawn();
  assert.equal(entityGeneration(second), (generation + 1) % 2048);
  assert.equal(world.isAlive(first), false);
  assert.equal(world.isAlive(second), true);
});

test('query 只返回同时拥有全部组件的实体', () => {
  const world = new World();
  const both = world.spawn();
  world.add(both, Position, { x: 0, y: 0 });
  world.add(both, Velocity, { x: 1, y: 0 });
  const onlyPosition = world.spawn();
  world.add(onlyPosition, Position, { x: 9, y: 9 });
  assert.deepEqual(world.query(Position, Velocity), [both]);
  assert.equal(world.query(Position).length, 2);
  assert.equal(world.query(Velocity).length, 1);
});

test('remove 后实体退出查询，且布尔字段独立存储', () => {
  const world = new World();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  world.add(entity, Frozen, { value: true });
  assert.equal(world.get(entity, Frozen)?.value, true);
  assert.equal(world.remove(entity, Frozen), true);
  assert.equal(world.query(Position, Frozen).length, 0);
  assert.equal(world.has(entity, Position), true);
});

test('不同组件实例互不干扰，i32 与 f64 列独立', () => {
  const world = new World();
  const a = world.spawn();
  const b = world.spawn();
  world.add(a, Health, { hp: 7 });
  world.add(b, Health, { hp: 9 });
  world.add(a, Velocity, { x: 3, y: 4 });
  assert.deepEqual(world.get(a, Health), { hp: 7 });
  assert.deepEqual(world.get(b, Health), { hp: 9 });
  assert.deepEqual(world.get(b, Velocity), undefined);
});
