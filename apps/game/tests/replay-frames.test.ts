import assert from 'node:assert/strict';
import test from 'node:test';
import { World } from 'agent-specific_ecs/core';
import { Box, Position } from 'agent-specific_ecs/data';
import { Aim, Flux, FACTION_ENEMY, FACTION_PLAYER, Mecha, Projectile, Shield, Suppressed, Vent } from '../src/game/components.js';
import {
  createReplayRecorder,
  REPLAY_FLAG_ENEMY,
  REPLAY_FLAG_OVERLOAD,
  REPLAY_FLAG_SHIELD,
  REPLAY_FLAG_SUPPRESSED,
  REPLAY_FLAG_VENT,
  REPLAY_KIND_MECHA,
  REPLAY_KIND_PROJECTILE,
  slotOf,
} from '../src/game/replay-frames.js';

function world(): World {
  return new World();
}

function spawnMecha(target: World, x: number, y: number, faction: number, hull = 100): number {
  const entity = target.spawn();
  target.add(entity, Position, { x, y });
  target.add(entity, Box, { size: 20 });
  target.add(entity, Aim, { angle: Math.PI / 2 });
  target.add(entity, Mecha, { faction, hull, maxHull: 100 });
  target.add(entity, Flux, { soft: 10, hard: 4, overloadTicks: 0 });
  return entity;
}

test('逐 tick 记录实体：位置、朝向、结构、辐能都写上', () => {
  const target = world();
  const player = spawnMecha(target, 100, 200, FACTION_PLAYER, 88);
  const recorder = createReplayRecorder({ player: () => player });
  recorder.capture(target, 5);
  const frame = recorder.frameAt(5);
  assert.ok(frame !== null);
  assert.equal(frame.player, player);
  assert.equal(frame.entities.length, 1);
  const entry = frame.entities[0];
  assert.equal(entry?.entity, player);
  assert.equal(entry?.kind, REPLAY_KIND_MECHA);
  assert.equal(entry?.x, 100);
  assert.equal(entry?.y, 200);
  assert.equal(entry?.hull, 88);
  assert.equal(entry?.soft, 10);
  assert.equal(entry?.hard, 4);
  assert.ok(Math.abs((entry?.angle ?? 0) - Math.PI / 2) < 1e-6);
});

test('弹丸与机甲的 kind 分得开，敌方阵营带标记', () => {
  const target = world();
  const player = spawnMecha(target, 0, 0, FACTION_PLAYER);
  const enemy = spawnMecha(target, 50, 0, FACTION_ENEMY);
  const bullet = target.spawn();
  target.add(bullet, Position, { x: 10, y: 10 });
  target.add(bullet, Box, { size: 4 });
  target.add(bullet, Projectile, { damage: 6, faction: FACTION_ENEMY, effect: 0, slot: 9 });
  const recorder = createReplayRecorder({ player: () => player });
  recorder.capture(target, 1);
  const entries = recorder.frameAt(1)?.entities ?? [];
  const byId = new Map(entries.map((entry) => [entry.entity, entry]));
  assert.equal(byId.get(bullet)?.kind, REPLAY_KIND_PROJECTILE);
  assert.equal((byId.get(bullet)?.flags ?? 0) & REPLAY_FLAG_ENEMY, REPLAY_FLAG_ENEMY);
  assert.equal((byId.get(enemy)?.flags ?? 0) & REPLAY_FLAG_ENEMY, REPLAY_FLAG_ENEMY);
  assert.equal((byId.get(player)?.flags ?? 0) & REPLAY_FLAG_ENEMY, 0);
});

test('护盾 / 排散 / 压制 / 过载各自打标记', () => {
  const target = world();
  const player = spawnMecha(target, 0, 0, FACTION_PLAYER);
  target.add(player, Shield, { active: true, radius: 26 });
  target.add(player, Vent, { active: true });
  target.add(player, Suppressed, { ticks: 30 });
  target.set(player, Flux, { soft: 120, hard: 0, overloadTicks: 40 });
  const recorder = createReplayRecorder();
  recorder.capture(target, 2);
  const flags = recorder.frameAt(2)?.entities[0]?.flags ?? 0;
  for (const bit of [REPLAY_FLAG_SHIELD, REPLAY_FLAG_VENT, REPLAY_FLAG_SUPPRESSED, REPLAY_FLAG_OVERLOAD]) {
    assert.equal(flags & bit, bit);
  }
});

