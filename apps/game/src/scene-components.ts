import type { ComponentDef, World } from 'agent-specific_ecs/core';
import { hashHex, worldHashGroups } from 'agent-specific_ecs/determinism';
import { BoxSpawner, Bullet } from '@itb/fixture';
import { Box, Position } from 'agent-specific_ecs/data';
import { Ai, Aim, Flux, Mecha, Projectile, Run, Shield, Support, Suppressed, Terminator, Vent, Weapon, Wingman } from './game/components.js';

/** scene 组件注册表：scene JSON 里的组件名到 ECS 定义的唯一映射。 */
const COMPONENTS: ReadonlyMap<string, ComponentDef> = new Map<string, ComponentDef>([
  ['Position', Position],
  ['Box', Box],
  ['BoxSpawner', BoxSpawner],
  ['Mecha', Mecha],
  ['Flux', Flux],
  ['Shield', Shield],
  ['Weapon', Weapon],
  ['Projectile', Projectile],
  ['Aim', Aim],
  ['Ai', Ai],
  ['Vent', Vent],
  ['Terminator', Terminator],
  ['Support', Support],
  ['Suppressed', Suppressed],
  ['Run', Run],
  ['Wingman', Wingman],
]);

export function componentLookup(name: string): ComponentDef | undefined {
  return COMPONENTS.get(name);
}

/** 世界哈希覆盖游戏状态：位置、夹具实体与辐能都进同一份指纹。 */
export function hashWorld(world: World): string {
  return hashHex(worldHashGroups(world, [[Position, Box], [Position, Bullet], [Position, Flux]]));
}
