import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhysicsPort, PhysicsWorld } from '../src/impl/physics.js';

test('圆形查询命中重叠者、忽略远处目标，结果升序', () => {
  const world = new PhysicsWorld();
  world.addCircle(9, 100, 100, 10);
  world.addCircle(2, 104, 100, 10);
  world.addCircle(5, 400, 400, 10);
  assert.deepEqual(world.queryCircle(105, 100, 8), [2, 9]);
  assert.deepEqual(world.queryCircle(200, 200, 5), []);
});

test('盒子、凸多边形与胶囊参与查询', () => {
  const world = new PhysicsWorld();
  world.addBox(10, 300, 300, 20, 10);
  world.addPolygon(20, 500, 500, [-20, 20, 20, 20, 0, -20]);
  world.addCapsule(30, 0, 0, 20, 5);
  assert.deepEqual(world.queryCircle(315, 305, 4), [10]);
  assert.deepEqual(world.queryCircle(500, 492, 3), [20]);
  assert.deepEqual(world.queryCircle(25, 0, 3), [30]);
  assert.deepEqual(world.queryCircle(0, 12, 3), []);
});

test('层掩码与排除列表生效', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 0, 0, 10, { layer: 1 });
  world.addCircle(2, 0, 0, 10, { layer: 2 });
  assert.deepEqual(world.queryCircle(0, 0, 5, { mask: 1 }), [1]);
  assert.deepEqual(world.queryCircle(0, 0, 5, { mask: 2 }), [2]);
  assert.deepEqual(world.queryCircle(0, 0, 5, { exclude: [1] }), [2]);
});

test('removeByEntity 与批处理下的 setTransform', () => {
  const world = new PhysicsWorld();
  world.addCircle(7, 1000, 1000, 10);
  world.addBox(7, 1000, 1000, 5, 5);
  assert.deepEqual(world.queryCircle(1000, 1000, 8), [7]);
  assert.equal(world.removeByEntity(7), 2);
  assert.equal(world.bodyCount, 0);
  const other = world.addCircle(8, 0, 0, 5);
  world.beginFrame();
  world.setTransform(other, 500, 500, 0);
  assert.deepEqual(world.queryCircle(500, 500, 6), []);
  world.endFrame();
  assert.deepEqual(world.queryCircle(500, 500, 6), [8]);
});

test('射线返回命中点与法线', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 100, 0, 5);
  const hit = world.raycast(0, 0, 1, 0, 500);
  assert.ok(hit !== null);
  assert.equal(hit.entity, 1);
  assert.ok(Math.abs(hit.t - 95) < 0.001);
  assert.ok(Math.abs(hit.x - 95) < 0.001);
  assert.ok(hit.nx < -0.9);
  assert.equal(world.raycast(0, 1000, 1, 0, 500), null);
});

test('sweepCircle 命中高速目标（防穿透）', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 300, 0, 5);
  const hit = world.sweepCircle(0, 0, 1, 0, 4, 1000);
  assert.ok(hit !== null);
  assert.equal(hit.entity, 1);
  assert.ok(hit.t > 285 && hit.t < 300);
});

test('扇形与最近目标查询', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 10, 0, 2);
  world.addCircle(2, 0, 10, 2);
  world.addCircle(3, 60, 30, 2);
  assert.deepEqual(world.queryCone(0, 0, 1, 0, 0.3, 100), [1]);
  assert.equal(world.nearest(0, 0, 100), 1);
  assert.equal(world.nearest(0, 0, 5), null);
});

test('contacts 去重、排序，且只报真实重叠', () => {
  const world = new PhysicsWorld();
  world.addCircle(5, 0, 0, 10);
  world.addCircle(2, 12, 0, 10);
  world.addCircle(9, 500, 500, 10);
  assert.deepEqual(world.contacts(), [{ a: 2, b: 5 }]);
});

test('debugShapes 与 stats 可供调试与探针使用', () => {
  const world = new PhysicsWorld();
  world.addBox(1, 10, 20, 5, 6);
  const shapes = world.debugShapes();
  assert.equal(shapes.length, 1);
  assert.equal(shapes[0]?.kind, 'polygon');
  assert.equal(shapes[0]?.points.length, 8);
  const stats = world.stats();
  assert.equal(stats.bodies, 1);
  assert.ok(stats.cells >= 1);
});

test('端口实现与内核一致（HARD 变更后契约可用）', () => {
  const world = new PhysicsWorld();
  const port = createPhysicsPort(world);
  port.addCapsule(3, 0, 0, 10, 4);
  assert.deepEqual(port.queryCircle(13, 0, 2), [3]);
  assert.equal(port.raycast(0, 0, 1, 0, 100)?.entity, 3);
  assert.equal(port.contacts().length, 0);
  port.removeByEntity(3);
  assert.equal(port.stats().bodies, 0);
});

test('contacts 同时报多对重叠，互不干扰', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 0, 0, 10);
  world.addCircle(2, 5, 0, 10);
  world.addCircle(3, 100, 0, 10);
  world.addCircle(4, 106, 0, 10);
  world.addCircle(5, 400, 400, 10);
  assert.deepEqual(world.contacts(), [{ a: 1, b: 2 }, { a: 3, b: 4 }]);
});

test('debugShapes 圆形给出 kind/坐标/半径', () => {
  const world = new PhysicsWorld();
  world.addCircle(7, 30, 40, 12);
  const shapes = world.debugShapes();
  assert.equal(shapes.length, 1);
  const shape = shapes[0];
  assert.equal(shape?.entity, 7);
  assert.equal(shape?.kind, 'circle');
  assert.equal(shape?.x, 30);
  assert.equal(shape?.y, 40);
  assert.equal(shape?.radius, 12);
  assert.equal(shape?.rotation, 0);
});
