import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import { Position } from '@itb/fixture';
import { Ai, Aim, Flux, Mecha, Shield, Suppressed, Vent } from '../components.js';
import { fluxTotal, isOverloaded } from '../flux-model.js';

export interface EnemyAiOptions {
  readonly player: EntityId;
  readonly width: number;
  readonly height: number;
  readonly preferredRange?: number;
  readonly ventThreshold?: number;
  readonly speed?: number;
  readonly margin?: number;
}

export const AI_ENGAGE = 0;
export const AI_VENT = 1;

interface Tuning {
  readonly range: number;
  readonly ventAt: number;
  readonly speed: number;
  readonly width: number;
  readonly height: number;
  readonly margin: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function isSuppressed(ctx: SystemContext, entity: EntityId): boolean {
  const suppressed = ctx.world.get(entity, Suppressed);
  return suppressed !== undefined && suppressed.ticks > 0;
}

function stepToward(ctx: SystemContext, entity: EntityId, position: { x: number; y: number }, nx: number, ny: number, speed: number, tuning: Tuning): void {
  ctx.world.set(entity, Position, {
    x: clamp(position.x + nx * speed, tuning.margin, tuning.width - tuning.margin),
    y: clamp(position.y + ny * speed, tuning.margin, tuning.height - tuning.margin),
  });
}

/** 单机决策：辐能越线就排散后撤，否则压入射程带；所有输入都来自世界状态，无随机。 */
function updateOne(ctx: SystemContext, entity: EntityId, position: { x: number; y: number }, target: { x: number; y: number }, flux: { soft: number; hard: number; overloadTicks: number }, tuning: Tuning): void {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy) || 1;
  const venting = fluxTotal(flux) >= tuning.ventAt || isOverloaded(flux);
  ctx.world.set(entity, Ai, { mode: venting ? AI_VENT : AI_ENGAGE });
  ctx.world.set(entity, Vent, { active: venting });
  ctx.world.set(entity, Shield, { active: !venting && !isSuppressed(ctx, entity) });
  ctx.world.set(entity, Aim, { angle: Math.atan2(dy, dx) });
  const near = distance < tuning.range * 0.7;
  const far = distance > tuning.range;
  const dir = venting ? -1 : far ? 1 : near ? -1 : 0;
  if (dir === 0) return;
  const speed = venting ? tuning.speed * 0.8 : tuning.speed;
  stepToward(ctx, entity, position, (dx / distance) * dir, (dy / distance) * dir, speed, tuning);
}

/**
 * 敌机 AI：只看得到位置与辐能，不看玩家输入。
 * 辐能越过阈值就关盾排散并后撤；否则压到射程带里对射。
 */
export function createEnemyAiSystem(options: EnemyAiOptions): SystemDef {
  const tuning: Tuning = {
    range: options.preferredRange ?? 380,
    ventAt: options.ventThreshold ?? 70,
    speed: options.speed ?? 5,
    width: options.width,
    height: options.height,
    margin: options.margin ?? 50,
  };
  return {
    name: 'game.enemyAi',
    phase: 'ai',
    reads: [Position, Flux, Mecha, Ai, Suppressed],
    writes: [Position, Aim, Shield, Vent, Ai],
    update: (ctx) => {
      const target = ctx.world.get(options.player, Position);
      if (target === undefined) return;
      for (const entity of ctx.world.query(Mecha, Flux, Ai)) {
        const mecha = ctx.world.get(entity, Mecha);
        const position = ctx.world.get(entity, Position);
        const flux = ctx.world.get(entity, Flux);
        if (mecha === undefined || position === undefined || flux === undefined) continue;
        if (mecha.faction === 0) continue;
        updateOne(ctx, entity, position, target, flux, tuning);
      }
    },
  };
}
