import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, Scheduler, World } from '../src/core/index.js';
import type { InputSnapshot } from '../src/ports/index.js';
import {
  Bullet,
  createBulletCleanupSystem,
  createBulletMovementSystem,
  createWeaponSystem,
  Position,
  Velocity,
} from '../src/demo/index.js';

function input(firing: boolean): InputSnapshot {
  return {
    tick: 0,
    keys: new Set<string>(),
    buttons: new Set<number>(firing ? [0] : []),
    pointer: { x: 100, y: 0 },
  };
}

function fireTicks(ticks: number, firing: boolean): number {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const player = world.spawn();
  world.add(player, Position, { x: 0, y: 0 });
  let current = input(firing);
  const scheduler = new Scheduler();
  scheduler.add(createWeaponSystem({ player, getInput: () => current, cooldownTicks: 6 }));
  scheduler.build();
  for (let tick = 1; tick <= ticks; tick += 1) {
    current = input(firing);
    scheduler.run(world, bus, commands, tick);
  }
  return world.query(Position, Bullet).length;
}

test('按住左键按冷却连射', () => {
  assert.equal(fireTicks(12, true), 2);
});

test('松开左键不产生子弹', () => {
  assert.equal(fireTicks(12, false), 0);
});

test('子弹带速度并朝指针方向', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const player = world.spawn();
  world.add(player, Position, { x: 0, y: 0 });
  const scheduler = new Scheduler();
  scheduler.add(createWeaponSystem({ player, getInput: () => input(true), speed: 10 }));
  scheduler.build();
  scheduler.run(world, bus, commands, 1);
  const bullets = world.query(Position, Velocity, Bullet);
  assert.equal(bullets.length, 1);
  const velocity = world.get(bullets[0] as number, Velocity);
  assert.ok(velocity !== undefined && velocity.x > 9.9);
});

test('子弹直线飞行并在出界时回收（不反弹）', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const near = world.spawn();
  world.add(near, Position, { x: 1900, y: 500 });
  world.add(near, Velocity, { x: 14, y: 0 });
  world.add(near, Bullet, { damage: 1 });
  const scheduler = new Scheduler();
  scheduler.add(createBulletMovementSystem(1920, 1080));
  scheduler.build();
  for (let tick = 1; tick <= 4; tick += 1) {
    scheduler.run(world, bus, commands, tick);
  }
  assert.equal(world.query(Position, Bullet).length, 0, '出界子弹应被回收而不是反弹');
});

test('飞出边界的子弹被回收', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const stray = world.spawn();
  world.add(stray, Position, { x: 5000, y: 0 });
  world.add(stray, Bullet, { damage: 1 });
  const scheduler = new Scheduler();
  scheduler.add(createBulletCleanupSystem(1920, 1080));
  scheduler.build();
  scheduler.run(world, bus, commands, 1);
  assert.equal(world.query(Position, Bullet).length, 0);
});
