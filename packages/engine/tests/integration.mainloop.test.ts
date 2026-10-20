import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, EventBus, FixedClock, Scheduler, World } from '../src/core/index.js';
import type { SystemDef } from '../src/core/index.js';
import type { InputSnapshot } from '../src/ports/index.js';
import { deserialize, hashHex, Recorder, replay, serialize, worldHash } from '../src/determinism/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

/** 模拟主循环：固定步长时钟 → 每 tick 采样输入 → 录制 → 调度 → 哈希。 */
function runSession(frames: readonly number[], inputs: readonly InputSnapshot[]): { hashes: string[]; recording: string } {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const clock = new FixedClock(1000 / 60);
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  let current = inputs[0] as InputSnapshot;
  const mover: SystemDef = {
    name: 'session.mover',
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
  const recorder = new Recorder(2026);
  const hashes: string[] = [];
  let cursor = 0;
  for (const frameMs of frames) {
    const steps = clock.advance(frameMs);
    for (let step = 0; step < steps; step += 1) {
      const tick = clock.tick - steps + step + 1;
      current = inputs[cursor % inputs.length] as InputSnapshot;
      cursor += 1;
      recorder.record(tick, current);
      scheduler.run(world, bus, commands, tick);
      hashes.push(hashHex(worldHash(world, [Position])));
    }
  }
  return { hashes, recording: serialize(recorder.toRecording()) };
}

function input(dx: number, dy: number): InputSnapshot {
  return { tick: 0, keys: new Set(['KeyW']), buttons: new Set<number>(), pointer: { x: dx, y: dy } };
}

test('主循环录制后重演，逐 tick 哈希一致', () => {
  const frames = Array.from({ length: 90 }, () => 16.6667);
  const inputs = [input(1, 0), input(0, 1), input(2, -1)];
  const first = runSession(frames, inputs);
  const second = runSession(frames, inputs);
  assert.equal(first.hashes.length, 90);
  assert.deepEqual(first.hashes, second.hashes);

  const recording = deserialize(first.recording);
  const world = new World();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  const bus = new EventBus();
  const commands = new CommandBuffer();
  let current = inputs[0] as InputSnapshot;
  const scheduler = new Scheduler();
  scheduler.add({
    name: 'session.mover',
    phase: 'movement',
    reads: [],
    writes: [Position],
    update: (ctx) => {
      const position = ctx.world.get(entity, Position);
      if (position !== undefined) {
        ctx.world.set(entity, Position, { x: position.x + current.pointer.x, y: position.y + current.pointer.y });
      }
    },
  });
  scheduler.build();
  const replayed = replay(recording, {
    step: (tick, snapshot) => {
      current = snapshot;
      scheduler.run(world, bus, commands, tick);
    },
    hash: () => worldHash(world, [Position]),
  });
  assert.deepEqual(replayed.hashes.map(hashHex), first.hashes);
});

test('时钟在不同帧率下给出同一 tick 序列', () => {
  const inputs = [input(1, 1)];
  const sixty = runSession(Array.from({ length: 60 }, () => 16.6667), inputs);
  const thirty = runSession(Array.from({ length: 30 }, () => 33.3334), inputs);
  assert.equal(sixty.hashes.length, 60);
  assert.equal(thirty.hashes.length, 60);
  assert.deepEqual(sixty.hashes, thirty.hashes);
});