test('帧定位：精确 tick、之前最近、之后的空隙', () => {
  const target = world();
  spawnMecha(target, 0, 0, FACTION_PLAYER);
  const recorder = createReplayRecorder();
  recorder.capture(target, 10);
  recorder.capture(target, 20);
  recorder.capture(target, 40);
  assert.equal(recorder.frames, 3);
  assert.equal(recorder.firstTick, 10);
  assert.equal(recorder.lastTick, 40);
  assert.equal(recorder.frameAt(20)?.tick, 20);
  assert.equal(recorder.frameAt(25), null);
  assert.equal(recorder.frameAtOrBefore(25)?.tick, 20);
  assert.equal(recorder.frameAtOrBefore(9), null);
  assert.equal(recorder.indexOfTick(40), 2);
  assert.equal(recorder.indexOfTick(41), -1);
  assert.equal(recorder.tickAt(0), 10);
});

test('超出单帧上限的实体被计数丢弃，不挤掉已记的帧', () => {
  const target = world();
  for (let index = 0; index < 5; index += 1) spawnMecha(target, index * 10, 0, FACTION_PLAYER);
  const recorder = createReplayRecorder({ maxEntitiesPerFrame: 2 });
  recorder.capture(target, 1);
  assert.equal(recorder.frameAt(1)?.entities.length, 2);
  assert.equal(recorder.dropped, 3);
  assert.equal(recorder.frames, 1);
});

test('容量按需增长：长时间记录不丢帧', () => {
  const target = world();
  spawnMecha(target, 0, 0, FACTION_PLAYER);
  const recorder = createReplayRecorder();
  for (let tick = 1; tick <= 600; tick += 1) recorder.capture(target, tick);
  assert.equal(recorder.frames, 600);
  assert.equal(recorder.frameAt(600)?.tick, 600);
});

test('clear 清空记录与统计', () => {
  const target = world();
  spawnMecha(target, 0, 0, FACTION_PLAYER);
  const recorder = createReplayRecorder({ maxEntitiesPerFrame: 1 });
  spawnMecha(target, 30, 0, FACTION_PLAYER);
  recorder.capture(target, 3);
  recorder.clear();
  assert.equal(recorder.frames, 0);
  assert.equal(recorder.dropped, 0);
  assert.equal(recorder.frameAtOrBefore(3), null);
});

test('没有 Box 的弹丸也要记（尺寸按槽位、槽位可读回）', () => {
  const target = world();
  const player = spawnMecha(target, 0, 0, FACTION_PLAYER);
  const bullet = target.spawn();
  target.add(bullet, Position, { x: 30, y: 40 });
  target.add(bullet, Projectile, { damage: 26, faction: FACTION_PLAYER, effect: 0, slot: 1 });
  const recorder = createReplayRecorder({ player: () => player });
  recorder.capture(target, 1);
  const entries = recorder.frameAt(1)?.entities ?? [];
  const shot = entries.find((entry) => entry.entity === bullet);
  assert.ok(shot !== undefined);
  assert.equal(shot.kind, REPLAY_KIND_PROJECTILE);
  assert.equal(shot.x, 30);
  assert.equal(shot.y, 40);
  assert.equal(shot.size, 24);
  assert.equal(slotOf(shot), 1);
});

test('弹丸多了也不会被 Mecha 挤掉：帧里同时有本体与在飞的子弹', () => {
  const target = world();
  const player = spawnMecha(target, 0, 0, FACTION_PLAYER);
  for (let index = 0; index < 6; index += 1) {
    const bullet = target.spawn();
    target.add(bullet, Position, { x: index * 10, y: 10 });
    target.add(bullet, Projectile, { damage: 6, faction: FACTION_PLAYER, effect: 0, slot: 0 });
  }
  const recorder = createReplayRecorder({ player: () => player });
  recorder.capture(target, 1);
  const entries = recorder.frameAt(1)?.entities ?? [];
  assert.equal(entries.length, 7);
  assert.equal(entries.filter((entry) => entry.kind === REPLAY_KIND_PROJECTILE).length, 6);
});
