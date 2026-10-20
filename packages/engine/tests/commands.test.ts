import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, World } from '../src/core/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Bullet = defineComponent('Bullet', { damage: 'f32' });

test('命令按登记顺序执行', () => {
  const world = new World();
  const buffer = new CommandBuffer();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  buffer.set(entity, Position, { x: 10 });
  buffer.set(entity, Position, { x: 20 });
  buffer.set(entity, Position, { x: 30 });
  assert.equal(buffer.size, 3);
  assert.equal(buffer.flush(world), 3);
  assert.deepEqual(world.get(entity, Position), { x: 30, y: 0 });
  assert.equal(buffer.size, 0);
});

test('spawn 命令携带完整组件负载', () => {
  const world = new World();
  const buffer = new CommandBuffer();
  buffer.spawn([
    [Position, { x: 4, y: 5 }],
    [Bullet, { damage: 3 }],
  ]);
  assert.equal(world.aliveCount, 0);
  buffer.flush(world);
  assert.equal(world.aliveCount, 1);
  const entities = world.query(Position, Bullet);
  assert.equal(entities.length, 1);
  const entity = entities[0] as number;
  assert.deepEqual(world.get(entity, Position), { x: 4, y: 5 });
  assert.deepEqual(world.get(entity, Bullet), { damage: 3 });
});

test('despawn 命令关闭实体并释放句柄', () => {
  const world = new World();
  const buffer = new CommandBuffer();
  const entity = world.spawn();
  buffer.despawn(entity);
  buffer.flush(world);
  assert.equal(world.isAlive(entity), false);
  assert.equal(world.aliveCount, 0);
});

test('空缓冲 flush 返回 0 且不产生副作用', () => {
  const world = new World();
  const buffer = new CommandBuffer();
  assert.equal(buffer.flush(world), 0);
  assert.equal(world.aliveCount, 0);
});
