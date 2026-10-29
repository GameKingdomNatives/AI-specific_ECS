import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { CommandBuffer, EventBus, Scheduler, World } from 'agent-specific_ecs/core';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { createPhysicsPort, PhysicsWorld } from 'agent-specific_ecs/physics';
import { parseScene } from 'agent-specific_ecs/scene';
import { Position } from 'agent-specific_ecs/data';
import { pickSystems } from '../src/scene-bootstrap.js';
import { componentLookup } from '../src/scene-components.js';
import { buildSceneSchedule, instantiateSceneState } from '../src/scene-runtime.js';
import { createSystems } from '../src/system-registry.js';
import { fluxTotal } from '../src/game/flux-model.js';
import { Flux, Mecha, Projectile, Wingman, WingSlot } from '../src/game/components.js';
import { WING_ENGAGE, WING_SPEED } from '../src/game/wingman-model.js';

const sceneFile = join(process.cwd(), 'apps', 'game', 'scenes', 'flux-core.scene.json');
const idle: InputSnapshot = { tick: 0, keys: new Set(), pointer: { x: 0, y: 0 }, buttons: new Set() };
const TICKS = 900;

interface Trace {
  modes: Set<number>;
  maxSoft: number;
  sawShot: boolean;
  aliveTicks: number;
  maxStep: number;
  losses: number;
  aliveAtEnd: boolean;
}

/** 真场景整局跑一遍：不读代码猜，直接看僚机在场景里到底开不开火、掉不掉、补不补、会不会抖。 */
test('flux-core 整局里僚机会交战开火、辐能上升、位移平滑，被击落后自动补位', () => {
  const parsed = parseScene(JSON.parse(readFileSync(sceneFile, 'utf8')));
  assert.ok(parsed.ok);
  const world = new World();
  const state = instantiateSceneState(world, parsed.value, componentLookup);
  const player = state.loaded.entities.get('player') ?? 0;
  assert.ok(state.loaded.entities.get('wingman') !== undefined, '场景必须带僚机实体');
  const deps = { width: 1920, height: 1080, player, getInput: () => idle, physics: createPhysicsPort(new PhysicsWorld()) };
  const base = createSystems(deps);
  assert.deepEqual(buildSceneSchedule(parsed.value, base).issues, []);
  const scheduler = new Scheduler();
  for (const system of pickSystems(base, state.loaded)) scheduler.add(system);
  scheduler.build();
  const trace = run(world, scheduler, player);
  assert.ok(trace.modes.has(WING_ENGAGE), '僚机必须至少进入一次交战态');
  assert.ok(trace.sawShot, '交战态必须真的打出弹丸');
  assert.ok(trace.maxSoft > 0, '开火必须留下辐能');
  assert.ok(trace.aliveTicks > TICKS * 0.6, `僚机在场 tick 太少：${trace.aliveTicks}`);
  assert.ok(trace.aliveAtEnd, '补位后必须继续在场，而不是掉一次就永久缺席');
  assert.ok(trace.losses >= 1, '整局都没被打掉过，说明敌机没在打它');
  assert.ok(trace.maxStep <= WING_SPEED + 0.001, `单 tick 位移超过航速：${trace.maxStep.toFixed(2)}`);
});

function run(world: World, scheduler: Scheduler, player: number): Trace {
  const trace: Trace = { modes: new Set(), maxSoft: 0, sawShot: false, aliveTicks: 0, maxStep: 0, losses: 0, aliveAtEnd: false };
  const commands = new CommandBuffer();
  const bus = new EventBus();
  const previous = new Map<number, { x: number; y: number }>();
  for (let tick = 1; tick <= TICKS; tick += 1) {
    scheduler.run(world, bus, commands, tick);
    keepPlayerAlive(world, player);
    observe(world, player, trace, previous);
  }
  return trace;
}

/** 本测试只考察僚机；玩家不操作会被打死，把血量顶住，别让整局提前结束。 */
function keepPlayerAlive(world: World, player: number): void {
  const mecha = world.get(player, Mecha);
  if (mecha === undefined) return;
  world.set(player, Mecha, { faction: mecha.faction, hull: mecha.maxHull, maxHull: mecha.maxHull });
}

function observe(world: World, player: number, trace: Trace, previous: Map<number, { x: number; y: number }>): void {
  const seen = new Set<number>();
  for (const entity of world.query(Position, Wingman)) {
    const position = world.get(entity, Position);
    const wingman = world.get(entity, Wingman);
    if (position === undefined || wingman === undefined || world.get(entity, Mecha) === undefined) continue;
    seen.add(entity);
    trace.modes.add(Number(wingman.mode));
    const last = previous.get(entity);
    if (last !== undefined) trace.maxStep = Math.max(trace.maxStep, Math.hypot(position.x - last.x, position.y - last.y));
    previous.set(entity, { x: position.x, y: position.y });
    const flux = world.get(entity, Flux);
    if (flux !== undefined) trace.maxSoft = Math.max(trace.maxSoft, fluxTotal(flux));
  }
  if (seen.size > 0) {
    trace.aliveTicks += 1;
    trace.aliveAtEnd = true;
  } else trace.aliveAtEnd = false;
  trace.sawShot = trace.sawShot || world.query(Position, Projectile).some((entity) => world.get(entity, Projectile)?.faction === 0);
  const slot = world.get(player, WingSlot);
  if (slot !== undefined) trace.losses = Math.max(trace.losses, Number(slot.losses));
}
