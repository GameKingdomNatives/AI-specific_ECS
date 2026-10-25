import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import type { IPhysics } from 'agent-specific_ecs/ports';
import { Position } from '@itb/fixture';
import { Flux, Mecha, Projectile, Shield } from '../components.js';
import { addHard } from '../flux-model.js';

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

function applyDamage(ctx: SystemContext, target: EntityId, damage: number, at: { x: number; y: number }): void {
  const mecha = ctx.world.get(target, Mecha);
  const flux = ctx.world.get(target, Flux);
  const shield = ctx.world.get(target, Shield);
  if (mecha === undefined) return;
  if (shield?.active === true && flux !== undefined) {
    const next = addHard(flux, damage * 1.25);
    ctx.world.set(target, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
    ctx.bus.emit('game.hit', { target, shielded: true, x: at.x, y: at.y, damage });
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
  ctx.bus.emit('game.hit', { target, shielded: false, x: at.x, y: at.y, damage });
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
    reads: [Position, Projectile, Flux, Shield, Mecha],
    writes: [Flux, Mecha],
    update: (ctx) => {
      for (const bullet of ctx.world.query(Position, Projectile)) {
        const position = ctx.world.get(bullet, Position);
        const projectile = ctx.world.get(bullet, Projectile);
        if (position === undefined || projectile === undefined) continue;
        const target = acquire(ctx, options.physics, position.x, position.y, radius, projectile.faction, bullet);
        if (target === undefined) continue;
        ctx.commands.despawn(bullet);
        applyDamage(ctx, target, projectile.damage, position);
      }
    },
  };
}
