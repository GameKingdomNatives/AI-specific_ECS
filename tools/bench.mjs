import { readFileSync, writeFileSync } from 'node:fs';
import {
  CommandBuffer,
  EventBus,
  Scheduler,
  World,
} from '../packages/engine/dist/src/core/index.js';
import { createMovementSystem, spawnBoxes } from '../packages/engine/dist/src/demo/index.js';

/**
 * 逻辑帧基准：只测模拟，不测渲染。
 * 判定 = 绝对预算（默认 4ms）且不超过历史基线的容差（默认 1.25 倍）。
 * --update 会把本次读数写成新基线。
 */
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? Number(args[index + 1]) : fallback;
};
const stringOf = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const entities = valueOf('--entities', 3000);
const ticks = valueOf('--ticks', 200);
const budgetMs = valueOf('--budget', 4);
const tolerance = valueOf('--tolerance', 1.25);
const baselinePath = stringOf('--baseline', 'tools/bench-baseline.json');
const update = args.includes('--update');

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
const msPerTick = totalMs / ticks;

let baselineMs = null;
try {
  baselineMs = JSON.parse(readFileSync(baselinePath, 'utf8')).msPerTick ?? null;
} catch {
  baselineMs = null;
}

const withinBudget = msPerTick <= budgetMs;
const withinBaseline = baselineMs === null || msPerTick <= baselineMs * tolerance;
const pass = withinBudget && withinBaseline;

const report = {
  entities,
  ticks,
  totalMs: Number(totalMs.toFixed(2)),
  msPerTick: Number(msPerTick.toFixed(3)),
  budgetMs,
  baselineMs,
  tolerance,
  withinBudget,
  withinBaseline,
  pass,
};
console.log(JSON.stringify(report, null, 2));

if (update) {
  writeFileSync(baselinePath, `${JSON.stringify({
    msPerTick: Number(msPerTick.toFixed(3)),
    entities,
    ticks,
    recordedAt: new Date().toISOString(),
  }, null, 2)}\n`);
  console.log(`基线已更新：${baselinePath}`);
}

process.exit(pass ? 0 : 1);
