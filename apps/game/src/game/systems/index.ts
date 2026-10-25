import type { EntityId, SystemDef } from 'agent-specific_ecs/core';
import type { IPhysics, InputSnapshot } from 'agent-specific_ecs/ports';
import { createCombatSystem } from './combat.js';
import { createMechaControlSystem } from './controls.js';
import { createEnemyAiSystem } from './enemy.js';
import { createFluxSystem } from './flux.js';
import { createProjectileSystem } from './projectile.js';
import { createEnemyWeaponSystem, createPlayerWeaponSystem, type WeaponSpec } from './weapon.js';

export { AI_ENGAGE, AI_VENT, createEnemyAiSystem } from './enemy.js';
export { createMechaControlSystem } from './controls.js';
export { createFluxSystem } from './flux.js';
export { createCombatSystem } from './combat.js';
export { createProjectileSystem } from './projectile.js';
export { createEnemyWeaponSystem, createPlayerWeaponSystem } from './weapon.js';
export type { WeaponSpec } from './weapon.js';

export interface GameSystemDeps {
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
  readonly physics: IPhysics;
  readonly width: number;
  readonly height: number;
  readonly playerWeapon?: WeaponSpec;
  readonly enemyWeapon?: WeaponSpec;
}

/**
 * 游戏内容系统集合：与夹具系统各自成组，由 scene 清单决定实际启用哪些。
 * 顺序关系由 scene 的 after 声明，不在工厂里写死，避免探针页只跑单系统时依赖缺失。
 */
export function createGameSystems(deps: GameSystemDeps): SystemDef[] {
  return [
    createMechaControlSystem({ player: deps.player, getInput: deps.getInput, width: deps.width, height: deps.height }),
    createFluxSystem(),
    createPlayerWeaponSystem({ player: deps.player, getInput: deps.getInput, ...(deps.playerWeapon === undefined ? {} : { spec: deps.playerWeapon }) }),
    createEnemyAiSystem({ player: deps.player, width: deps.width, height: deps.height }),
    createEnemyWeaponSystem(deps.enemyWeapon === undefined ? {} : { spec: deps.enemyWeapon }),
    createProjectileSystem({ width: deps.width, height: deps.height }),
    createCombatSystem({ physics: deps.physics }),
  ];
}
