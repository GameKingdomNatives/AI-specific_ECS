import type { EntityId, World } from '@itb/engine/core';
import { Box, Bullet, Position } from '@itb/engine/demo';
import type { Point } from '@itb/engine/core';

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
