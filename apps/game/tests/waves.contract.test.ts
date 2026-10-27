import assert from 'node:assert/strict';
import test from 'node:test';
import { Box, Position } from 'agent-specific_ecs/data';
import { Ai, Flux, Mecha, Run, Shield, Vent, Weapon } from '../src/game/components.js';
import { WAVE_INTERVAL_TICKS, aliveEnemies, createWaveSystem } from '../src/game/systems/waves.js';
import { createFixture } from './harness.js';

function setup(wave = 1, maxWave = 3) {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 400, y: 300 }],
    [Mecha, { faction: 0, hull: 100, maxHull: 100 }],
    [Run, { wave, maxWave, spawnTicks: 0 }],
  ]);
  return { fixture, player };
}

function spawnEnemy(fixture: ReturnType<typeof createFixture>): number {
  return fixture.spawnWith([
    [Position, { x: 1200, y: 400 }],
    [Box, { size: 30, tint: 16777215 }],
    [Mecha, { faction: 1, hull: 140, maxHull: 140 }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Shield, { active: true, radius: 54 }],
    [Weapon, { cooldown: 0 }],
    [Ai, { mode: 0, timer: 0 }],
    [Vent, { active: false }],
  ]);
}

test('清场后才开始补位倒计时，倒计时结束补 2 架', () => {
  const { fixture, player } = setup();
  const system = createWaveSystem({ width: 1920, height: 1080 });
  spawnEnemy(fixture);
  fixture.run(system);
  assert.equal(fixture.world.get(player, Run)?.spawnTicks, 0, '场上还有敌机时不该倒计时');

  for (const entity of fixture.world.query(Mecha)) {
    if (fixture.world.get(entity, Mecha)?.faction === 1) fixture.world.despawn(entity);
  }
  fixture.run(system);
  assert.equal(fixture.world.get(player, Run)?.wave, 2);
  assert.equal(fixture.world.get(player, Run)?.spawnTicks, WAVE_INTERVAL_TICKS);

  for (let index = 0; index < WAVE_INTERVAL_TICKS; index += 1) fixture.run(system);
  assert.equal(aliveEnemies(fixture.ctx), 2);
});

test('补位不会超过最大波数，清场后停住', () => {
  const { fixture, player } = setup(3, 3);
  const system = createWaveSystem({ width: 1920, height: 1080 });
  fixture.run(system);
  assert.equal(fixture.world.get(player, Run)?.wave, 3);
  assert.equal(fixture.world.get(player, Run)?.spawnTicks, 0);
  assert.equal(aliveEnemies(fixture.ctx), 0);
});

test('补位点按波次固定，可回放', () => {
  const { fixture } = setup(1, 3);
  const system = createWaveSystem({ width: 1920, height: 1080 });
  fixture.run(system);
  for (let index = 0; index < WAVE_INTERVAL_TICKS; index += 1) fixture.run(system);
  const positions = fixture.world
    .query(Position, Mecha)
    .filter((entity) => fixture.world.get(entity, Mecha)?.faction === 1)
    .map((entity) => fixture.world.get(entity, Position))
    .sort((left, right) => (left?.y ?? 0) - (right?.y ?? 0));
  assert.equal(positions.length, 2);
  assert.equal(positions[0]?.x, 220);
  assert.equal(positions[1]?.x, 220);
});
