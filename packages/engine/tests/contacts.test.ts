import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, World } from '../src/core/index.js';
import { createContactEvents } from '../src/bridge/contacts.js';
import { createPhysicsPort, PhysicsWorld } from '../src/impl/physics.js';

function setup() {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const physics = createPhysicsPort(new PhysicsWorld());
  return { ctx: { world, bus, commands, tick: 1 }, bus, physics };
}

test('接触进入/离开产生延迟事件，顺序稳定', () => {
  const { ctx, bus, physics } = setup();
  const system = createContactEvents(physics);
  const events: string[] = [];
  bus.on('physics.contactEnter', (payload) => events.push(`enter:${String(payload.key)}`));
  bus.on('physics.contactExit', (payload) => events.push(`exit:${String(payload.key)}`));
  physics.addCircle(1, 10, 10, 5);
  const second = physics.addCircle(2, 12, 10, 5);
  system.update(ctx);
  bus.flushDeferred();
  assert.deepEqual(events, ['enter:1:2']);
  assert.equal(system.stats().active, 1);
  system.update(ctx);
  bus.flushDeferred();
  assert.deepEqual(events, ['enter:1:2']);
  physics.setTransform(second, 100, 100);
  system.update(ctx);
  bus.flushDeferred();
  assert.deepEqual(events, ['enter:1:2', 'exit:1:2']);
  assert.equal(system.stats().active, 0);
});

test('每 tick 上限生效，溢出计数不阻塞', () => {
  const { ctx, bus, physics } = setup();
  const system = createContactEvents(physics, { maxEventsPerTick: 1 });
  let enters = 0;
  bus.on('physics.contactEnter', () => { enters += 1; });
  physics.addCircle(1, 10, 10, 5);
  physics.addCircle(2, 12, 10, 5);
  physics.addCircle(3, 14, 10, 5);
  system.update(ctx);
  bus.flushDeferred();
  assert.equal(enters, 1);
  assert.ok(system.stats().overflow >= 2);
});
