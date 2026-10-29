import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { Scheduler, World } from 'agent-specific_ecs/core';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { createPhysicsPort, PhysicsWorld } from 'agent-specific_ecs/physics';
import { parseScene } from 'agent-specific_ecs/scene';
import { pickSystems } from '../src/scene-bootstrap.js';
import { componentLookup } from '../src/scene-components.js';
import { buildSceneSchedule, instantiateSceneState } from '../src/scene-runtime.js';
import { createSystems } from '../src/system-registry.js';

const sceneDir = join(process.cwd(), 'apps', 'game', 'scenes');
const idle: InputSnapshot = { tick: 0, keys: new Set(), pointer: { x: 0, y: 0 }, buttons: new Set() };

function sceneFiles() {
  return readdirSync(sceneDir).filter((file) => file.endsWith('.scene.json'));
}

/**
 * 场景里的 systems 清单只有调度器 build 时才校验组件读写冲突——
 * 冲突会让 main.ts 在启动时抛错、整局退回夹具路径，所以必须在测试里 build 一次。
 */
test('每个随仓库发布的场景都能装出可 build 的调度器，且场景清单没有 issues', () => {
  for (const file of sceneFiles()) {
    const parsed = parseScene(JSON.parse(readFileSync(join(sceneDir, file), 'utf8')));
    assert.ok(parsed.ok, `${file} 解析失败`);
    const world = new World();
    const state = instantiateSceneState(world, parsed.value, componentLookup);
    assert.equal(state.issues.length, 0, `${file} 实例化 issues：${state.issues.map((issue) => issue.message).join('; ')}`);
    const player = state.loaded.entities.get('player') ?? 0;
    const deps = { width: 1920, height: 1080, player, getInput: () => idle, physics: createPhysicsPort(new PhysicsWorld()) };
    const base = createSystems(deps);
    const schedule = buildSceneSchedule(parsed.value, base);
    assert.equal(schedule.issues.length, 0, `${file} 系统清单 issues：${schedule.issues.map((issue) => issue.message).join('; ')}`);
    const scheduler = new Scheduler();
    for (const system of pickSystems(base, state.loaded)) scheduler.add(system);
    assert.doesNotThrow(() => scheduler.build(), `${file} 调度器 build 失败（同阶段组件读写冲突需要 before/after）`);
  }
});

test('flux-core 的实际执行顺序里，僚机排在敌机决策与敌机武器之后', () => {
  const file = join(sceneDir, 'flux-core.scene.json');
  const parsed = parseScene(JSON.parse(readFileSync(file, 'utf8')));
  assert.ok(parsed.ok);
  const world = new World();
  const state = instantiateSceneState(world, parsed.value, componentLookup);
  const deps = { width: 1920, height: 1080, player: state.loaded.entities.get('player') ?? 0, getInput: () => idle, physics: createPhysicsPort(new PhysicsWorld()) };
  const scheduler = new Scheduler();
  for (const system of pickSystems(createSystems(deps), state.loaded)) scheduler.add(system);
  scheduler.build();
  const order = scheduler.orderNames;
  const wingman = order.indexOf('game.wingman');
  assert.ok(wingman >= 0, '场景必须启用 game.wingman');
  assert.ok(wingman > order.indexOf('game.enemyAi'), '僚机必须排在敌机决策之后');
  assert.ok(wingman > order.indexOf('game.enemyWeapon'), '僚机必须排在敌机武器之后（同阶段都碰 Aim）');
});
