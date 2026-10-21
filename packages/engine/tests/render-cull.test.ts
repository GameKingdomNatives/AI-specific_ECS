import test from 'node:test';
import assert from 'node:assert/strict';
import { computeViewBounds, isVisible, LOGICAL_SIZE } from '../src/impl/render-cull.js';

const viewport = { width: 1920, height: 1080 };

test('1:1 相机：可见区域正好是逻辑尺寸', () => {
  const bounds = computeViewBounds({ x: 960, y: 540, zoom: 1 }, viewport);
  assert.equal(bounds.minX, 0);
  assert.equal(bounds.minY, 0);
  assert.equal(bounds.maxX, LOGICAL_SIZE.width);
  assert.equal(bounds.maxY, LOGICAL_SIZE.height);
});

test('放大后可见区域变小；缩小后变大', () => {
  const zoomIn = computeViewBounds({ x: 960, y: 540, zoom: 2 }, viewport);
  assert.ok(zoomIn.maxX - zoomIn.minX < LOGICAL_SIZE.width);
  const zoomOut = computeViewBounds({ x: 960, y: 540, zoom: 0.5 }, viewport);
  assert.ok(zoomOut.maxX - zoomOut.minX > LOGICAL_SIZE.width);
});

test('中心与边缘可见，远处被剔除', () => {
  const bounds = computeViewBounds({ x: 960, y: 540, zoom: 1 }, viewport);
  assert.equal(isVisible(bounds, 960, 540, 10, 10), true);
  assert.equal(isVisible(bounds, 5, 540, 10, 10), true);
  assert.equal(isVisible(bounds, 3000, 540, 10, 10), false);
  assert.equal(isVisible(bounds, 960, -100, 10, 10), false);
});

test('margin 让刚好出界的物体重新可见', () => {
  const bounds = computeViewBounds({ x: 960, y: 540, zoom: 1 }, viewport);
  assert.equal(isVisible(bounds, 1930, 540, 10, 10), false);
  assert.equal(isVisible(bounds, 1930, 540, 10, 10, 8), true);
});

test('视口为 0 时不产生 NaN/Infinity', () => {
  const bounds = computeViewBounds({ x: 0, y: 0, zoom: 1 }, { width: 0, height: 0 });
  assert.ok(Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxY));
});
