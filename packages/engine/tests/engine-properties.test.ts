import assert from 'node:assert/strict';
import test from 'node:test';

import { createEngine } from '../src/engine.js';

function lcg(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('advance 不变量：tick 增量等于返回步数，且不超过 maxSteps', () => {
  const random = lcg(0x5eed);
  for (let index = 0; index < 500; index += 1) {
    const engine = createEngine({ fixedStepMs: 10, maxStepsPerFrame: 8 });
    const before = engine.clock.tick;
    const ms = random() * 600;
    const steps = engine.advance(ms);
    assert.equal(engine.clock.tick - before, steps);
    assert.ok(steps >= 0 && steps <= 8);
    assert.ok(engine.clock.alpha >= 0 && engine.clock.alpha <= 1);
    engine.dispose();
  }
});

test('step 不变量：每次 step 只推进一个 tick', () => {
  const engine = createEngine({ fixedStepMs: 10 });
  for (let index = 0; index < 100; index += 1) {
    const before = engine.clock.tick;
    engine.step();
    assert.equal(engine.clock.tick, before + 1);
  }
  engine.dispose();
});
