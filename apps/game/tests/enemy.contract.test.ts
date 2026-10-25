import assert from 'node:assert/strict';
import test from 'node:test';
import { Position, Velocity } from '@itb/fixture';
import { Ai, Aim, Flux, Mecha, Projectile, Shield, Vent, Weapon } from '../src/game/components.js';
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

test('辐能越线时关盾排散并后撤', () => {
  const { fixture, player, enemy } = setup(90);
  fixture.run(createEnemyAiSystem({ player, width: 1920, height: 1080 }));
  assert.equal(fixture.world.get(enemy, Ai)?.mode, AI_VENT);
  assert.equal(fixture.world.get(enemy, Vent)?.active, true);
  assert.equal(fixture.world.get(enemy, Shield)?.active, false);
  const position = fixture.world.get(enemy, Position);
  assert.ok(position !== undefined && position.x > 900);
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
