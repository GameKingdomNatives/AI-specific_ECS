import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import { Position } from 'agent-specific_ecs/data';
import { Ai, Aim, Flux, Mecha, Shield, Suppressed, Vent } from '../components.js';
import { AI_ENGAGE, AI_VENT, HANDOFF_AT, selectAttacker, type Combatant } from '../engagement.js';
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

export { AI_ENGAGE, AI_VENT } from '../engagement.js';

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

/** 攻击态：压到射程带，太近就退一点，太远就贴上去。 */
function stepAttacker(ctx: SystemContext, entity: EntityId, position: { x: number; y: number }, dx: number, dy: number, distance: number, tuning: Tuning): void {
  const near = distance < tuning.range * 0.7;
  const far = distance > tuning.range;
  const dir = far ? 1 : near ? -1 : 0;
  if (dir === 0) return;
  stepToward(ctx, entity, position, (dx / distance) * dir, (dy / distance) * dir, tuning.speed, tuning);
}

/** 排散态：侧向机动寻找位置，同时把距离拉到射程外一点点，避免贴脸挨打。 */
function stepVenting(ctx: SystemContext, entity: EntityId, position: { x: number; y: number }, dx: number, dy: number, distance: number, tuning: Tuning): void {
  const side = entity % 2 === 0 ? 1 : -1;
  const ux = dx / distance;
  const uy = dy / distance;
  const radial = distance < tuning.range * 1.4 ? -1 : 0;
  const nx = ux * radial - uy * side * 0.75;
  const ny = uy * radial + ux * side * 0.75;
  const length = Math.hypot(nx, ny) || 1;
  stepToward(ctx, entity, position, nx / length, ny / length, tuning.speed * 1.05, tuning);
}

/** 最近的可打目标（阵营 0，含玩家与僚机）；全场没有就退回玩家。 */
function nearestTarget(ctx: SystemContext, from: { x: number; y: number }, fallback: { x: number; y: number }): { x: number; y: number } {
  let best = fallback;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entity of ctx.world.query(Position, Mecha)) {
    const mecha = ctx.world.get(entity, Mecha);
    const position = ctx.world.get(entity, Position);
    if (mecha === undefined || position === undefined || mecha.faction !== 0) continue;
    const distance = Math.hypot(position.x - from.x, position.y - from.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = { x: position.x, y: position.y };
    }
  }
  return best;
}

function collect(ctx: SystemContext): Combatant[] {
  const list: Combatant[] = [];
  for (const entity of ctx.world.query(Mecha, Flux, Ai)) {
    const mecha = ctx.world.get(entity, Mecha);
    const flux = ctx.world.get(entity, Flux);
    const ai = ctx.world.get(entity, Ai);
    if (mecha === undefined || flux === undefined || ai === undefined || mecha.faction === 0) continue;
    list.push({ id: entity, flux: fluxTotal(flux), mode: ai.mode });
  }
  return list;
}

function applyEnemy(ctx: SystemContext, entity: EntityId, position: { x: number; y: number }, target: { x: number; y: number }, flux: { soft: number; hard: number; overloadTicks: number }, attacker: boolean, tuning: Tuning): void {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy) || 1;
  ctx.world.set(entity, Ai, { mode: attacker ? AI_ENGAGE : AI_VENT });
  ctx.world.set(entity, Vent, { active: !attacker });
  ctx.world.set(entity, Shield, { active: attacker && !isSuppressed(ctx, entity) });
  ctx.world.set(entity, Aim, { angle: Math.atan2(dy, dx) });
  if (attacker && !isOverloaded(flux)) {
    stepAttacker(ctx, entity, position, dx, dy, distance, tuning);
    return;
  }
  stepVenting(ctx, entity, position, dx, dy, distance, tuning);
}

/**
 * 敌机 AI：只看位置与辐能，不看玩家输入。
 * 多机时通过交战令牌轮换——攻击者打到换手线就让位，同伴排散干净后接管，形成循环压制。
 * 单机时退化为「辐能越线就排散后撤」。
 */
export function createEnemyAiSystem(options: EnemyAiOptions): SystemDef {
  const tuning: Tuning = {
    range: options.preferredRange ?? 380,
    ventAt: options.ventThreshold ?? HANDOFF_AT,
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
      const enemies = collect(ctx);
      const current = enemies.find((item) => item.mode === AI_ENGAGE)?.id;
      const attacker = selectAttacker(enemies, current);
      for (const entity of ctx.world.query(Mecha, Flux, Ai)) {
        const mecha = ctx.world.get(entity, Mecha);
        const position = ctx.world.get(entity, Position);
        const flux = ctx.world.get(entity, Flux);
        if (mecha === undefined || position === undefined || flux === undefined) continue;
        if (mecha.faction === 0) continue;
        const forcedVent = fluxTotal(flux) >= tuning.ventAt || isOverloaded(flux);
        const aimAt = nearestTarget(ctx, position, target);
        applyEnemy(ctx, entity, position, aimAt, flux, entity === attacker && !forcedVent, tuning);
      }
    },
  };
}
