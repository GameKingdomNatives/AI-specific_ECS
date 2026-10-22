import type { EntityId, SystemDef } from '@itb/engine/core';
import type { InputSnapshot, IPhysics } from '@itb/engine/ports';
import type { Scene, SystemParams } from '@itb/engine/scene';
import { createContactEvents, createPhysicsBridge } from '@itb/engine/bridge';
import { Box, createBoxSpawnerSystem, createBulletCleanupSystem,
  createBulletMovementSystem,
  createHitSystem,
  createMovementSystem,
  createWeaponSystem,
  Position,
} from '@itb/engine/demo';

export interface SystemDeps {
  readonly width: number;
  readonly height: number;
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
  readonly physics: IPhysics;
}

const PLAYER_SPEED = 10;

function numberParam(params: SystemParams | undefined, key: string, fallback: number): number {
  const value = params?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** 从 scene 的系统清单提取参数，供 createSystems 按系统消费。 */
export function createSceneSystems(deps: SystemDeps, scene: Scene | null): SystemDef[] {
  const params: Record<string, SystemParams> = {};
  for (const system of scene?.systems ?? []) {
    if (system.params !== undefined) params[system.id] = system.params;
  }
  return createSystems(deps, params);
}

function createPlayerSystem(player: EntityId, getInput: () => InputSnapshot, speed: number): SystemDef {
  return {
    name: 'demo.player',
    phase: 'ai',
    reads: [Position],
    writes: [Position],
    update: (ctx) => {
      const position = ctx.world.get(player, Position);
      if (position === undefined) return;
      const pointer = getInput().pointer;
      const dx = pointer.x - position.x;
      const dy = pointer.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) return;
      ctx.world.set(player, Position, {
        x: position.x + (dx / distance) * speed,
        y: position.y + (dy / distance) * speed,
      });
    },
  };
}

/** 系统注册表：主循环与探针页共用同一份定义，避免两套行为分叉。 */
export function createSystems(deps: SystemDeps, params: Readonly<Record<string, SystemParams>> = {}): SystemDef[] {
  const playerSpeed = numberParam(params['demo.player'], 'speed', PLAYER_SPEED);
  return [
    createBoxSpawnerSystem({
      width: deps.width,
      height: deps.height,
      onSpawn: (node, count) => {
        const scene = globalThis.__itbScene;
        if (scene === undefined) return;
        const nodeId = Object.entries(scene.entities).find(([, entity]) => entity === node)?.[0] ?? String(node);
        scene.spawned[nodeId] = count;
      },
    }),
    createMovementSystem(deps.width, deps.height),
    createBulletMovementSystem(deps.width, deps.height, { after: ['demo.movement'] }),
    createPlayerSystem(deps.player, deps.getInput, playerSpeed),
    createWeaponSystem({
      player: deps.player,
      getInput: deps.getInput,
      after: ['demo.player'],
      cooldownTicks: numberParam(params['demo.weapon'], 'cooldownTicks', 6),
      speed: numberParam(params['demo.weapon'], 'speed', 14),
    }),
    createPhysicsBridge(deps.physics, { position: Position, box: Box }),
    createContactEvents(deps.physics),
    createHitSystem(deps.physics, { player: deps.player }),
    createBulletCleanupSystem(deps.width, deps.height),
  ];
}
