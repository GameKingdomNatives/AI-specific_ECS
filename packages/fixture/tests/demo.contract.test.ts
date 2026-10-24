import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, Scheduler, World } from '@itb/engine/core';
import { Box, createMovementSystem, Position, spawnBoxes, Velocity } from '../src/index.js';

test('技术夹具：方块在边界内运动且不逃逸', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const scheduler = new Scheduler();
  scheduler.add(createMovementSystem(320, 180));
  scheduler.build();
  spawnBoxes(world, 32, 320, 180);
  assert.equal(world.aliveCount, 32);
  for (let tick = 1; tick <= 120; tick += 1) {
    scheduler.run(world, bus, commands, tick);
  }
  const entities = world.query(Position, Velocity, Box);
  assert.equal(entities.length, 32);
  for (const entity of entities) {
    const position = world.get(entity, Position);
    assert.ok(position !== undefined);
    assert.ok(position.x >= -1 && position.x <= 321, `x 越界：${position.x}`);
    assert.ok(position.y >= -1 && position.y <= 181, `y 越界：${position.y}`);
  }
});

test('事件总线：同步按发布顺序，延迟按入队顺序', () => {
  const bus = new EventBus();
  const order: string[] = [];
  bus.on('hit', (payload) => order.push(`sync:${String(payload.id)}`));
  bus.emit('hit', { id: 1 });
  bus.emit('hit', { id: 2 });
  bus.emitDeferred('hit', { id: 3 });
  bus.emitDeferred('hit', { id: 4 });
  assert.deepEqual(order, ['sync:1', 'sync:2']);
  assert.equal(bus.flushDeferred(), 2);
  assert.deepEqual(order, ['sync:1', 'sync:2', 'sync:3', 'sync:4']);
});

test('事件录制产出带序号的记录', () => {
  const bus = new EventBus();
  bus.setTick(7);
  bus.startRecording();
  bus.emit('spawn', { id: 1 });
  bus.emit('spawn', { id: 2 });
  const records = bus.stopRecording();
  assert.equal(records.length, 2);
  assert.deepEqual(
    records.map((record) => [record.seq, record.tick, record.type]),
    [
      [1, 7, 'spawn'],
      [2, 7, 'spawn'],
    ],
  );
});
