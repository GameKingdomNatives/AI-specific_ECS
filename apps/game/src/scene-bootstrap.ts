import type { ComponentDef, EntityId, SystemDef, World } from '@itb/engine/core';
import type { LoadedScene } from './scene-runtime.js';
import { buildSceneSchedule } from './scene-runtime.js';

/**
 * scene 成功加载时 player 节点存在就用它；缺失则返回 null（不静默补建）。
 * 只有 scene 整体不可用（降级路径）才按旧方式补一个玩家。
 */
export function resolvePlayer(
  world: World,
  loaded: LoadedScene | null,
  defs: { readonly position: ComponentDef; readonly box: ComponentDef },
  width: number,
  height: number,
): EntityId | null {
  if (loaded !== null) return loaded.entities.get('player') ?? null;
  const entity = world.spawn();
  world.add(entity, defs.position, { x: width / 2, y: height / 2 });
  world.add(entity, defs.box, { size: 22, tint: 0xff8844 });
  return entity;
}

/** scene 系统清单可用时按它排序；未知 id/环等 issues 存在时退回代码顺序。 */
export function pickSystems(baseSystems: readonly SystemDef[], loaded: LoadedScene | null): readonly SystemDef[] {
  if (loaded === null) return baseSystems;
  const schedule = buildSceneSchedule(loaded.scene, baseSystems);
  return schedule.issues.length === 0 ? schedule.systems : baseSystems;
}
