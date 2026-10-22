import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceFieldValue, defaultsFor, findComponentMeta } from '../src/scene/meta.js';
import type { ComponentMeta } from '../src/scene/meta.js';

const META: ComponentMeta = {
  name: 'Position',
  label: '位置',
  fields: [
    { key: 'x', label: 'X', kind: 'number', defaultValue: 0, min: -100, max: 100, step: 1 },
    { key: 'locked', label: '锁定', kind: 'boolean', defaultValue: false },
  ],
};

test('默认值来自字段元数据', () => {
  assert.deepEqual(defaultsFor(META), { x: 0, locked: false });
  assert.equal(findComponentMeta([META], 'Position')?.label, '位置');
  assert.equal(findComponentMeta([META], 'Missing'), undefined);
});

test('数字夹取、步长取整、非有限值回落默认', () => {
  const x = META.fields[0];
  assert.ok(x !== undefined);
  assert.equal(coerceFieldValue(x, 250), 100);
  assert.equal(coerceFieldValue(x, -250), -100);
  assert.equal(coerceFieldValue(x, 12.6), 13);
  assert.equal(coerceFieldValue(x, Number.NaN), 0);
  assert.equal(coerceFieldValue(x, Number.POSITIVE_INFINITY), 0);
});

test('布尔字段收敛为真值', () => {
  const locked = META.fields[1];
  assert.ok(locked !== undefined);
  assert.equal(coerceFieldValue(locked, true), true);
  assert.equal(coerceFieldValue(locked, false), false);
});
