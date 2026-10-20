import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandBuffer, EventBus, Scheduler, World } from '../src/core/index.js';

function throwing(name: string): { name: string; phase: 'movement'; reads: []; writes: []; update: () => void } {
  return {
    name,
    phase: 'movement',
    reads: [],
    writes: [],
    update: () => {
      throw new Error(`${name} 崩溃`);
    },
  };
}

test('连续失败达到上限即熔断，其余系统继续运行', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const errors: string[] = [];
  const scheduler = new Scheduler({
    maxConsecutiveFailures: 3,
    onSystemError: (name, _error, tick) => errors.push(`${name}@${tick}`),
  });
  let partnerRuns = 0;
  scheduler.add(throwing('flaky'));
  scheduler.add({
    name: 'partner',
    phase: 'movement',
    reads: [],
    writes: [],
    update: () => {
      partnerRuns += 1;
    },
  });
  for (let tick = 1; tick <= 5; tick += 1) {
    scheduler.run(world, bus, commands, tick);
  }
  assert.equal(errors.length, 3);
  assert.deepEqual(scheduler.disabledSystems, ['flaky']);
  assert.equal(partnerRuns, 5);
});

test('成功一次会重置连续失败计数', () => {
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const scheduler = new Scheduler({ maxConsecutiveFailures: 3 });
  let call = 0;
  scheduler.add({
    name: 'sometimes',
    phase: 'ai',
    reads: [],
    writes: [],
    update: () => {
      call += 1;
      if (call !== 2) {
        throw new Error('boom');
      }
    },
  });
  for (let tick = 1; tick <= 4; tick += 1) {
    scheduler.run(world, bus, commands, tick);
  }
  assert.deepEqual(scheduler.disabledSystems, []);
  assert.equal(scheduler.failureCount('sometimes'), 2);
  scheduler.run(world, bus, commands, 5);
  assert.deepEqual(scheduler.disabledSystems, ['sometimes']);
});
