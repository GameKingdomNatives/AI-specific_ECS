import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, Scheduler, World } from '@itb/engine/core';
import { createPhysicsPort, PhysicsWorld } from '@itb/engine/physics';
import { createPhysicsBridge } from '@itb/engine/bridge';
import {
  Bullet,
  Box,
  createHitSystem,
  Position,
} from '../src/index.js';

function setup(): {
  world: World;
  bus: EventBus;
  commands: CommandBuffer;
  physics: ReturnType<typeof createPhysicsPort>;
  scheduler: Scheduler;
} {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const physics = createPhysicsPort(new PhysicsWorld());
  const scheduler = new Scheduler();
  scheduler.add(createPhysicsBridge(physics, { position: Position, box: Box }));
  return { world, bus, commands, physics, scheduler };
}

test('刚体位置跟随后同步，实体位置仍是唯一真相', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const box = world.spawn();
  world.add(box, Position, { x: 100, y: 100 });
  world.add(box, Box, { size: 20, tint: 0xffffff });
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(physics.queryCircle(100, 100, 5), [box]);
  world.set(box, Position, { x: 400, y: 400 });
  scheduler.run(world, bus, commands, 2);
  assert.deepEqual(physics.queryCircle(100, 100, 5), []);
  assert.deepEqual(physics.queryCircle(400, 400, 5), [box]);
});

test('子弹命中方块：两者销毁并发出事件', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const player = world.spawn();
  world.add(player, Position, { x: 0, y: 0 });
  world.add(player, Box, { size: 22, tint: 0xffffff });
  const box = world.spawn();
  world.add(box, Position, { x: 100, y: 100 });
  world.add(box, Box, { size: 20, tint: 0xffffff });
  const bullet = world.spawn();
  world.add(bullet, Position, { x: 100, y: 100 });
  world.add(bullet, Bullet, { damage: 1 });
  scheduler.add(createHitSystem(physics, { player }));
  scheduler.build();
  const events: string[] = [];
  bus.on('demo.hit', (payload) => events.push(String(payload.target)));
  scheduler.run(world, bus, commands, 1);
  assert.equal(world.isAlive(bullet), false);
  assert.equal(world.isAlive(box), false);
  assert.deepEqual(events, [String(box)]);
});

test('未命中的子弹不影响任何实体', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const player = world.spawn();
  world.add(player, Position, { x: 0, y: 0 });
  world.add(player, Box, { size: 22, tint: 0xffffff });
  const box = world.spawn();
  world.add(box, Position, { x: 500, y: 500 });
  world.add(box, Box, { size: 20, tint: 0xffffff });
  const bullet = world.spawn();
  world.add(bullet, Position, { x: 100, y: 100 });
  world.add(bullet, Bullet, { damage: 1 });
  const hit = createHitSystem(physics, { player });
  scheduler.add(hit);
  scheduler.build();
  const events: string[] = [];
  bus.on('demo.hit', (payload) => events.push(String(payload.target)));
  scheduler.run(world, bus, commands, 1);
  assert.equal(world.isAlive(bullet), true);
  assert.equal(world.isAlive(box), true);
  assert.deepEqual(events, []);
});
