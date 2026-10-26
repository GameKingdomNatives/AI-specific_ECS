import assert from 'node:assert/strict';
import test from 'node:test';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { Position } from '@itb/fixture';
import { Aim, Flux, Shield, Suppressed, Vent } from '../src/game/components.js';
import { createMechaControlSystem } from '../src/game/systems/controls.js';
import { createFixture } from './harness.js';

function input(keys: string[], buttons: number[], pointer = { x: 0, y: 0 }): InputSnapshot {
  return { tick: 1, keys: new Set(keys), pointer, buttons: new Set(buttons) };
}

test('WASD 位移按 tick 推进，指针决定朝向', () => {
  const fixture = createFixture();
  const player = fixture.spawnWith([[Position, { x: 100, y: 100 }], [Flux, { soft: 0, hard: 0, overloadTicks: 0 }], [Shield, { active: false, radius: 40 }], [Vent, { active: false }], [Aim, { angle: 0 }], [Suppressed, { ticks: 0 }]]);
  const system = createMechaControlSystem({ player, getInput: () => input(['right', 'down'], [], { x: 300, y: 100 }), width: 800, height: 600, speed: 10 });
  fixture.run(system);
  const position = fixture.world.get(player, Position);
  assert.ok(position !== undefined);
  assert.ok(position.x > 100 && position.y > 100);
  const aim = fixture.world.get(player, Aim);
  assert.equal(aim?.angle, 0);
  assert.equal(fixture.world.get(player, Shield)?.active, false);
});

test('电子压制期间空格也不能开盾', () => {
  const fixture = createFixture();
  const player = fixture.spawnWith([[Position, { x: 100, y: 100 }], [Flux, { soft: 0, hard: 0, overloadTicks: 0 }], [Shield, { active: false, radius: 40 }], [Vent, { active: false }], [Aim, { angle: 0 }], [Suppressed, { ticks: 60 }]]);
  const system = createMechaControlSystem({ player, getInput: () => input(['shield'], [], { x: 100, y: 300 }), width: 800, height: 600 });
  fixture.run(system);
  assert.equal(fixture.world.get(player, Shield)?.active, false);
});

test('空格开盾、V 排散，过载时两者都被拒绝；右键不再开盾', () => {
  const fixture = createFixture();
  const player = fixture.spawnWith([[Position, { x: 100, y: 100 }], [Flux, { soft: 0, hard: 0, overloadTicks: 0 }], [Shield, { active: false, radius: 40 }], [Vent, { active: false }], [Aim, { angle: 0 }]]);
  const system = createMechaControlSystem({ player, getInput: () => input(['shield', 'vent'], [], { x: 100, y: 300 }), width: 800, height: 600 });
  fixture.run(system);
  assert.equal(fixture.world.get(player, Shield)?.active, true);
  assert.equal(fixture.world.get(player, Vent)?.active, true);

  const rightClick = createMechaControlSystem({ player, getInput: () => input([], [2], { x: 100, y: 300 }), width: 800, height: 600 });
  fixture.run(rightClick);
  assert.equal(fixture.world.get(player, Shield)?.active, false);

  fixture.world.set(player, Flux, { soft: 0, hard: 0, overloadTicks: 10 });
  fixture.run(system);
  assert.equal(fixture.world.get(player, Shield)?.active, false);
  assert.equal(fixture.world.get(player, Vent)?.active, false);
});
