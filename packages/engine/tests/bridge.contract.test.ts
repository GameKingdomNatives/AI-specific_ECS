import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, EventBus, Scheduler, World } from '../src/core/index.js';
import { createPhysicsPort, PhysicsWorld } from '../src/impl/physics.js';
import { createPhysicsBridge } from '../src/bridge/physics.js';

/** 桥只要求「两个组件」这个形状，不依赖夹具——用自定义组件验证。 */
const Position = defineComponent('BridgeProbePosition', { x: 'f64', y: 'f64' });
const Box = defineComponent('BridgeProbeBox', { size: 'f32' });

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

test('自定义组件也能同步刚体（桥不依赖夹具）', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const entity = world.spawn();
  world.add(entity, Position, { x: 100, y: 100 });
  world.add(entity, Box, { size: 20 });
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(physics.queryCircle(100, 100, 5), [entity]);
  world.set(entity, Position, { x: 400, y: 400 });
  scheduler.run(world, bus, commands, 2);
  assert.deepEqual(physics.queryCircle(100, 100, 5), []);
  assert.deepEqual(physics.queryCircle(400, 400, 5), [entity]);
});

test('实体销毁后刚体被移除，不留悬空句柄', () => {
  const { world, bus, commands, physics, scheduler } = setup();
  const entity = world.spawn();
  world.add(entity, Position, { x: 50, y: 50 });
  world.add(entity, Box, { size: 10 });
  scheduler.run(world, bus, commands, 1);
  assert.equal(physics.queryCircle(50, 50, 5).length, 1);
  world.despawn(entity);
  scheduler.run(world, bus, commands, 2);
  assert.equal(physics.queryCircle(50, 50, 5).length, 0);
  assert.equal(physics.stats().bodies, 0);
});

test('桥不写组件：位置仍是唯一真相', () => {
  const { world, bus, commands, scheduler } = setup();
  const entity = world.spawn();
  world.add(entity, Position, { x: 10, y: 20 });
  world.add(entity, Box, { size: 8 });
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(world.get(entity, Position), { x: 10, y: 20 });
});
