import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addNode,
  addComponent,
  ensureResource,
  moveNode,
  removeNode,
  renameNode,
  setAsset,
  setComponentField,
} from '../src/scene/edit.js';
import type { Scene } from '../src/scene/index.js';

function base(): Scene {
  return {
    schemaVersion: 1,
    name: 'demo',
    resources: { tex: 'player' },
    nodes: [
      { id: 'root', name: 'root' },
      { id: 'player', name: 'player', parentId: 'root', components: { Position: { x: 1, y: 2 } } },
      { id: 'child', name: 'child', parentId: 'player' },
    ],
  };
}

test('添加节点生成唯一 id 并挂到指定父节点', () => {
  const next = addNode(base(), 'root');
  assert.equal(next.nodes.length, 4);
  assert.equal(next.nodes[3]?.id, 'node');
  assert.equal(next.nodes[3]?.parentId, 'root');
  const again = addNode(next, 'root');
  assert.equal(again.nodes[4]?.id, 'node2');
  assert.notEqual(again, next);
});

test('删除节点把子节点交给祖父节点', () => {
  const next = removeNode(base(), 'player');
  assert.equal(next.nodes.length, 2);
  assert.equal(next.nodes.find((node) => node.id === 'child')?.parentId, 'root');
});

test('重命名不修改原文档', () => {
  const scene = base();
  const renamed = renameNode(scene, 'player', 'hero');
  assert.equal(renamed.nodes[1]?.name, 'hero');
  assert.equal(scene.nodes[1]?.name, 'player');
});

test('编辑组件字段不修改原文档', () => {
  const scene = base();
  const moved = setComponentField(scene, 'player', 'Position', 'x', 99);
  assert.equal(moved.nodes[1]?.components?.Position?.x, 99);
  assert.equal(scene.nodes[1]?.components?.Position?.x, 1);
});

test('新增组件写入选中节点', () => {
  const added = addComponent(base(), 'player', 'Box', { size: 16 });
  assert.equal(added.nodes[1]?.components?.Box?.size, 16);
});

test('移动父节点拒绝自身后代环，合法移动成功', () => {
  const bad = moveNode(base(), 'player', 'child');
  assert.ok(bad.issue?.includes('后代'));
  assert.equal(bad.scene.nodes.find((node) => node.id === 'player')?.parentId, 'root');
  const good = moveNode(base(), 'child', 'root');
  assert.equal(good.issue, null);
  assert.equal(good.scene.nodes.find((node) => node.id === 'child')?.parentId, 'root');
});

test('资源别名可设置与清除', () => {
  const withTex = setAsset(base(), 'player', 'texture', 'tex');
  assert.equal(withTex.nodes[1]?.assets?.texture, 'tex');
  const cleared = setAsset(withTex, 'player', 'texture', null);
  assert.equal(cleared.nodes[1]?.assets, undefined);
});

test('ensureResource 复用已有映射，新资源生成合法别名', () => {
  const scene = base();
  const reused = ensureResource(scene, 'player');
  assert.equal(reused.alias, 'tex');
  assert.equal(reused.scene, scene);
  const added = ensureResource(scene, 'enemy.png');
  assert.equal(added.alias, 'enemy.png');
  assert.equal(added.scene.resources?.['enemy.png'], 'enemy.png');
  const deduped = ensureResource(added.scene, 'another');
  assert.equal(deduped.alias, 'another');
});
