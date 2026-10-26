import assert from 'node:assert/strict';
import test from 'node:test';
import { createFluxFeed, liveFeed } from '../src/flux-feed.js';

const PLAYER = 7;

test('只有玩家自己的开火与命中进入事件流', () => {
  const feed = createFluxFeed();
  feed.shot({ entity: PLAYER, slot: 1, heat: 12 }, PLAYER, 10);
  feed.shot({ entity: 9, slot: 9, heat: 2.4 }, PLAYER, 10);
  feed.hit({ target: PLAYER, damage: 8, shielded: true }, PLAYER, 11);
  feed.hit({ target: 9, damage: 8, shielded: true }, PLAYER, 11);
  assert.deepEqual(feed.list.map((entry) => entry.text), ['终结 +12.0 软', '护盾转 +10.0 硬']);
});

test('电子战与压盾走不同文案，终结按 1.8 倍硬辐能', () => {
  const feed = createFluxFeed();
  feed.hit({ target: PLAYER, damage: 6, ew: true }, PLAYER, 1);
  feed.hit({ target: PLAYER, damage: 8, shielded: true }, PLAYER, 2);
  assert.equal(feed.list[0]?.text, 'EW +10.8 硬');
  assert.equal(feed.list[1]?.text, '护盾转 +10.0 硬');
});

test('过载与排散都会被记录，且只保留最近 5 条', () => {
  const feed = createFluxFeed();
  feed.overload({ entity: PLAYER, kind: 'overload' }, 1);
  feed.vent({ entity: PLAYER }, PLAYER, 2);
  for (let index = 0; index < 6; index += 1) feed.shot({ entity: PLAYER, slot: 0, heat: 1.6 }, PLAYER, 10 + index);
  assert.equal(feed.list.length, 5);
  assert.ok(feed.list.every((entry) => entry.text.startsWith('主炮')));
  assert.equal(feed.list.at(-1)?.text, '主炮 +1.6 软');
});

test('超过存活期的条目不再渲染', () => {
  const feed = createFluxFeed();
  feed.shot({ entity: PLAYER, slot: 0, heat: 1.6 }, PLAYER, 0);
  assert.equal(liveFeed(feed.list, 150).length, 1);
  assert.equal(liveFeed(feed.list, 151).length, 0);
});
