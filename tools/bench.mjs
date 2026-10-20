import {
  CommandBuffer,
  EventBus,
  Scheduler,
  World,
} from '../packages/engine/dist/src/core/index.js';
import { createMovementSystem, spawnBoxes } from '../packages/engine/dist/src/demo/index.js';

/** 逻辑帧基准：只测模拟，不测渲染。默认 3000 个实体、300 tick。 */
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};

const entities = valueOf('--entities', 3000);
const ticks = valueOf('--ticks', 300);
const budgetMs = valueOf('--budget', 4);
const width = 1920;
const height = 1080;

const world = new World();
const bus = new EventBus();
const commands = new CommandBuffer();
const scheduler = new Scheduler();
scheduler.add(createMovementSystem(width, height));
scheduler.build();
spawnBoxes(world, entities, width, height);

for (let tick = 1; tick <= 20; tick += 1) {
  scheduler.run(world, bus, commands, tick);
}

const started = process.hrtime.bigint();
for (let tick = 21; tick < 21 + ticks; tick += 1) {
  scheduler.run(world, bus, commands, tick);
}
const totalMs = Number(process.hrtime.bigint() - started) / 1e6;
const perTick = totalMs / ticks;

console.log(JSON.stringify({
  entities,
  ticks,
  totalMs: Number(totalMs.toFixed(2)),
  msPerTick: Number(perTick.toFixed(3)),
  budgetMs,
  pass: perTick <= budgetMs,
}, null, 2));
process.exit(perTick <= budgetMs ? 0 : 1);
