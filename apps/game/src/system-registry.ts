import type { EntityId, SystemDef } from '@itb/engine/core';
import type { InputSnapshot } from '@itb/engine/ports';
import { createMovementSystem, Position } from '@itb/engine/demo';

export interface SystemDeps {
  readonly width: number;
  readonly height: number;
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
}

const PLAYER_SPEED = 10;

/** 系统注册表：主循环与探针页共用同一份定义，避免两套行为分叉。 */
export function createSystems(deps: SystemDeps): SystemDef[] {
  const playerSystem: SystemDef = {
    name: 'demo.player',
    phase: 'ai',
    reads: [Position],
    writes: [Position],
    update: (ctx) => {
      const position = ctx.world.get(deps.player, Position);
      if (position === undefined) {
        return;
      }
      const pointer = deps.getInput().pointer;
      const dx = pointer.x - position.x;
      const dy = pointer.y - position.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 4) {
        return;
      }
      ctx.world.set(deps.player, Position, {
        x: position.x + (dx / distance) * PLAYER_SPEED,
        y: position.y + (dy / distance) * PLAYER_SPEED,
      });
    },
  };
  return [createMovementSystem(deps.width, deps.height), playerSystem];
}
