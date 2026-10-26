import type { Scene } from 'agent-specific_ecs/scene';

/** 场景/玩家来源的一行标签，只给状态行用。 */
export function sceneLabel(loaded: { readonly scene: Scene } | null): string {
  return loaded === null ? 'fallback' : loaded.scene.name;
}

export function playerLabel(player: number): string {
  return player < 0 ? 'missing' : 'ok';
}
