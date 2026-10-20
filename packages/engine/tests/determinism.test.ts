import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, EventBus, Scheduler, World } from '../src/core/index.js';
import type { SystemDef } from '../src/core/index.js';
import type { InputSnapshot } from '../src/ports/index.js';
import { deserialize, hashHex, Recorder, serialize, toSnapshot, worldHash } from '../src/determinism/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

function snapshot(tick: number, dx: number, dy: number): InputSnapshot {
  return { tick, keys: new Set<string>(), buttons: new Set<number>(), pointer: { x: dx, y: dy } };
}

function runScenario(inputs: readonly InputSnapshot[]): string[] {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  let current = snapshot(0, 0, 0);
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  const mover: SystemDef = {
    name: 'test.mover',
    phase: 'movement',
    reads: [],
    writes: [Position],
    update: (ctx) => {
      const position = ctx.world.get(entity, Position);
      if (position !== undefined) {
        ctx.world.set(entity, Position, {
          x: position.x + current.pointer.x,
          y: position.y + current.pointer.y,
        });
      }
    },
  };
  const scheduler = new Scheduler();
  scheduler.add(mover);
  scheduler.build();
  const hashes: string[] = [];
  for (const input of inputs) {
    current = input;
    scheduler.run(world, bus, commands, input.tick);
    hashes.push(hashHex(worldHash(world, [Position])));
  }
  return hashes;
}

test('同输入重跑得到逐 tick 相同哈希', () => {
  const inputs = Array.from({ length: 30 }, (_, index) => snapshot(index + 1, index % 3, (index * 2) % 5));
  const first = runScenario(inputs);
  const second = runScenario(inputs);
  assert.deepEqual(first, second);
  assert.equal(first.length, 30);
});

test('改动任一输入都会改变最终哈希', () => {
  const base = Array.from({ length: 12 }, (_, index) => snapshot(index + 1, 1, 0));
  const changed = [...base];
  changed[7] = snapshot(8, 9, 0);
  const left = runScenario(base);
  const right = runScenario(changed);
  assert.notEqual(left[left.length - 1], right[right.length - 1]);
  assert.deepEqual(left.slice(0, 7), right.slice(0, 7));
});

test('世界哈希对字段变化敏感', () => {
  const world = new World();
  const entity = world.spawn();
  world.add(entity, Position, { x: 1, y: 2 });
  const before = worldHash(world, [Position]);
  world.set(entity, Position, { y: 3 });
  assert.notEqual(worldHash(world, [Position]), before);
});

test('录制文件可序列化并原样还原', () => {
  const recorder = new Recorder(42);
  recorder.record(1, snapshot(1, 2, 3));
  recorder.record(2, snapshot(2, 4, 5));
  const recording = recorder.toRecording();
  const restored = deserialize(serialize(recording));
  assert.deepEqual(restored, recording);
  assert.equal(recorder.count, 2);
  const first = toSnapshot(restored.ticks[0] as (typeof restored.ticks)[number]);
  assert.deepEqual([...first.keys], []);
  assert.deepEqual(first.pointer, { x: 2, y: 3 });
});

test('非法录制文件被拒绝', () => {
  assert.throws(() => deserialize('{}'), /版本或字段不合法/);
  assert.throws(() => deserialize('null'), /不是对象/);
});
