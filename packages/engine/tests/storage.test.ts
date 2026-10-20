import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStorage, createMemoryStorage, createSaveStore } from '../src/impl/storage.js';
import type { ContentMigration } from '../src/data/migrate.js';

test('内存存储：读写、键列表、删除', () => {
  const storage = createMemoryStorage({ a: '1' });
  storage.set('b', '2');
  assert.equal(storage.get('a'), '1');
  assert.deepEqual(storage.keys().sort(), ['a', 'b']);
  storage.delete('a');
  assert.equal(storage.get('a'), null);
  assert.deepEqual(storage.keys(), ['b']);
});

test('存档：保存后可原样取回', () => {
  const storage = createMemoryStorage();
  const store = createSaveStore<{ gold: number }>(storage, { key: 'save', targetVersion: 1 });
  store.save({ gold: 12 });
  const loaded = store.load();
  assert.equal(loaded.ok, true);
  assert.deepEqual(loaded.payload, { gold: 12 });
  assert.equal(loaded.quarantined, null);
});

test('旧档按版本迁移，新档明确拒绝', () => {
  const migrations: ContentMigration[] = [
    {
      from: 1,
      to: 2,
      migrate: (raw) => ({ ...raw, $schemaVersion: 2, payload: { ...(raw.payload as object), gold: 0 } }),
    },
  ];
  const storage = createMemoryStorage({
    save: JSON.stringify({ $schemaVersion: 1, savedAt: 'old', payload: { level: 3 } }),
  });
  const store = createSaveStore<{ level: number; gold: number }>(storage, {
    key: 'save',
    targetVersion: 2,
    migrations,
  });
  const migrated = store.load();
  assert.equal(migrated.ok, true);
  assert.deepEqual(migrated.payload, { level: 3, gold: 0 });

  storage.set('save', JSON.stringify({ $schemaVersion: 9, savedAt: 'new', payload: {} }));
  const rejected = store.load();
  assert.equal(rejected.ok, false);
  assert.match(rejected.issue ?? '', /高于目标/);
});

test('损坏存档被隔离，不抛异常', () => {
  const storage = createMemoryStorage({ save: '{not json' });
  const store = createSaveStore(storage, { key: 'save', targetVersion: 1 });
  const outcome = store.load();
  assert.equal(outcome.ok, false);
  assert.match(outcome.issue ?? '', /合法 JSON/);
  assert.ok(outcome.quarantined !== null);
  assert.ok(storage.keys().some((key) => key.startsWith('save:quarantine:')));
  assert.equal(storage.get('save'), null);
});

test('没有存档时给出明确结论', () => {
  const store = createSaveStore(createMemoryStorage(), { key: 'missing', targetVersion: 1 });
  const outcome = store.load();
  assert.equal(outcome.ok, false);
  assert.match(outcome.issue ?? '', /没有存档/);
});

test('localStorage 不可用时回退到内存实现', () => {
  const storage = createLocalStorage('test:', createMemoryStorage());
  storage.set('k', 'v');
  assert.equal(storage.get('k'), 'v');
  assert.deepEqual(storage.keys(), ['k']);
});
