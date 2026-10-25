import assert from 'node:assert/strict';
import test from 'node:test';
import { Position, Velocity } from '@itb/fixture';
import { Projectile } from '../src/game/components.js';
import { createProjectileSystem } from '../src/game/systems/projectile.js';
import { createFixture } from './harness.js';

test('弹丸按速度前进，出界即回收', () => {
  const fixture = createFixture();
  const bullet = fixture.spawnWith([
    [Position, { x: 100, y: 100 }],
    [Velocity, { x: 10, y: 0 }],
    [Projectile, { damage: 5, faction: 0 }],
  ]);
  const system = createProjectileSystem({ width: 400, height: 300 });
  fixture.run(system);
  assert.equal(fixture.world.get(bullet, Position)?.x, 110);

  fixture.world.set(bullet, Position, { x: 430, y: 100 });
  fixture.run(system);
  assert.equal(fixture.world.isAlive(bullet), false);
});
