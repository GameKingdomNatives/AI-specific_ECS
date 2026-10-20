import test from 'node:test';
import assert from 'node:assert/strict';
import { createPhysicsPort, PhysicsWorld } from '../src/impl/physics.js';

test('圆形查询命中重叠者、忽略远处目标', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 100, 100, 10);
  world.addCircle(2, 400, 400, 10);
  assert.deepEqual(world.queryCircle(105, 100, 8), [1]);
  assert.deepEqual(world.queryCircle(200, 200, 5), []);
});

test('盒子与凸多边形参与查询', () => {
  const world = new PhysicsWorld();
  world.addBox(10, 300, 300, 20, 10);
  world.addPolygon(20, 500, 500, [0, -20, 20, 20, -20, 20]);
  assert.deepEqual(world.queryCircle(315, 305, 4), [10]);
  assert.deepEqual(world.queryCircle(500, 510, 3), [20]);
  assert.deepEqual(world.queryCircle(500, 600, 3), []);
});

test('移除与移动会同步更新网格', () => {
  const world = new PhysicsWorld();
  const handle = world.addCircle(7, 1000, 1000, 10);
  assert.deepEqual(world.queryCircle(1000, 1000, 5), [7]);
  world.move(handle, 1500, 1500);
  assert.deepEqual(world.queryCircle(1000, 1000, 5), []);
  assert.deepEqual(world.queryCircle(1500, 1500, 5), [7]);
  assert.equal(world.remove(handle), true);
  assert.deepEqual(world.queryCircle(1500, 1500, 5), []);
  assert.equal(world.remove(handle), false);
  assert.equal(world.bodyCount, 0);
});

test('射线返回最近命中距离，未命中返回 null', () => {
  const world = new PhysicsWorld();
  world.addCircle(1, 200, 0, 10);
  world.addCircle(2, 100, 0, 5);
  const hit = world.raycast(0, 0, 1, 0, 500);
  assert.ok(hit !== null);
  assert.equal(hit.entity, 2);
  assert.ok(Math.abs(hit.t - 95) < 0.001);
  assert.equal(world.raycast(0, 1000, 1, 0, 500), null);
  assert.equal(world.raycast(0, 0, 0, 0, 500), null);
});

test('射线可命中盒子与多边形', () => {
  const world = new PhysicsWorld();
  world.addBox(10, 300, 0, 20, 20);
  world.addPolygon(20, 0, 300, [-20, -20, 20, -20, 0, 20]);
  const boxHit = world.raycast(0, 0, 1, 0, 1000);
  assert.ok(boxHit !== null && boxHit.entity === 10);
  const polyHit = world.raycast(0, 0, 0, 1, 1000);
  assert.ok(polyHit !== null && polyHit.entity === 20);
});

test('端口适配器只暴露圆形契约', () => {
  const world = new PhysicsWorld();
  const port = createPhysicsPort(world);
  const handle = port.addBody(3, 50, 50, 6);
  assert.deepEqual(port.queryCircle(52, 50, 4), [3]);
  assert.equal(port.raycast(0, 50, 1, 0, 100)?.entity, 3);
  port.removeBody(handle);
  assert.deepEqual(port.queryCircle(52, 50, 4), []);
});
