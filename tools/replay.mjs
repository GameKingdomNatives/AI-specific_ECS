import { readFileSync, writeFileSync } from 'node:fs';
import { createSystems } from '../apps/game/dist-ts/src/system-registry.js';
import {
  CommandBuffer,
  EventBus,
  Scheduler,
  World,
} from '../packages/engine/dist/src/core/index.js';
import { parseContent } from '../packages/engine/dist/src/data/content.js';
import { Box, Position, spawnBoxes } from '../packages/engine/dist/src/demo/index.js';
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

/** 与浏览器同一套世界与系统：玩家先创建，方块后创建，顺序必须一致。 */
function replayApp(file, expectedHash) {
  const width = 1920;
  const height = 1080;
  const recording = deserialize(readFileSync(file, 'utf8'));
  const rawSpec = JSON.parse(readFileSync('apps/game/src/data/demo.boxes.json', 'utf8'));
  const parsed = parseContent(rawSpec);
  const spec = parsed.ok && parsed.value !== null
    ? parsed.value.boxes
    : { count: 64, minSize: 8, maxSize: 14, speed: 1 };
  const world = new World();
  const player = world.spawn();
  world.add(player, Position, { x: width / 2, y: height / 2 });
  world.add(player, Box, { size: 22, tint: 0xff8844 });
  let current = { tick: 0, keys: new Set(), buttons: new Set(), pointer: { x: 0, y: 0 } };
  const systems = createSystems({ width, height, player, getInput: () => current });
  const scheduler = new Scheduler();
  for (const system of systems) {
    scheduler.add(system);
  }
  scheduler.build();
  spawnBoxes(world, spec.count, width, height, spec.minSize, spec.maxSize, spec.speed);
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const result = replay(recording, {
    step: (tick, snapshot) => {
      current = snapshot;
      scheduler.run(world, bus, commands, tick);
    },
    hash: () => worldHash(world, [Position, Box]),
  });
  const final = hashHex(result.finalHash);
  console.log(`ticks      ${result.ticks}`);
  console.log(`final      ${final}`);
  if (result.startHashMatches === false) {
    console.log('干净开局   不匹配（录制可能跨内容热加载或世界不同）');
    return 1;
  }
  if (expectedHash !== null) {
    console.log(final === expectedHash ? '哈希对比   PASS' : `哈希对比   FAIL（期望 ${expectedHash}）`);
    return final === expectedHash ? 0 : 1;
  }
  return 0;
}

if (args.includes('--app')) {
  const index = args.indexOf('--app');
  const file = args[index + 1];
  const expectIndex = args.indexOf('--expect-hash');
  const expected = expectIndex >= 0 ? args[expectIndex + 1] : null;
  if (file === undefined) {
    console.error('用法：node tools/replay.mjs --app <录制文件> [--expect-hash <hex>]');
    process.exit(2);
  }
  process.exit(replayApp(file, expected ?? null));
}


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
