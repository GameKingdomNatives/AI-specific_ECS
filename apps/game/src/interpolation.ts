import type { EntityId, World } from 'agent-specific_ecs/core';
import { Box, Bullet, Position } from '@itb/fixture';
import type { Point } from 'agent-specific_ecs/core';

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
  return poses;
}
