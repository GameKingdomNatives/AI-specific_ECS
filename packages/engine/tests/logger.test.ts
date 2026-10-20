import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryLogger } from '../src/impl/logger.js';

test('四个级别都记录，顺序保持', () => {
  const logger = createMemoryLogger();
  logger.debug('d');
  logger.info('i', { tick: 3 });
  logger.warn('w');
  logger.error('e');
  const entries = logger.entries();
  assert.deepEqual(entries.map((entry) => entry.level), ['debug', 'info', 'warn', 'error']);
  assert.deepEqual(entries[1]?.context, { tick: 3 });
  assert.ok(entries.every((entry) => typeof entry.at === 'string' && entry.at.length > 0));
});

test('超过上限丢弃最旧条目', () => {
  const logger = createMemoryLogger({ max: 2 });
  logger.info('a');
  logger.info('b');
  logger.info('c');
  assert.deepEqual(logger.entries().map((entry) => entry.message), ['b', 'c']);
});

test('sink 收到每条日志，clear 清空内存', () => {
  const seen: string[] = [];
  const logger = createMemoryLogger({ sink: (entry) => seen.push(`${entry.level}:${entry.message}`) });
  logger.warn('disk');
  logger.error('boom');
  assert.deepEqual(seen, ['warn:disk', 'error:boom']);
  logger.clear();
  assert.deepEqual(logger.entries(), []);
});
