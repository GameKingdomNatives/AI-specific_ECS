import test from 'node:test';
import assert from 'node:assert/strict';
import type { SystemDef } from '../src/core/scheduler.js';
import { CommandBuffer, EventBus, Scheduler, World } from '../src/core/index.js';
import { buildSchedule } from '../src/scene/schedule.js';
import type { Scene } from '../src/scene/index.js';

function systemOf(name: string, phase: SystemDef['phase'], after: readonly string[] = []): SystemDef {
  return { name, phase, reads: [], writes: [], after, update: () => undefined };
}

const SCENE: Scene = {
  schemaVersion: 1,
  name: 'demo',
  nodes: [{ id: 'root', name: 'root' }],
  systems: [
    { id: 'a', phase: 'ai', enabled: true, params: { speed: 2 } },
    { id: 'b', phase: 'movement', after: ['a'] },
    { id: 'c', phase: 'damage', enabled: false },
  ],
};

test('按 scene 构造系统：phase 覆盖、after 合并、disabled 跳过、params 透传', () => {
  const seen: { id: string; params: Record<string, number | string | boolean> }[] = [];
  const result = buildSchedule(SCENE, (id, params) => {
    seen.push({ id, params: { ...params } });
    return id === 'c' ? systemOf('c', 'damage') : systemOf(id, 'ai', ['builtin']);
  });
  assert.equal(result.issues.length, 0);
  assert.deepEqual(result.disabled, ['c']);
  assert.equal(result.systems.length, 2);
  assert.equal(result.systems[0]?.name, 'a');
  assert.equal(result.systems[0]?.phase, 'ai');
  assert.deepEqual(result.systems[0]?.after, ['builtin']);
  assert.equal(result.systems[1]?.phase, 'movement');
  assert.deepEqual(result.systems[1]?.after, ['builtin', 'a']);
  assert.deepEqual(seen.map((entry) => entry.id), ['a', 'b']);
  assert.equal(seen[0]?.params.speed, 2);
});

test('未注册系统与工厂名不一致进入 issues', () => {
  const missing = buildSchedule(SCENE, (id) => (id === 'a' ? systemOf('a', 'ai') : undefined));
  assert.ok(missing.issues.some((issue) => issue.message.includes('未注册')));
  const renamed = buildSchedule(SCENE, (id) => systemOf(`${id}x`, 'ai'));
  assert.ok(renamed.issues.some((issue) => issue.message.includes('不一致')));
});

test('scene 内 after 环被拒绝且不返回系统', () => {
  const cyclic: Scene = {
    ...SCENE,
    systems: [
      { id: 'a', phase: 'ai', after: ['b'] },
      { id: 'b', phase: 'ai', after: ['a'] },
    ],
  };
  const result = buildSchedule(cyclic, (id) => systemOf(id, 'ai'));
  assert.equal(result.systems.length, 0);
  assert.ok(result.issues.some((issue) => issue.message.includes('环')));
});

test('构造结果可直接交给 Scheduler 执行', () => {
  const order: string[] = [];
  const result = buildSchedule(SCENE, (id) => ({
    ...systemOf(id, 'ai'),
    update: () => { order.push(id); },
  }));
  const world = new World();
  const bus = new EventBus();
  const commands = new CommandBuffer();
  const scheduler = new Scheduler();
  for (const system of result.systems) scheduler.add(system);
  scheduler.run(world, bus, commands, 1);
  assert.deepEqual(order, ['a', 'b']);
});
