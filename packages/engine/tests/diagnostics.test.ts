import test from 'node:test';
import assert from 'node:assert/strict';
import { createDumpSink } from '../src/impl/diagnostics.js';
import { createMemoryStorage } from '../src/impl/storage.js';

function dump(system: string, tick: number) {
  return { system, tick, message: `${system} failed`, stack: 'at x' };
}

test('环形保留最新若干条', () => {
  const sink = createDumpSink({ storage: createMemoryStorage(), max: 2 });
  sink.record(dump('a', 1));
  sink.record(dump('b', 2));
  sink.record(dump('c', 3));
  assert.deepEqual(sink.list().map((entry) => entry.system), ['b', 'c']);
});

test('持久化后可恢复，JSON 可解析', () => {
  const storage = createMemoryStorage();
  const sink = createDumpSink({ storage });
  sink.record(dump('demo.hit', 7));
  sink.persist();
  const parsed = JSON.parse(storage.get('dumps') ?? '{}') as { version: number; dumps: unknown[] };
  assert.equal(parsed.version, 1);
  assert.equal(parsed.dumps.length, 1);

  const restored = createDumpSink({ storage });
  assert.equal(restored.restore().length, 1);
  assert.equal(restored.list()[0]?.system, 'demo.hit');
});

test('损坏的持久化数据返回空列表而不是抛错', () => {
  const storage = createMemoryStorage({ dumps: '{broken' });
  const sink = createDumpSink({ storage });
  assert.deepEqual(sink.restore(), []);
});

test('clear 同时清空内存与存储', () => {
  const storage = createMemoryStorage();
  const sink = createDumpSink({ storage });
  sink.record(dump('x', 1));
  sink.clear();
  assert.deepEqual(sink.list(), []);
  assert.equal(storage.get('dumps'), null);
});
