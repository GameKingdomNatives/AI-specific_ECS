import test from 'node:test';
import assert from 'node:assert/strict';
import { parseInputMap, resolveActions } from '../src/data/input-map.js';

const raw = {
  $schemaVersion: 1,
  actions: [
    { name: 'up', keys: ['KeyW', 'ArrowUp'] },
    { name: 'down', keys: ['KeyS', 'ArrowDown'] },
    { name: 'fire', keys: ['Space'] },
  ],
};

test('合法映射解析通过', () => {
  const result = parseInputMap(raw);
  assert.equal(result.ok, true);
  assert.equal(result.value?.actions.length, 3);
});

test('版本不符或字段缺失被拒绝', () => {
  assert.equal(parseInputMap({ $schemaVersion: 2, actions: raw.actions }).ok, false);
  assert.equal(parseInputMap({ $schemaVersion: 1 }).ok, false);
  assert.equal(parseInputMap({ $schemaVersion: 1, actions: [] }).ok, false);
  assert.equal(parseInputMap({ $schemaVersion: 1, actions: [{ name: 'up', keys: [] }] }).ok, false);
});

test('动作名或按键重复被拒绝', () => {
  const duplicateName = parseInputMap({
    $schemaVersion: 1,
    actions: [
      { name: 'up', keys: ['KeyW'] },
      { name: 'up', keys: ['KeyS'] },
    ],
  });
  assert.equal(duplicateName.ok, false);
  assert.match(duplicateName.issues.join('\n'), /动作重复/);

  const duplicateKey = parseInputMap({
    $schemaVersion: 1,
    actions: [
      { name: 'up', keys: ['KeyW'] },
      { name: 'down', keys: ['KeyW'] },
    ],
  });
  assert.equal(duplicateKey.ok, false);
  assert.match(duplicateKey.issues.join('\n'), /按键重复/);
});

test('物理键解析为动作，未绑定键被丢弃', () => {
  const map = parseInputMap(raw).value;
  assert.notEqual(map, null);
  if (map === null) {
    return;
  }
  assert.deepEqual([...resolveActions(map, ['KeyW', 'Space'])], ['up', 'fire']);
  assert.deepEqual([...resolveActions(map, ['ArrowUp'])], ['up']);
  assert.deepEqual([...resolveActions(map, ['KeyZ'])], []);
});
