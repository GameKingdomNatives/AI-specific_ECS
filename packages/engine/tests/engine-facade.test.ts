import assert from 'node:assert/strict';
import test from 'node:test';

import { createEngine } from '../src/engine.js';
import type { SystemDef } from '../src/core/scheduler.js';

function counterSystem(): { system: SystemDef; ticks: () => number } {
  let ticks = 0;
  return {
    system: {
      name: 'test.counter',
      phase: 'movement',
      reads: [],
      writes: [],
      update: () => {
        ticks += 1;
      },
    },
    ticks: () => ticks,
  };
}

test('createEngine 默认不运行，step 推进一个 tick', () => {
  const counter = counterSystem();
  const engine = createEngine({ systems: [counter.system] });
  assert.equal(engine.running, false);
  assert.equal(engine.clock.tick, 0);
  engine.step();
  assert.equal(engine.clock.tick, 1);
  assert.equal(counter.ticks(), 1);
  engine.dispose();
});

test('advance 按固定步长跑对应次数，tick 连续', () => {
  const counter = counterSystem();
  const engine = createEngine({ fixedStepMs: 10, maxStepsPerFrame: 8, systems: [counter.system] });
  assert.equal(engine.advance(25), 2);
  assert.equal(engine.clock.tick, 2);
  assert.equal(counter.ticks(), 2);
  assert.equal(engine.advance(10), 1);
  assert.equal(engine.clock.tick, 3);
  engine.dispose();
});

test('start/stop 控制 running，dispose 可重复调用', () => {
  const engine = createEngine();
  engine.start();
  assert.equal(engine.running, true);
  engine.start();
  assert.equal(engine.running, true);
  engine.stop();
  assert.equal(engine.running, false);
  engine.stop();
  engine.dispose();
  engine.dispose();
  assert.equal(engine.running, false);
});
