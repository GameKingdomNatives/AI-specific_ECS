import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntityId, SystemDef } from 'agent-specific_ecs/core';
import { Position } from 'agent-specific_ecs/data';
import { Ai, Aim, Flux, Mecha, Shield, Suppressed, Vent, Weapon } from '../src/game/components.js';
import { AI_ENGAGE } from '../src/game/engagement.js';
import { isOverloaded } from '../src/game/flux-model.js';
import { createEnemyAiSystem } from '../src/game/systems/enemy.js';
import { createFluxSystem } from '../src/game/systems/flux.js';
import { createFixture, type Fixture } from './harness.js';

/** 敌机每 16 tick 开一发（heat 9）；用于把「开火产辐 > 消散」灌进长时间仿真。 */
const FIRE_PERIOD = 16;
const FIRE_HEAT = 9;
const TICKS = 2400;
const KILL_AT = 1200;

function spawnEnemy(fixture: Fixture, x: number, y: number): EntityId {
  return fixture.spawnWith([
    [Position, { x, y }],
    [Mecha, { faction: 1, hull: 140, maxHull: 140 }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Shield, { active: false, radius: 50 }],
    [Vent, { active: false }],
    [Weapon, { cooldown: 0 }],
    [Aim, { angle: 0 }],
    [Ai, { mode: 0, timer: 0 }],
    [Suppressed, { ticks: 0 }],
  ]);
}

function attackersOf(fixture: Fixture, ids: readonly EntityId[]): EntityId[] {
  return ids.filter((id) => fixture.world.get(id, Ai)?.mode === AI_ENGAGE);
}

function anyOverloaded(fixture: Fixture, ids: readonly EntityId[]): boolean {
  return ids.some((id) => {
    const flux = fixture.world.get(id, Flux);
    return flux !== undefined && isOverloaded(flux);
  });
}

/** 攻击者每 FIRE_PERIOD 开一发：灌入产辐，让换手真的会发生。 */
function maybeFire(fixture: Fixture, alive: readonly EntityId[], tick: number): void {
  if (tick % FIRE_PERIOD !== 0) return;
  const attacker = attackersOf(fixture, alive)[0];
  if (attacker === undefined) return;
  const flux = fixture.world.get(attacker, Flux);
  if (flux === undefined) return;
  fixture.world.set(attacker, Flux, { soft: flux.soft + FIRE_HEAT, hard: flux.hard, overloadTicks: flux.overloadTicks });
}

function kill(fixture: Fixture, id: EntityId): void {
  fixture.commands.despawn(id);
  fixture.commands.flush(fixture.world);
}

function createSimulation() {
  const fixture = createFixture();
  const player = fixture.spawnWith([
    [Position, { x: 960, y: 540 }],
    [Mecha, { faction: 0, hull: 100, maxHull: 100 }],
  ]);
  const alive: EntityId[] = [spawnEnemy(fixture, 1380, 760), spawnEnemy(fixture, 220, 760)];
  const systems: SystemDef[] = [createEnemyAiSystem({ player, width: 1920, height: 1080 }), createFluxSystem()];
  return { fixture, alive, systems };
}

test('2400 tick 仿真：始终至多一个攻击者，且没有单位永久卡在排散态', () => {
  const { fixture, alive, systems } = createSimulation();
  let handoffs = 0;
  let previous: EntityId | undefined;
  let idleRun = 0;
  let maxIdle = 0;

  for (let tick = 0; tick < TICKS; tick++) {
    // 第 KILL_AT tick 打死一架：验证「场上只剩一架」不再卡死（2026-10-27 实跑缺陷）。
    if (tick === KILL_AT) {
      kill(fixture, alive[1] as EntityId);
      alive.length = 1;
      idleRun = 0;
    }
    maybeFire(fixture, alive, tick);
    for (const system of systems) fixture.run(system);

    const attackers = attackersOf(fixture, alive);
    assert.ok(attackers.length <= 1, `tick ${tick}: 出现 ${attackers.length} 个攻击者`);
    const current = attackers[0];
    if (current !== undefined && previous !== undefined && current !== previous) handoffs += 1;
    previous = current ?? previous;
    const idle = current === undefined && !anyOverloaded(fixture, alive);
    idleRun = idle ? idleRun + 1 : 0;
    maxIdle = Math.max(maxIdle, idleRun);
  }

  assert.ok(handoffs >= 2, `双机阶段至少换手 2 次，实际 ${handoffs}`);
  assert.ok(maxIdle <= 90, `无人攻击的最长空档 ${maxIdle} tick，超过 90 即视为卡死`);
});
