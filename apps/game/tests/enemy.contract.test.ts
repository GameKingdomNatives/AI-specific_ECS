import assert from 'node:assert/strict';
import test from 'node:test';
import { Position, Velocity } from '@itb/fixture';
import { Ai, Aim, Flux, Mecha, Projectile, Shield, Suppressed, Vent, Weapon } from '../src/game/components.js';
import { AI_ENGAGE, AI_VENT, createEnemyAiSystem } from '../src/game/systems/enemy.js';
import { createEnemyWeaponSystem } from '../src/game/systems/weapon.js';
import { createFixture } from './harness.js';

function setup(enemyFlux = 0) {
  const fixture = createFixture();
  const player = fixture.spawnWith([[Position, { x: 400, y: 300 }], [Mecha, { faction: 0, hull: 100, maxHull: 100 }]]);
  const enemy = fixture.spawnWith([
    [Position, { x: 900, y: 300 }],
    [Mecha, { faction: 1, hull: 100, maxHull: 100 }],
    [Flux, { soft: enemyFlux, hard: 0, overloadTicks: 0 }],
    [Shield, { active: true, radius: 50 }],
    [Vent, { active: false }],
    [Weapon, { cooldown: 0 }],
    [Aim, { angle: 0 }],
    [Ai, { mode: 0, timer: 0 }],
    [Suppressed, { ticks: 0 }],
  ]);
  return { fixture, player, enemy };
}

test('辐能低时保持交战并向玩家靠近', () => {
  const { fixture, player, enemy } = setup(10);
  fixture.run(createEnemyAiSystem({ player, width: 1920, height: 1080 }));
  assert.equal(fixture.world.get(enemy, Ai)?.mode, AI_ENGAGE);
  assert.equal(fixture.world.get(enemy, Shield)?.active, true);
  const position = fixture.world.get(enemy, Position);
  assert.ok(position !== undefined && position.x < 900);
});

test('电子压制期间不开盾，即使辐能很低', () => {
  const { fixture, player, enemy } = setup(10);
  fixture.world.set(enemy, Suppressed, { ticks: 60 });
  fixture.run(createEnemyAiSystem({ player, width: 1920, height: 1080 }));
  assert.equal(fixture.world.get(enemy, Shield)?.active, false);
  assert.equal(fixture.world.get(enemy, Ai)?.mode, AI_ENGAGE);
});

test('辐能越线时关盾排散并后撤', () => {
  const { fixture, player, enemy } = setup(90);
  fixture.run(createEnemyAiSystem({ player, width: 1920, height: 1080 }));
  assert.equal(fixture.world.get(enemy, Ai)?.mode, AI_VENT);
  assert.equal(fixture.world.get(enemy, Vent)?.active, true);
  assert.equal(fixture.world.get(enemy, Shield)?.active, false);
  const position = fixture.world.get(enemy, Position);
  assert.ok(position !== undefined && position.x > 900);
});

test('双机轮换：攻击者到换手线就让位给排散干净的同伴，同一时刻只有一架攻击', () => {
  const { fixture, player, enemy } = setup(10);
  const partner = fixture.spawnWith([
    [Position, { x: 700, y: 700 }],
    [Mecha, { faction: 1, hull: 100, maxHull: 100 }],
    [Flux, { soft: 5, hard: 0, overloadTicks: 0 }],
    [Shield, { active: false, radius: 50 }],
    [Vent, { active: true }],
    [Weapon, { cooldown: 0 }],
    [Aim, { angle: 0 }],
    [Ai, { mode: 1, timer: 0 }],
    [Suppressed, { ticks: 0 }],
  ]);
  const system = createEnemyAiSystem({ player, width: 1920, height: 1080 });
  fixture.run(system);
  const modes = [enemy, partner].map((entity) => fixture.world.get(entity, Ai)?.mode);
  assert.equal(modes.filter((mode) => mode === AI_ENGAGE).length, 1, '只能有一架攻击');

  fixture.world.set(enemy, Flux, { soft: 75, hard: 0, overloadTicks: 0 });
  fixture.run(system);
  assert.equal(fixture.world.get(partner, Ai)?.mode, AI_ENGAGE, '同伴接管');
  assert.equal(fixture.world.get(enemy, Ai)?.mode, AI_VENT, '原攻击者转入排散');
  assert.equal(fixture.world.get(enemy, Vent)?.active, true);
  assert.equal(fixture.world.get(partner, Vent)?.active, false);
});

test('交战模式才会开火，排散时不发射', () => {
  const { fixture, enemy } = setup(10);
  const weapon = createEnemyWeaponSystem();
  fixture.world.set(enemy, Ai, { mode: AI_ENGAGE });
  weapon.update(fixture.ctx);
  assert.equal(fixture.commands.size, 1);
  fixture.commands.flush(fixture.world);
  assert.equal(fixture.world.query(Position, Velocity, Projectile).length, 1);

  fixture.world.set(enemy, Ai, { mode: AI_VENT });
  fixture.world.set(enemy, Weapon, { cooldown: 0 });
  weapon.update(fixture.ctx);
  assert.equal(fixture.commands.size, 0);
});
