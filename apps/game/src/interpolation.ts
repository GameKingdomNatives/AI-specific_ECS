import type { EntityId, World } from 'agent-specific_ecs/core';
import { Bullet } from '@itb/fixture';
import { Box, Position } from 'agent-specific_ecs/data';
import type { Point } from 'agent-specific_ecs/core';
import { Projectile } from './game/components.js';

/** 采集本帧渲染起点（用于渲染插值）；只读世界，不参与逻辑。 */
export function capturePoses(world: World): Map<EntityId, Point> {
  const poses = new Map<EntityId, Point>();
  for (const entity of world.query(Position, Box)) {
    const position = world.get(entity, Position);
    if (position !== undefined) {
      poses.set(entity, { x: position.x, y: position.y });
    }
  }
  for (const entity of world.query(Position, Bullet)) {
    const position = world.get(entity, Position);
    if (position !== undefined) {
      poses.set(entity, { x: position.x, y: position.y });
    }
  }
  for (const entity of world.query(Position, Projectile)) {
    const position = world.get(entity, Position);
    if (position !== undefined) {
      poses.set(entity, { x: position.x, y: position.y });
    }
  }
  return poses;
}
