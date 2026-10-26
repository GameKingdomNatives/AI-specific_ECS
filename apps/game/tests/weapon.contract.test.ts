import assert from 'node:assert/strict';
import test from 'node:test';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { Position } from '@itb/fixture';
import { Aim, Flux, Projectile, Support, Terminator, Vent, Weapon } from '../src/game/components.js';
import { createPlayerWeaponSystem, createSupportSystem, createTerminatorSystem } from '../src/game/systems/weapon.js';
import { createFixture } from './harness.js';

function fireInput(pointer = { x: 300, y: 100 }): InputSnapshot {
  return { tick: 1, keys: new Set(['fire']), pointer, buttons: new Set([0]) };
}

function setup(soft = 0) {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 100, y: 100 }],
    [Aim, { angle: 0 }],
    [Flux, { soft, hard: 0, overloadTicks: 0 }],
    [Weapon, { cooldown: 0 }],
    [Vent, { active: false }],
  ]);
  return { fixture, player };
}

test('按住左键发射一颗弹丸，并产生软辐能与装填', () => {
  const { fixture, player } = setup();
  const system = createPlayerWeaponSystem({ player, getInput: () => fireInput() });
  system.update(fixture.ctx);
  assert.equal(fixture.commands.size, 1);
  fixture.commands.flush(fixture.world);
  assert.equal(fixture.world.query(Position, Projectile).length, 1);
  assert.equal(fixture.world.get(fixture.world.query(Position, Projectile)[0]!, Projectile)?.slot, 0);
  assert.ok((fixture.world.get(player, Flux)?.soft ?? 0) > 0);
  assert.ok((fixture.world.get(player, Weapon)?.cooldown ?? 0) > 0);
});

test('终结武器：按键发射、软辐能大幅上升、装填变长', () => {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 100, y: 100 }],
    [Aim, { angle: 0 }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Terminator, { cooldown: 0 }],
    [Vent, { active: false }],
  ]);
  const input: InputSnapshot = { tick: 1, keys: new Set(['terminator']), pointer: { x: 300, y: 100 }, buttons: new Set<number>() };
  const system = createTerminatorSystem({ player, getInput: () => input });
  system.update(fixture.ctx);
  assert.equal(fixture.commands.size, 1);
  fixture.commands.flush(fixture.world);
  assert.equal(fixture.world.query(Position, Projectile).length, 1);
  assert.equal(fixture.world.get(fixture.world.query(Position, Projectile)[0]!, Projectile)?.slot, 1);
  assert.ok((fixture.world.get(player, Flux)?.soft ?? 0) >= 12);
  assert.ok((fixture.world.get(player, Terminator)?.cooldown ?? 0) >= 90);
});

test('支援武器：发射电子战弹（effect=1）', () => {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 100, y: 100 }],
    [Aim, { angle: 0 }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Support, { cooldown: 0 }],
    [Vent, { active: false }],
  ]);
  const input: InputSnapshot = { tick: 1, keys: new Set(['support']), pointer: { x: 300, y: 100 }, buttons: new Set<number>() };
  const system = createSupportSystem({ player, getInput: () => input });
  fixture.run(system);
  const bullets = fixture.world.query(Position, Projectile);
  assert.equal(bullets.length, 1);
  const bullet = bullets[0];
  assert.ok(bullet !== undefined);
  assert.equal(fixture.world.get(bullet, Projectile)?.effect, 1);
  assert.equal(fixture.world.get(bullet, Projectile)?.slot, 2);
});

test('过载或排散期间不发射', () => {
  const { fixture, player } = setup();
  fixture.world.set(player, Flux, { soft: 0, hard: 0, overloadTicks: 30 });
  const overloaded = createPlayerWeaponSystem({ player, getInput: () => fireInput() });
  overloaded.update(fixture.ctx);
  assert.equal(fixture.commands.size, 0);

  fixture.world.set(player, Flux, { soft: 0, hard: 0, overloadTicks: 0 });
  fixture.world.set(player, Vent, { active: true });
  const venting = createPlayerWeaponSystem({ player, getInput: () => fireInput() });
  venting.update(fixture.ctx);
  assert.equal(fixture.commands.size, 0);
});
