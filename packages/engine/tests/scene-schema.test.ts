import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScene } from '../src/scene/index.js';

const VALID = {
  schemaVersion: 1,
  name: 'demo',
  resources: { player: 'player' },
  nodes: [
    { id: 'root', name: 'root' },
    { id: 'player', name: 'player', parentId: 'root', components: { Position: { x: 10, y: 20 }, Box: { size: 24 } } },
  ],
  systems: [
    { id: 'demo.movement', phase: 'movement', enabled: true },
    { id: 'demo.weapon', phase: 'damage', after: ['demo.movement'], params: { cooldown: 8 } },
  ],
};

function issuesOf(input: unknown): string[] {
  const result = parseScene(input);
  return result.ok ? [] : result.issues.map((issue) => issue.message);
}

test('合法场景通过，节点/系统/资源保留', () => {
  const result = parseScene(VALID);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.nodes.length, 2);
  assert.equal(result.value.nodes[1]?.components?.Position?.x, 10);
  assert.equal(result.value.systems?.[1]?.params?.cooldown, 8);
  assert.equal(result.value.resources?.player, 'player');
});

test('重复节点 id 与父节点缺失被拒绝', () => {
  const duplicate = { ...VALID, nodes: [VALID.nodes[0], VALID.nodes[0]] };
  assert.ok(issuesOf(duplicate).some((message) => message.includes('重复')));
  const missing = { ...VALID, nodes: [{ id: 'a', name: 'a', parentId: 'nope' }] };
  assert.ok(issuesOf(missing).some((message) => message.includes('父节点不存在')));
});

test('父子环与自引用被拒绝', () => {
  const cycle = {
    ...VALID,
    nodes: [
      { id: 'a', name: 'a', parentId: 'b' },
      { id: 'b', name: 'b', parentId: 'a' },
    ],
  };
  assert.ok(issuesOf(cycle).some((message) => message.includes('环')));
  const self = { ...VALID, nodes: [{ id: 'a', name: 'a', parentId: 'a' }] };
  assert.ok(issuesOf(self).some((message) => message.includes('自身')));
});

test('系统阶段、重复 id 与 after 引用被拒绝', () => {
  const badPhase = { ...VALID, systems: [{ id: 'x', phase: 'nope' }] };
  assert.ok(issuesOf(badPhase).length > 0);
  const duplicate = { ...VALID, systems: [{ id: 'x', phase: 'ai' }, { id: 'x', phase: 'movement' }] };
  assert.ok(issuesOf(duplicate).some((message) => message.includes('系统 id 重复')));
  const dangling = { ...VALID, systems: [{ id: 'x', phase: 'ai', after: ['missing'] }] };
  assert.ok(issuesOf(dangling).some((message) => message.includes('after')));
  const selfAfter = { ...VALID, systems: [{ id: 'x', phase: 'ai', after: ['x'] }] };
  assert.ok(issuesOf(selfAfter).some((message) => message.includes('自身')));
});

test('非法结构、非有限数字与嵌套组件被拒绝', () => {
  assert.ok(issuesOf(null).length > 0);
  assert.ok(issuesOf({ ...VALID, schemaVersion: 2 }).length > 0);
  assert.ok(issuesOf({ ...VALID, nodes: [] }).length > 0);
  const nonFinite = { ...VALID, nodes: [{ id: 'a', name: 'a', components: { Position: { x: Number.POSITIVE_INFINITY } } }] };
  assert.ok(issuesOf(nonFinite).length > 0);
  const nested = { ...VALID, nodes: [{ id: 'a', name: 'a', components: { Position: { nested: { x: 1 } } } }] };
  assert.ok(issuesOf(nested).length > 0);
});
