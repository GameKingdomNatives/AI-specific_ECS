import assert from 'node:assert/strict';
import test from 'node:test';

import fc from 'fast-check';

import { World } from '../src/core/index.js';
import { createEngine } from '../src/engine.js';

test('advance 不变量：tick 增量等于返回步数，且不超过 maxSteps', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 2000 }), (ms) => {
      const engine = createEngine({ fixedStepMs: 10, maxStepsPerFrame: 8 });
      const before = engine.clock.tick;
      const steps = engine.advance(ms);
      assert.equal(engine.clock.tick - before, steps);
      assert.ok(steps >= 0 && steps <= 8);
      assert.ok(engine.clock.alpha >= 0 && engine.clock.alpha <= 1);
      engine.dispose();
    }),
    { numRuns: 200 },
  );
});

test('step 不变量：每次 step 只推进一个 tick', () => {
  fc.assert(
    fc.property(fc.integer({ min: 1, max: 100 }), (steps) => {
      const engine = createEngine({ fixedStepMs: 10 });
      for (let index = 0; index < steps; index += 1) {
        const before = engine.clock.tick;
        engine.step();
        assert.equal(engine.clock.tick, before + 1);
      }
      engine.dispose();
    }),
    { numRuns: 100 },
  );
});

test('World 不变量：aliveCount 与存活集合一致，句柄不重复', () => {
  fc.assert(
    fc.property(fc.array(fc.boolean(), { maxLength: 60 }), (ops) => {
      const world = new World();
      const alive = new Set<number>();
      for (const spawn of ops) {
        if (spawn || alive.size === 0) {
          const entity = world.spawn();
          alive.add(entity);
        } else {
          const [entity] = alive;
          if (entity === undefined) throw new Error('alive 集合不应为空');
          assert.equal(world.despawn(entity), true);
          alive.delete(entity);
        }
      }
      assert.equal(world.aliveCount, alive.size);
      assert.equal(new Set(alive).size, alive.size);
      for (const entity of alive) assert.equal(world.isAlive(entity), true);
    }),
    { numRuns: 100 },
  );
});
