import assert from 'node:assert/strict';
import test from 'node:test';
import { Box, Position } from 'agent-specific_ecs/data';
import { Flux, Mecha, Suppressed, Terminator, Support } from '../src/game/components.js';
import { renderTable, type HitMark } from '../src/render-table.js';
import { createFixture } from './harness.js';

const WIDTH = 1920;
const HEIGHT = 1080;

function setup() {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 600, y: 500 }],
    [Box, { size: 44 }],
    [Mecha, { faction: 0, hull: 100, maxHull: 100 }],
    [Flux, { soft: 20, hard: 10, overloadTicks: 0 }],
    [Terminator, { cooldown: 40 }],
    [Support, { cooldown: 12 }],
  ]);
  const enemy = fixture.spawnWith([
    [Position, { x: 1400, y: 500 }],
    [Box, { size: 44 }],
    [Mecha, { faction: 1, hull: 80, maxHull: 120 }],
    [Suppressed, { ticks: 90 }],
  ]);
  return { fixture, player, enemy };
}

function render(hits: readonly HitMark[] = [], nowTick = 100) {
  const { fixture, player } = setup();
  return renderTable(fixture.world, 1, new Map(), {
    player,
    kills: 2,
    width: WIDTH,
    height: HEIGHT,
    hits,
    feed: [],
    nowTick,
    assets: undefined,
    url: (name: string) => name,
  });
}

function renderWithFlux(flux: { soft: number; hard: number; overloadTicks: number }) {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 600, y: 500 }],
    [Box, { size: 44 }],
    [Mecha, { faction: 0, hull: 100, maxHull: 100 }],
    [Flux, flux],
  ]);
  return renderTable(fixture.world, 1, new Map(), {
    player, kills: 0, width: WIDTH, height: HEIGHT, hits: [], feed: [], nowTick: 10, assets: undefined, url: (name: string) => name,
  });
}

function texts(items: ReturnType<typeof render>): string[] {
  return items.flatMap((item) => (typeof item.text === 'string' ? [item.text] : []));
}

test('HUD 常驻图例包含教学入口与全部键位', () => {
  const legend = texts(render()).find((text) => text.includes('WASD'));
  assert.ok(legend !== undefined);
  for (const token of ['空格 护盾', 'E 终结', 'Q 支援', '? 教学']) assert.ok(legend.includes(token), token);
});

test('三张武器卡都在画面内且互不重叠', () => {
  const cards = render().filter((item) => typeof item.text === 'string' && /主炮|终结 E|支援 Q/.test(item.text));
  assert.equal(cards.length, 3);
  for (const card of cards) {
    assert.ok(card.y > 0 && card.y < HEIGHT, `card y ${card.y}`);
    assert.ok(card.x > 0 && card.x < WIDTH, `card x ${card.x}`);
  }
  const [first, second, third] = [...cards].sort((a, b) => a.y - b.y);
  assert.ok(first !== undefined && second !== undefined && third !== undefined);
  assert.ok(second.y - first.y >= 24);
  assert.ok(third.y - second.y >= 24);
});

test('状态行含辐能、双方结构、击杀与装填，压盾时带 EW 倒计时', () => {
  const status = texts(render()).find((text) => text.startsWith('FLUX'));
  assert.ok(status !== undefined);
  assert.match(status, /FLUX 30 \/ 120/);
  assert.match(status, /HULL 100\/100/);
  assert.match(status, /ENEMY 1架 80\/120/);
  assert.match(status, /KILLS 2/);
  assert.match(status, /E 40 Q 12/);
  assert.match(status, /EW 1\.5s/);
});

test('命中飘字按类型出字并按年龄淡出', () => {
  const normal = render([{ x: 500, y: 400, damage: 12, slot: 1, shielded: false, ew: false, tick: 95 }], 100)
    .filter((item) => item.text === '-12');
  assert.equal(normal.length, 1);
  const [mark] = normal;
  assert.ok(mark !== undefined);
  assert.ok(mark.y < 400, '飘字应上浮');
  assert.ok(mark.alpha > 0 && mark.alpha < 1);

  const ew = render([{ x: 500, y: 400, damage: 6, slot: 2, shielded: false, ew: true, tick: 100 }], 100)
    .find((item) => item.text === 'EW');
  const blocked = render([{ x: 500, y: 400, damage: 8, slot: 0, shielded: true, ew: false, tick: 100 }], 100)
    .find((item) => item.text === 'BLOCK');
  assert.ok(ew !== undefined && blocked !== undefined);
});

test('辐能事件流跟着玩家走且向上堆叠', () => {
  const { fixture, player } = setup();
  const feed = [
    { text: '主炮 +1.6 软', tint: 0xffd27a, tick: 95 },
    { text: '过载 · 停机', tint: 0xff6b6b, tick: 100 },
  ];
  const items = renderTable(fixture.world, 1, new Map(), {
    player, kills: 0, width: WIDTH, height: HEIGHT, hits: [], feed, nowTick: 100, assets: undefined, url: (name: string) => name,
  });
  const shots = items.filter((item) => item.text === '主炮 +1.6 软' || item.text === '过载 · 停机');
  assert.equal(shots.length, 2);
  for (const item of shots) {
    assert.equal(item.x, 600, '锚定在玩家位置，不再贴屏幕角落');
    assert.ok(item.y < 500, '应浮在机甲上方');
  }
  const older = shots.find((item) => item.text === '主炮 +1.6 软');
  const newer = shots.find((item) => item.text === '过载 · 停机');
  assert.ok(older !== undefined && newer !== undefined && older.y < newer.y, '旧条目被顶上去，新条目出现在下方');
});

test('辐能警告：预警/红区/过载各有文字与屏幕边缘提示', () => {
  const warn = renderWithFlux({ soft: 70, hard: 14, overloadTicks: 0 });
  assert.ok(warn.some((item) => item.text === '辐能 84 / 120'));
  assert.equal(warn.filter((item) => typeof item.layer === 'number' && item.layer === 7 && item.text === undefined).length >= 4, true, '四条边');

  const redline = renderWithFlux({ soft: 60, hard: 50, overloadTicks: 0 });
  assert.ok(redline.some((item) => typeof item.text === 'string' && item.text.startsWith('红区')));

  const overload = renderWithFlux({ soft: 0, hard: 50, overloadTicks: 150 });
  assert.ok(overload.some((item) => typeof item.text === 'string' && item.text.startsWith('过载 2.5s')));
});

test('过期飘字不再绘制', () => {
  const stale = render([{ x: 500, y: 400, damage: 12, slot: 0, shielded: false, ew: false, tick: 10 }], 100);
  assert.equal(stale.filter((item) => item.text === '-12').length, 0);
});
