import { readFileSync, writeFileSync } from 'node:fs';
import {
  CommandBuffer,
  defineComponent,
  EventBus,
  Scheduler,
  World,
} from '../packages/engine/dist/src/core/index.js';
import {
  deserialize,
  hashHex,
  replay,
  serialize,
  serializeInput,
  worldHash,
} from '../packages/engine/dist/src/determinism/index.js';

/**
 * 无头回放：不启浏览器、不渲染，只按录制重算世界并对比哈希。
 * 用法：
 *   node tools/replay.mjs --self-test
 *   node tools/replay.mjs --write demo.rec.json --ticks 30
 *   node tools/replay.mjs demo.rec.json [--expect expected.json]
 */

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

function createScenario() {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  let input = { tick: 0, keys: new Set(), buttons: new Set(), pointer: { x: 0, y: 0 } };
  const mover = {
    name: 'replay.mover',
    phase: 'movement',
    reads: [],
    writes: [Position],
    update: (ctx) => {
      const position = ctx.world.get(entity, Position);
      if (position !== undefined) {
        ctx.world.set(entity, Position, {
          x: position.x + input.pointer.x,
          y: position.y + input.pointer.y,
        });
      }
    },
  };
  const scheduler = new Scheduler();
  scheduler.add(mover);
  scheduler.build();
  return {
    hooks: {
      step: (tick, snapshot) => {
        input = snapshot;
        scheduler.run(world, bus, commands, tick);
      },
      hash: () => worldHash(world, [Position]),
    },
  };
}

function runRecording(recording) {
  const scenario = createScenario();
  return replay(recording, scenario.hooks);
}

function makeRecording(ticks) {
  const items = Array.from({ length: ticks }, (_, index) =>
    serializeInput(index + 1, {
      tick: index + 1,
      keys: new Set(index % 3 === 0 ? ['KeyA'] : []),
      buttons: new Set(),
      pointer: { x: index % 4, y: (index * 2) % 3 },
    }),
  );
  return { version: 1, seed: 7, ticks: items };
}

function firstHexDivergence(actual, expected) {
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index += 1) {
    if (actual[index] !== expected[index]) {
      return index;
    }
  }
  return null;
}

const args = process.argv.slice(2);

if (args.includes('--self-test')) {
  const recording = makeRecording(30);
  const first = runRecording(recording);
  const second = runRecording(recording);
  const left = first.hashes.map(hashHex);
  const right = second.hashes.map(hashHex);
  const diverged = firstHexDivergence(left, right);
  console.log(`ticks      ${first.ticks}`);
  console.log(`final      ${hashHex(first.finalHash)}`);
  console.log(diverged === null ? '重演一致   PASS' : `首个偏离   ${diverged + 1}`);
  process.exit(diverged === null ? 0 : 1);
}

if (args.includes('--write')) {
  const index = args.indexOf('--write');
  const target = args[index + 1];
  const tickIndex = args.indexOf('--ticks');
  const ticks = tickIndex >= 0 ? Number(args[tickIndex + 1]) : 30;
  if (target === undefined) {
    console.error('用法：node tools/replay.mjs --write <文件> [--ticks N]');
    process.exit(2);
  }
  writeFileSync(target, `${serialize(makeRecording(ticks))}\n`);
  console.log(`已写入 ${target}（${ticks} ticks）`);
  process.exit(0);
}

const FLAGS_WITH_VALUE = new Set(['--write', '--ticks', '--expect']);
let source;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (FLAGS_WITH_VALUE.has(arg)) {
    index += 1;
    continue;
  }
  if (arg.startsWith('--')) {
    continue;
  }
  source = arg;
  break;
}
if (source === undefined) {
  console.error('用法：node tools/replay.mjs <录制文件> [--expect <哈希文件>]');
  process.exit(2);
}

const recording = deserialize(readFileSync(source, 'utf8'));
const result = runRecording(recording);
console.log(`ticks      ${result.ticks}`);
console.log(`final      ${hashHex(result.finalHash)}`);
console.log(`first      ${hashHex(result.hashes[0] ?? 0)}`);

const expectIndex = args.indexOf('--expect');
if (expectIndex >= 0) {
  const expected = JSON.parse(readFileSync(args[expectIndex + 1], 'utf8'));
  const diverged = firstHexDivergence(result.hashes.map(hashHex), expected.hashes);
  console.log(diverged === null ? '哈希对比   PASS' : `首个偏离   tick ${diverged + 1}`);
  process.exit(diverged === null ? 0 : 1);
}
