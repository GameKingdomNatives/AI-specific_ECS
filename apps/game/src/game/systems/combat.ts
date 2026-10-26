import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import type { IPhysics } from 'agent-specific_ecs/ports';
import { Position } from '@itb/fixture';
import { Flux, Mecha, Projectile, Shield, Suppressed } from '../components.js';
import { addHard } from '../flux-model.js';

/** 压盾时长：90 tick = 1.5s。 */
export const SUPPRESS_TICKS = 90;

export interface CombatOptions {
  readonly physics: IPhysics;
  readonly radius?: number;
}

function acquire(ctx: SystemContext, physics: IPhysics, x: number, y: number, radius: number, faction: number, bullet: EntityId): EntityId | undefined {
  const hits = physics
    .queryCircle(x, y, radius)
    .filter((entity) => entity !== bullet && ctx.world.isAlive(entity))
    .sort((left, right) => left - right);
  for (const entity of hits) {
    const mecha = ctx.world.get(entity, Mecha);
    if (mecha !== undefined && mecha.faction !== faction) return entity;
  }
  return undefined;
}

function applyDamage(ctx: SystemContext, target: EntityId, damage: number, effect: number, slot: number, at: { x: number; y: number }): void {
  const mecha = ctx.world.get(target, Mecha);
  const flux = ctx.world.get(target, Flux);
  const shield = ctx.world.get(target, Shield);
  if (mecha === undefined) return;
  // 电子战：无视护盾，只把伤害转成硬辐能（支援槽的意义）。
  if (effect === 1) {
    if (flux !== undefined) {
      const next = addHard(flux, damage * 1.8);
      ctx.world.set(target, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
    }
    // 压盾：即使目标此刻没开盾，也进入 1.5s 护盾压制。
    if (ctx.world.has(target, Suppressed)) {
      ctx.world.set(target, Suppressed, { ticks: SUPPRESS_TICKS });
    }
    ctx.bus.emit('game.hit', { target, shielded: false, ew: true, slot, x: at.x, y: at.y, damage });
    return;
  }
  if (shield?.active === true && flux !== undefined) {
    const next = addHard(flux, damage * 1.25);
    ctx.world.set(target, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
    ctx.bus.emit('game.hit', { target, shielded: true, slot, x: at.x, y: at.y, damage });
    return;
  }
  const hull = mecha.hull - damage;
  if (hull <= 0) {
    ctx.world.set(target, Mecha, { hull: 0 });
    ctx.commands.despawn(target);
    ctx.bus.emit('game.kill', { target, x: at.x, y: at.y });
    return;
  }
  ctx.world.set(target, Mecha, { hull });
  ctx.bus.emit('game.hit', { target, shielded: false, slot, x: at.x, y: at.y, damage });
}

/**
 * 命中判定：弹丸当前位置向物理端口查圆，取 id 最小且阵营不同的机甲。
 * 护盾吸收转硬辐能；否则扣结构。命中即回收弹丸。
 */
export function createCombatSystem(options: CombatOptions): SystemDef {
  const radius = options.radius ?? 7;
  return {
    name: 'game.combat',
    phase: 'damage',
    reads: [Position, Projectile, Flux, Shield, Mecha, Suppressed],
    writes: [Flux, Mecha, Suppressed],
    update: (ctx) => {
      for (const entity of ctx.world.query(Suppressed)) {
        const suppressed = ctx.world.get(entity, Suppressed);
        if (suppressed !== undefined && suppressed.ticks > 0) {
          ctx.world.set(entity, Suppressed, { ticks: Math.max(0, suppressed.ticks - 1) });
        }
      }
      for (const bullet of ctx.world.query(Position, Projectile)) {
        const position = ctx.world.get(bullet, Position);
        const projectile = ctx.world.get(bullet, Projectile);
        if (position === undefined || projectile === undefined) continue;
        const target = acquire(ctx, options.physics, position.x, position.y, radius, projectile.faction, bullet);
        if (target === undefined) continue;
        ctx.commands.despawn(bullet);
        applyDamage(ctx, target, projectile.damage, projectile.effect, Number(projectile.slot), position);
      }
    },
  };
}
