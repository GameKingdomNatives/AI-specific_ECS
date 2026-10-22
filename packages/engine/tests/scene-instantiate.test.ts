import test from 'node:test';
import assert from 'node:assert/strict';
import { defineComponent, World } from '../src/core/index.js';
import { instantiateScene, parseScene, SceneParent } from '../src/scene/index.js';
import type { Scene } from '../src/scene/index.js';

const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
const Box = defineComponent('Box', { size: 'f64', solid: 'bool' });
const lookup = (name: string) => (name === 'Position' ? Position : name === 'Box' ? Box : undefined);

function sceneOf(raw: unknown) {
  const parsed = parseScene(raw);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) throw new Error('scene invalid');
  return parsed.value;
}

test('节点实例化为实体，组件值与父关系写入', () => {
  const scene = sceneOf({
    schemaVersion: 1,
    name: 'demo',
    resources: { playerTex: 'player', shootSfx: 'shoot' },
    nodes: [
      { id: 'root', name: 'root' },
      { id: 'player', name: 'player', parentId: 'root', assets: { texture: 'playerTex', audio: 'shootSfx' },
        components: { Position: { x: 10, y: 20 }, Box: { size: 24, solid: true } } },
    ],
  });
  const world = new World();
  const result = instantiateScene(world, scene, { lookup });
  assert.equal(result.issues.length, 0);
  assert.equal(world.aliveCount, 2);
  const player = result.entities.get('player');
  const root = result.entities.get('root');
  assert.ok(player !== undefined && root !== undefined);
  const position = world.get(player, Position);
  assert.equal(position?.x, 10);
  assert.equal(world.get(player, Box)?.solid, true);
  assert.equal(world.get(player, SceneParent)?.parent, root);
  assert.equal(result.assets.get(player)?.texture, 'player');
  assert.equal(result.assets.get(player)?.audio, 'shoot');
});

test('未知组件、未知字段、字符串字段与缺失别名进入 issues 且不阻断其它写入', () => {
  const scene: Scene = {
    schemaVersion: 1,
    name: 'demo',
    nodes: [
      { id: 'a', name: 'a', components: { Ghost: { x: 1 }, Position: { x: 1, label: 'nope' }, Box: { size: 'big' } }, assets: { texture: 'missing' } },
      { id: 'b', name: 'b', components: { Box: { size: 2, solid: false } } },
    ],
  };
  const world = new World();
  const result = instantiateScene(world, scene, { lookup });
  const messages = result.issues.map((issue) => issue.message);
  assert.ok(messages.some((message) => message.includes('组件未注册')));
  assert.ok(messages.some((message) => message.includes('没有字段')));
  assert.ok(messages.some((message) => message.includes('字符串')));
  assert.ok(messages.some((message) => message.includes('资源别名不存在')));
  const a = result.entities.get('a');
  const b = result.entities.get('b');
  assert.ok(a !== undefined && b !== undefined);
  assert.equal(world.get(a, Position)?.x, 1);
  assert.equal(world.get(b, Box)?.size, 2);
});

test('可替换父关系组件', () => {
  const Parent2 = defineComponent('Parent2', { owner: 'f64' });
  const scene = sceneOf({
    schemaVersion: 1,
    name: 'demo',
    nodes: [{ id: 'root', name: 'root' }, { id: 'child', name: 'child', parentId: 'root' }],
  });
  const world = new World();
  const result = instantiateScene(world, scene, { lookup, parent: Parent2 });
  const child = result.entities.get('child');
  const root = result.entities.get('root');
  assert.ok(child !== undefined && root !== undefined);
  assert.equal(world.get(child, Parent2)?.owner, root);
});
