import assert from 'node:assert/strict';
import test from 'node:test';

import { defineComponent, World } from '../src/core/index.js';

const GoldenPosition = defineComponent('GoldenPosition', { x: 'f64', y: 'f64' });

test('黄金样例：spawn/add/despawn 后的世界快照稳定', () => {
  const world = new World();
  const first = world.spawn();
  world.add(first, GoldenPosition, { x: 1, y: 2 });
  const second = world.spawn();
  world.add(second, GoldenPosition, { x: 3, y: 4 });
  world.despawn(first);

  assert.deepEqual(world.snapshot(), {
    nextIndex: 2,
    liveCount: 1,
    generations: [1, 0],
    alive: [0, 1],
    free: [0],
    components: [
      {
        name: 'GoldenPosition',
        fields: { x: 'f64', y: 'f64' },
        entities: [1],
        rows: [{ x: 3, y: 4 }],
      },
    ],
  });
});

test('黄金样例：快照 restore 后再次快照一致', () => {
  const source = new World();
  const first = source.spawn();
  source.add(first, GoldenPosition, { x: 7, y: 8 });
  const second = source.spawn();
  source.add(second, GoldenPosition, { x: 9, y: 10 });
  source.despawn(first);
  const snapshot = source.snapshot();

  const restored = new World();
  restored.restore(snapshot);
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.equal(restored.aliveCount, 1);
  assert.deepEqual(restored.get(second, GoldenPosition), { x: 9, y: 10 });
});
