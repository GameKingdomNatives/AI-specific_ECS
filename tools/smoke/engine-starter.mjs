import assert from 'node:assert/strict';
import { createEngine } from 'agent-specific_ecs';

const engine = createEngine({ fixedStepMs: 10 });
let ticks = 0;
engine.add({
  name: 'smoke.counter',
  phase: 'movement',
  reads: [],
  writes: [],
  update: () => {
    ticks += 1;
  },
});

engine.step();
assert.equal(engine.clock.tick, 1);
assert.equal(ticks, 1);
assert.equal(engine.advance(25), 2);
assert.equal(engine.clock.tick, 3);
assert.equal(ticks, 3);
engine.dispose();
console.log('headless starter smoke PASS：agent-specific_ecs createEngine 可消费');
