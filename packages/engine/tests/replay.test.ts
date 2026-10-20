import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, defineComponent, EventBus, Scheduler, World } from '../src/core/index.js';
import type { SystemDef } from '../src/core/index.js';
import type { InputSnapshot } from '../src/ports/index.js';
import { firstDivergence, hashHex, replay, serializeInput } from '../src/determinism/index.js';
import type { Recording } from '../src/determinism/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });

function scenario(): { recording: Recording; hooks: { step: (tick: number, input: InputSnapshot) => void; hash: () => number } } {
  const world = new World();
  const entity = world.spawn();
  world.add(entity, Position, { x: 0, y: 0 });
  let input: InputSnapshot = { tick: 0, keys: new Set(), buttons: new Set(), pointer: { x: 0, y: 0 } };
  const mover: SystemDef = {
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
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const ticks = Array.from({ length: 20 }, (_, index) => serializeInput(index + 1, {
    tick: index + 1,
    keys: new Set(index % 3 === 0 ? ['KeyA'] : []),
    buttons: new Set<number>(),
    pointer: { x: index % 4, y: (index * 2) % 3 },
  }));
  const recording: Recording = { version: 1, seed: 99, ticks };
  return {
    recording,
    hooks: {
      step: (tick, snapshot) => {
        input = snapshot;
        scheduler.run(world, bus, commands, tick);
      },
      hash: () => {
        const position = world.get(entity, Position);
        return Math.round(((position?.x ?? 0) * 1000 + (position?.y ?? 0)) * 1000);
      },
    },
  };
}

test('同一录制重演两次得到相同哈希序列', () => {
  const first = scenario();
  const second = scenario();
  const left = replay(first.recording, first.hooks);
  const right = replay(second.recording, second.hooks);
  assert.equal(left.ticks, 20);
  assert.deepEqual(left.hashes, right.hashes);
  assert.equal(left.finalHash, right.finalHash);
});

test('偏离定位到第一个不一致的 tick', () => {
  assert.equal(firstDivergence([1, 2, 3], [1, 2, 3]), null);
  assert.equal(firstDivergence([1, 2, 3], [1, 9, 3]), 1);
  assert.equal(firstDivergence([1, 2], [1, 2, 3]), 2);
});

test('开局哈希不符会被标记（防止跨热加载录制混入回归）', () => {
  const setup = scenario();
  const dirty = { ...setup.recording, startHash: 'deadbeef' };
  assert.equal(replay(dirty, setup.hooks).startHashMatches, false);
  const clean = { ...setup.recording, startHash: hashHex(setup.hooks.hash()) };
  assert.equal(replay(clean, setup.hooks).startHashMatches, true);
});