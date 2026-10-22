import test from 'node:test';
import assert from 'node:assert/strict';
import { coerceParamValue, validateSystemParams } from '../src/scene/meta.js';
import type { SystemMeta } from '../src/scene/meta.js';

const META: SystemMeta = {
  id: 'demo.weapon',
  label: '武器',
  params: [
    { key: 'cooldownTicks', label: '冷却', kind: 'number', defaultValue: 6, min: 1, max: 60, step: 1 },
    { key: 'mode', label: '模式', kind: 'string', defaultValue: 'single' },
    { key: 'burst', label: '连发', kind: 'boolean', defaultValue: false },
  ],
};

test('参数值按字段类型收敛', () => {
  const cooldown = META.params[0];
  const mode = META.params[1];
  const burst = META.params[2];
  assert.ok(cooldown !== undefined && mode !== undefined && burst !== undefined);
  assert.equal(coerceParamValue(cooldown, 100), 60);
  assert.equal(coerceParamValue(cooldown, Number.NaN), 6);
  assert.equal(coerceParamValue(mode, 'burst'), 'burst');
  assert.equal(coerceParamValue(burst, 'true'), true);
});

test('未知参数、类型与范围错误被报告', () => {
  assert.deepEqual(validateSystemParams(META, { cooldownTicks: 10 }), []);
  assert.ok(validateSystemParams(META, { ghost: 1 }).some((message) => message.includes('不是已声明参数')));
  assert.ok(validateSystemParams(META, { cooldownTicks: 'fast' }).some((message) => message.includes('有限数字')));
  assert.ok(validateSystemParams(META, { cooldownTicks: 999 }).some((message) => message.includes('超出范围')));
  assert.ok(validateSystemParams(META, { burst: 'yes' }).some((message) => message.includes('boolean')));
});
