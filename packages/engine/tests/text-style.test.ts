import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TEXT_FONT, DEFAULT_TEXT_SIZE, resolveTextStyle, textKey } from '../src/impl/text-style.js';

test('文本样式缺省为 monospace/16，字号取整且至少 1', () => {
  assert.deepEqual(resolveTextStyle(undefined, undefined), { font: DEFAULT_TEXT_FONT, size: DEFAULT_TEXT_SIZE });
  assert.deepEqual(resolveTextStyle('serif', 24), { font: 'serif', size: 24 });
  assert.equal(resolveTextStyle(undefined, 0).size, 1);
  assert.equal(resolveTextStyle(undefined, 12.9).size, 12);
});

test('池键包含内容、字体、字号与颜色', () => {
  const key = textKey('KILLS 3', 'serif', 20, 0xffaa66);
  assert.equal(key, 'text:16755302:20:serif:KILLS 3');
  assert.notEqual(key, textKey('KILLS 4', 'serif', 20, 0xffaa66));
  assert.notEqual(key, textKey('KILLS 3', 'monospace', 20, 0xffaa66));
});
