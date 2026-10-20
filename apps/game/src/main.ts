import { CommandBuffer, EventBus, Scheduler, World } from '@itb/engine/core';
import { createMovementSystem, spawnBoxes, Position, Velocity, Box } from '@itb/engine/demo';

/**
 * 组合根：唯一知道「谁实现谁」的地方。
 * 本轮只做 headless 技术夹具；渲染接入在第二批，Pixi 实现将挂到 IRenderer 端口上。
 */
const WIDTH = 1920;
const HEIGHT = 1080;
const BOXES = 64;
const TICKS = 120;

const world = new World();
const bus = new EventBus();
const commands = new CommandBuffer();
const scheduler = new Scheduler();

scheduler.add(createMovementSystem(WIDTH, HEIGHT));
scheduler.build();
spawnBoxes(world, BOXES, WIDTH, HEIGHT);

for (let tick = 1; tick <= TICKS; tick += 1) {
  scheduler.run(world, bus, commands, tick);
}

const sample = world.query(Position, Velocity, Box).slice(0, 3);
const summary = {
  ticks: TICKS,
  entities: world.aliveCount,
  sample: sample.map((entity) => world.get(entity, Position)),
};

// eslint-disable-next-line no-console
console.log(JSON.stringify(summary, null, 2));
