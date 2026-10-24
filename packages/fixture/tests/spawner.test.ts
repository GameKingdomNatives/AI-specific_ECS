import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, World } from 'agent-specific_ecs/core';
import { Box, BoxSpawner, createBoxSpawnerSystem, Position } from '../src/index.js';

function setup() {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  return { world, ctx: { world, bus, commands, tick: 1 } };
}

test('BoxSpawner 按节点数据生成 ambient 箱子并上报数量', () => {
  const { world, ctx } = setup();
  const node = world.spawn();
  world.add(node, BoxSpawner, { count: 12, minSize: 8, maxSize: 14, speed: 1 });
  let reported = -1;
  const system = createBoxSpawnerSystem({ width: 1920, height: 1080, onSpawn: (_node, count) => { reported = count; } });
  system.update(ctx);
  ctx.commands.flush(world);
  assert.equal(world.query(Position, Box).length, 12);
  assert.equal(reported, 12);
});

test('生成只发生一次，数量被夹取', () => {
  const { world, ctx } = setup();
  const node = world.spawn();
  world.add(node, BoxSpawner, { count: 5000, minSize: 8, maxSize: 14, speed: 1 });
  const system = createBoxSpawnerSystem({ width: 640, height: 480 });
  system.update(ctx);
  ctx.commands.flush(world);
  assert.equal(world.query(Position, Box).length, 2000);
  system.update(ctx);
  ctx.commands.flush(world);
  assert.equal(world.query(Position, Box).length, 2000);
});
