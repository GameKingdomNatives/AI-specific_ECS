import type { SystemDef } from 'agent-specific_ecs/core';
import { Position, Velocity } from '@itb/fixture';
import { Projectile } from '../components.js';

/** 弹丸直线飞行；出界即回收，不参与反弹，避免弹幕实体无限堆积。 */
export function createProjectileSystem(options: { readonly width: number; readonly height: number }): SystemDef {
  return {
    name: 'game.projectiles',
    phase: 'movement',
    reads: [Position, Velocity, Projectile],
    writes: [Position],
    update: (ctx) => {
      for (const entity of ctx.world.query(Position, Velocity, Projectile)) {
        const position = ctx.world.get(entity, Position);
        const velocity = ctx.world.get(entity, Velocity);
        if (position === undefined || velocity === undefined) continue;
        const x = position.x + velocity.x;
        const y = position.y + velocity.y;
        if (x < -32 || x > options.width + 32 || y < -32 || y > options.height + 32) {
          ctx.commands.despawn(entity);
          continue;
        }
        ctx.world.set(entity, Position, { x, y });
      }
    },
  };
}
