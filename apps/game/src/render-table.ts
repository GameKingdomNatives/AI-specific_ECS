import { interpolatePoint } from 'agent-specific_ecs/core';
import type { EntityId, World } from 'agent-specific_ecs/core';
import { Box, Bullet, Position } from '@itb/fixture';
import type { RenderItem } from 'agent-specific_ecs/ports';
import type { SceneAssets } from 'agent-specific_ecs/scene';

export interface RenderTableContext {
  readonly player: EntityId;
  readonly kills: number;
  readonly width: number;
  readonly assets: ReadonlyMap<EntityId, SceneAssets> | undefined;
  readonly url: (name: string) => string;
}

function textureFor(entity: EntityId, context: RenderTableContext): string {
  const sceneTexture = context.assets?.get(entity)?.texture;
  if (sceneTexture !== undefined) return context.url(sceneTexture);
  return entity === context.player ? context.url('player') : context.url('box');
}

/** 世界 → 渲染表：箱子/子弹插值 + 文本夹具；编辑器/调试都只读这里的结果。 */
export function renderTable(
  world: World,
  alpha: number,
  previous: Map<EntityId, { x: number; y: number }>,
  context: RenderTableContext,
): RenderItem[] {
  const items: RenderItem[] = [];
  for (const entity of world.query(Position, Box)) {
    const position = world.get(entity, Position);
    const box = world.get(entity, Box);
    if (position === undefined || box === undefined) continue;
    const point = interpolatePoint(previous.get(entity), position, alpha);
    items.push({
      id: entity,
      x: point.x,
      y: point.y,
      rot: 0,
      sx: box.size,
      sy: box.size,
      layer: 4,
      shape: 'rect',
      tint: entity === context.player ? 0xffaa66 : 0xf0f0f0,
      alpha: 0.92,
      visible: true,
      texture: textureFor(entity, context),
    });
  }
  for (const entity of world.query(Position, Bullet)) {
    const position = world.get(entity, Position);
    if (position === undefined) continue;
    const point = interpolatePoint(previous.get(entity), position, alpha);
    items.push({
      id: entity,
      x: point.x,
      y: point.y,
      rot: 0,
      sx: 14,
      sy: 14,
      layer: 3,
      shape: 'circle',
      tint: 0xffffff,
      alpha: 1,
      visible: true,
      texture: context.url('bullet'),
    });
  }
  items.push({ id: -1, x: context.width / 2, y: 70, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xffaa66, alpha: 1, visible: true, text: `KILLS ${context.kills}`, font: 'monospace', fontSize: 28 });
  return items;
}
