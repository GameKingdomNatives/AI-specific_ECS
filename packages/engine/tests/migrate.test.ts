import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMigrations } from '../src/data/migrate.js';
import type { ContentMigration } from '../src/data/migrate.js';

const chain: ContentMigration[] = [
  {
    from: 1,
    to: 2,
    migrate: (raw) => {
      const boxes = raw.boxes as Record<string, unknown>;
      return { ...raw, $schemaVersion: 2, boxes: { ...boxes, restitution: 0 } };
    },
  },
  {
    from: 2,
    to: 3,
    migrate: (raw) => ({ ...raw, $schemaVersion: 3, note: 'v3' }),
  },
];

test('逐版迁移并记录已应用版本', () => {
  const result = applyMigrations({ $schemaVersion: 1, boxes: { count: 4 } }, chain, 3);
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, [1, 2]);
  const raw = result.raw as Record<string, unknown>;
  assert.equal(raw.$schemaVersion, 3);
  assert.equal((raw.boxes as Record<string, unknown>).restitution, 0);
});

test('已是目标版本则原样返回', () => {
  const input = { $schemaVersion: 3, boxes: { count: 1 } };
  const result = applyMigrations(input, chain, 3);
  assert.equal(result.ok, true);
  assert.deepEqual(result.applied, []);
  assert.deepEqual(result.raw, input);
});

test('缺迁移链或跳版都明确失败', () => {
  const missing = applyMigrations({ $schemaVersion: 1 }, chain.slice(1, 2), 3);
  assert.equal(missing.ok, false);
  assert.match(missing.issue ?? '', /缺少 v1 → v2/);
  const skip = applyMigrations({ $schemaVersion: 1 }, [{ from: 1, to: 3, migrate: (raw) => raw }], 3);
  assert.equal(skip.ok, false);
  assert.match(skip.issue ?? '', /逐版/);
});

test('数据版本高于目标或缺少版本号都拒绝', () => {
  const newer = applyMigrations({ $schemaVersion: 4 }, chain, 3);
  assert.equal(newer.ok, false);
  assert.match(newer.issue ?? '', /高于目标/);
  const missing = applyMigrations({ boxes: {} }, chain, 3);
  assert.equal(missing.ok, false);
  assert.match(missing.issue ?? '', /缺少合法/);
});
