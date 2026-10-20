import { defineComponent } from '../core/types.js';
import type { SystemDef } from '../core/scheduler.js';
import type { World } from '../core/world.js';

/** 技术夹具用组件：不是游戏内容，只用来证明管线通。 */
export const Position = defineComponent('Position', { x: 'f64', y: 'f64' });
export const Velocity = defineComponent('Velocity', { x: 'f64', y: 'f64' });
export const Box = defineComponent('Box', { size: 'f32', tint: 'u32' });

export function createMovementSystem(worldWidth: number, worldHeight: number): SystemDef {
  return {
    name: 'demo.movement',
    phase: 'movement',
    reads: [Velocity],
    writes: [Position],
    update: (ctx) => {
      const entities = ctx.world.query(Position, Velocity);
      for (const entity of entities) {
        const position = ctx.world.get(entity, Position);
        const velocity = ctx.world.get(entity, Velocity);
        if (position === undefined || velocity === undefined) {
          continue;
        }
        const nextX = bounce(position.x + velocity.x, worldWidth);
        const nextY = bounce(position.y + velocity.y, worldHeight);
        ctx.world.set(entity, Position, { x: nextX, y: nextY });
        if (nextX !== position.x + velocity.x) {
          ctx.world.set(entity, Velocity, { x: -velocity.x });
        }
        if (nextY !== position.y + velocity.y) {
          ctx.world.set(entity, Velocity, { y: -velocity.y });
        }
      }
    },
  };
}

function bounce(value: number, limit: number): number {
  if (value < 0) {
    return -value;
  }
  if (value > limit) {
    return limit - (value - limit);
  }
  return value;
}

export function spawnBoxes(world: World, count: number, width: number, height: number): void {
  for (let index = 0; index < count; index += 1) {
    const entity = world.spawn();
    world.add(entity, Position, {
      x: (index * 37) % width,
      y: (index * 61) % height,
    });
    world.add(entity, Velocity, { x: 1 + (index % 3), y: 0.5 + (index % 2) });
    world.add(entity, Box, { size: 8 + (index % 3) * 2, tint: 0xffffff });
  }
}
