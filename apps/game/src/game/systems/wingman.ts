/**
 * 僚机系统：把纯决策层（wingman-model.ts）的结果落成世界里的移动与状态。
 *
 * 只做三件事：找最近敌机 → 问决策层 → 位移/朝向/排散开关。
 * 不写事件、不改别的实体；开火留到下一个检查点（先保证可读与不挡线）。
 */
import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import { Position } from 'agent-specific_ecs/data';
import { Aim, Flux, Mecha, Vent, Wingman } from '../components.js';
import { fluxTotal } from '../flux-model.js';
import { planWingman, WING_SPEED, WING_VENT, type WingPoint } from '../wingman-model.js';

export interface WingmanOptions {
  readonly player: EntityId;
  readonly width: number;
  readonly height: number;
  readonly speed?: number;
  readonly margin?: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function nearestTo(self: WingPoint, ctx: SystemContext): WingPoint | undefined {
  let best: WingPoint | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entity of ctx.world.query(Position, Mecha)) {
    const mecha = ctx.world.get(entity, Mecha);
    const position = ctx.world.get(entity, Position);
    if (mecha === undefined || position === undefined || mecha.faction === 0) continue;
    const distance = Math.hypot(position.x - self.x, position.y - self.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: position.x, y: position.y };
    }
  }
  return best;
}

function stepToward(self: WingPoint, target: WingPoint, speed: number): WingPoint {
  const dx = target.x - self.x;
  const dy = target.y - self.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return self;
  const step = Math.min(speed, distance);
  return { x: self.x + (dx / distance) * step, y: self.y + (dy / distance) * step };
}

export function createWingmanSystem(options: WingmanOptions): SystemDef {
  const speed = options.speed ?? WING_SPEED;
  const margin = options.margin ?? 24;
  return {
    name: 'game.wingman',
    phase: 'ai',
    reads: [Position, Mecha, Flux, Wingman, Vent],
    writes: [Position, Aim, Wingman, Vent],
    update: (ctx) => {
      const playerPosition = ctx.world.get(options.player, Position);
      if (playerPosition === undefined) return;
      const player: WingPoint = { x: playerPosition.x, y: playerPosition.y };
      for (const entity of ctx.world.query(Position, Wingman)) {
        const position = ctx.world.get(entity, Position);
        const flux = ctx.world.get(entity, Flux);
        if (position === undefined) continue;
        const self: WingPoint = { x: position.x, y: position.y };
        const enemy = nearestTo(self, ctx);
        const plan = planWingman({ player, self, flux: flux === undefined ? 0 : fluxTotal(flux), ...(enemy === undefined ? {} : { enemy }) });
        const next = stepToward(self, plan.target, speed);
        ctx.world.set(entity, Position, { x: clamp(next.x, margin, options.width - margin), y: clamp(next.y, margin, options.height - margin) });
        ctx.world.set(entity, Wingman, { mode: plan.mode, timer: 0 });
        ctx.world.set(entity, Vent, { active: plan.mode === WING_VENT });
        const facing = enemy ?? plan.target;
        ctx.world.set(entity, Aim, { angle: Math.atan2(facing.y - next.y, facing.x - next.x) });
      }
    },
  };
}
