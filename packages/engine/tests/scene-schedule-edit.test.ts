import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addSystem,
  removeSystem,
  setSystemAfter,
  setSystemEnabled,
  setSystemParam,
  updateSystemPhase,
} from '../src/scene/schedule-edit.js';
import type { Scene } from '../src/scene/index.js';

function base(): Scene {
  return {
    schemaVersion: 1,
    name: 'demo',
    nodes: [{ id: 'root', name: 'root' }],
    systems: [
      { id: 'a', phase: 'ai' },
      { id: 'b', phase: 'movement', after: ['a'] },
    ],
  };
}

test('新增与删除系统不修改原文档', () => {
  const scene = base();
  const added = addSystem(scene, 'c', 'damage');
  assert.equal(added.systems?.length, 3);
  assert.equal(scene.systems?.length, 2);
  const removed = removeSystem(scene, 'a');
  assert.deepEqual(removed.systems?.map((system) => system.id), ['b']);
});

test('阶段与启用状态可更新', () => {
  const moved = updateSystemPhase(base(), 'a', 'cleanup');
  assert.equal(moved.systems?.[0]?.phase, 'cleanup');
  const off = setSystemEnabled(base(), 'a', false);
  assert.equal(off.systems?.[0]?.enabled, false);
});

test('after 去重、去自引用并保留未知 id', () => {
  const next = setSystemAfter(base(), 'a', ['b', 'b', 'a', 'ghost']);
  assert.deepEqual(next.systems?.[0]?.after, ['b', 'ghost']);
});

test('参数可增删，空参数回落 undefined', () => {
  const withParam = setSystemParam(base(), 'a', 'speed', 2);
  assert.equal(withParam.systems?.[0]?.params?.speed, 2);
  const replaced = setSystemParam(withParam, 'a', 'speed', 'fast');
  assert.equal(replaced.systems?.[0]?.params?.speed, 'fast');
  const cleared = setSystemParam(replaced, 'a', 'speed', null);
  assert.equal(cleared.systems?.[0]?.params, undefined);
});
