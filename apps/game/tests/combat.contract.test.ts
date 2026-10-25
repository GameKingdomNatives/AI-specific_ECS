import assert from 'node:assert/strict';
import test from 'node:test';
import { Position } from '@itb/fixture';
import { createPhysicsPort, PhysicsWorld } from 'agent-specific_ecs/physics';
import { Flux, Mecha, Projectile, Shield } from '../src/game/components.js';
import { createCombatSystem } from '../src/game/systems/combat.js';
import { createFixture } from './harness.js';

function setup(shieldActive: boolean) {
  const fixture = createFixture();
  const physics = createPhysicsPort(new PhysicsWorld());
  const target = fixture.spawnWith([
    [Position, { x: 200, y: 200 }],
    [Mecha, { faction: 1, hull: 20, maxHull: 100 }],
    [Flux, { soft: 10, hard: 10, overloadTicks: 0 }],
    [Shield, { active: shieldActive, radius: 40 }],
  ]);
  physics.addCircle(target, 200, 200, 20);
  const bullet = fixture.spawnWith([
    [Position, { x: 200, y: 200 }],
    [Projectile, { damage: 8, faction: 0 }],
  ]);
  return { fixture, physics, target, bullet };
}

test('护盾命中转硬辐能，不扣结构', () => {
  const { fixture, physics, target, bullet } = setup(true);
  const events: string[] = [];
  fixture.bus.on('game.hit', () => events.push('hit'));
  fixture.run(createCombatSystem({ physics }));
  assert.equal(fixture.world.isAlive(bullet), false);
  const flux = fixture.world.get(target, Flux);
  assert.ok(flux !== undefined && flux.hard > 10);
  assert.equal(fixture.world.get(target, Mecha)?.hull, 20);
  assert.deepEqual(events, ['hit']);
});

test('无盾命中扣结构，结构归零即销毁并发击杀事件', () => {
  const { fixture, physics, target, bullet } = setup(false);
  const kills: string[] = [];
  fixture.bus.on('game.kill', () => kills.push('kill'));
  fixture.world.set(target, Mecha, { hull: 4 });
  fixture.run(createCombatSystem({ physics }));
  assert.equal(fixture.world.isAlive(bullet), false);
  assert.equal(fixture.world.isAlive(target), false);
  assert.deepEqual(kills, ['kill']);
});
