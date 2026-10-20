import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, Scheduler, World } from '../src/core/index.js';
import { createPhysicsPort, PhysicsWorld } from '../src/impl/physics.js';
import { createPhysicsBridge } from '../src/bridge/physics.js';
import { Box, Position } from '../src/demo/index.js';

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

test('刚体位置跟随后同步', () => {
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

test('实体销毁后刚体被移除，不留悬空句柄', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const box = world.spawn();
  world.add(box, Position, { x: 50, y: 50 });
  world.add(box, Box, { size: 10, tint: 0xffffff });
  scheduler.run(world, bus, commands, 1);
  assert.equal(physics.queryCircle(50, 50, 5).length, 1);
  world.despawn(box);
  scheduler.run(world, bus, commands, 2);
  assert.equal(physics.queryCircle(50, 50, 5).length, 0);
  assert.equal(physics.stats().bodies, 0);
});

test('桥不写组件：位置仍是唯一真相', () => {
  const { world, bus, commands, scheduler } = setup();
  const box = world.spawn();
  world.add(box, Position, { x: 10, y: 20 });
  world.add(box, Box, { size: 8, tint: 0xffffff });
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(world.get(box, Position), { x: 10, y: 20 });
});
