import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, EventBus, Scheduler, World } from '../src/core/index.js';
import type { SystemDef } from '../src/core/index.js';
import type { InputSnapshot } from '../src/ports/index.js';
import { deserialize, firstEventDivergence, hashHex, Recorder, replay, serialize, toSnapshot, worldHash, worldHashGroups } from '../src/determinism/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Tag = defineComponent('Tag', { value: 'u32' });

function snapshot(tick: number, dx: number, dy: number): InputSnapshot {
  return { tick, keys: new Set<string>(), buttons: new Set<number>(), pointer: { x: dx, y: dy } };
}

test('分组哈希覆盖互斥组件组合，空组等于基值', () => {
  const world = new World();
  const boxed = world.spawn();
  world.add(boxed, Position, { x: 1, y: 2 });
  world.add(boxed, Tag, { value: 7 });
  const plain = world.spawn();
  world.add(plain, Position, { x: 3, y: 4 });

  assert.equal(worldHashGroups(world, []), 0x811c9dc5);
  const groups = [[Position, Tag], [Position]] as const;
  const first = worldHashGroups(world, groups);
  assert.equal(worldHashGroups(world, groups), first, '同状态同分组必须同哈希');
  assert.notEqual(worldHashGroups(world, [[Position]]), first, '分组数参与混合');
  assert.notEqual(worldHashGroups(world, [[Position], [Position, Tag]]), first, '组序参与混合');
});

test('子弹组变化只影响自身组', () => {
  const world = new World();
  const bullet = world.spawn();
  world.add(bullet, Position, { x: 10, y: 10 });
  world.add(bullet, Tag, { value: 1 });
  const before = worldHashGroups(world, [[Position], [Position, Tag]]);
  world.set(bullet, Tag, { value: 2 });
  const after = worldHashGroups(world, [[Position], [Position, Tag]]);
  assert.notEqual(before, after);
  assert.equal(worldHash(world, [Position]), worldHash(world, [Position]));
});

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

test('v2 录制携带事件并可原样还原', () => {
  const recorder = new Recorder(9);
  recorder.record(1, snapshot(1, 1, 1));
  recorder.captureEvents([{ seq: 1, tick: 1, type: 'hit', payload: { id: 7 } }]);
  const recording = recorder.toRecording();
  assert.equal(recording.version, 2);
  assert.deepEqual(recording.events, [{ tick: 1, type: 'hit', payload: { id: 7 } }]);
  assert.deepEqual(deserialize(serialize(recording)), recording);
});

test('空事件段表示「明确录制了零事件」', () => {
  const recorder = new Recorder(1);
  recorder.captureEvents([]);
  assert.equal(recorder.toRecording().version, 2);
  assert.deepEqual(recorder.toRecording().events, []);
});

test('旧版 v1 录制仍可解析', () => {
  const restored = deserialize(JSON.stringify({ version: 1, seed: 3, ticks: [] }));
  assert.equal(restored.version, 1);
  assert.equal(restored.events, undefined);
});

test('重演可收集事件，首个事件偏离可定位', () => {
  const inputs = [snapshot(1, 1, 0), snapshot(2, 2, 0), snapshot(3, 3, 0)];
  const recording = {
    version: 2 as const,
    seed: 5,
    ticks: inputs.map((input) => ({
      tick: input.tick,
      keys: [] as string[],
      buttons: [] as number[],
      pointer: { ...input.pointer },
    })),
    events: [],
  };
  const bus = new EventBus();
  bus.startRecording();
  const result = replay(recording, {
    step: (_tick, input) => {
      bus.setTick(input.tick);
      bus.emit('moved', { x: input.pointer.x });
    },
    hash: () => 1,
    events: () => bus.drainRecording().map((record) => ({
      tick: record.tick,
      type: record.type,
      payload: record.payload,
    })),
  });
  assert.equal(result.events.length, 3);
  assert.deepEqual(result.events[1], { tick: 2, type: 'moved', payload: { x: 2 } });
  const expected = result.events.map((event) => ({ ...event }));
  assert.equal(firstEventDivergence(result.events, expected), null);
  expected[1] = { tick: 2, type: 'moved', payload: { x: 99 } };
  assert.deepEqual(firstEventDivergence(result.events, expected), { index: 1, tick: 2 });
});
