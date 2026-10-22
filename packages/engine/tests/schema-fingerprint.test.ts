import test from 'node:test';
import assert from 'node:assert/strict';
import { schemaFingerprint } from '../src/core/schema-fingerprint.js';

test('组件集合相同则指纹相同（与顺序无关）', () => {
  const a = { name: 'A', fields: { x: 'f64', y: 'f64' } };
  const b = { name: 'B', fields: { flag: 'bool' } };
  assert.equal(schemaFingerprint([a, b]), schemaFingerprint([b, a]));
});

test('组件集合、字段或字段类型变化都会改变指纹', () => {
  const base = { name: 'A', fields: { x: 'f64' } };
  assert.notEqual(schemaFingerprint([base]), schemaFingerprint([base, { name: 'B', fields: {} }]));
  assert.notEqual(schemaFingerprint([base]), schemaFingerprint([{ name: 'A', fields: { x: 'f64', y: 'f64' } }]));
  assert.notEqual(schemaFingerprint([base]), schemaFingerprint([{ name: 'A', fields: { x: 'i32' } }]));
});
