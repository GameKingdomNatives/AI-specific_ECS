/**
 * 僚机系统：把纯决策层（wingman-model.ts）的结果落成世界里的移动、开火与状态。
 *
 * 五件事：补位检查 → 找最近敌机 → 问决策层 → 位移/朝向/排散开关 → 交战态开火。
 * 装填用 Wingman.timer 计数，不占 Weapon 组件（僚机没有武器槽语义）。
 * 被击落后由玩家身上的 WingSlot 记倒计时，到点自动补一架——战中零指挥，不让人去救。
 */
import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import { Box, Position } from 'agent-specific_ecs/data';
import { Aim, Flux, Mecha, Shield, Vent, Wingman, WingSlot } from '../components.js';
import { addSoft, fluxTotal, isOverloaded, performanceFactor, type FluxState } from '../flux-model.js';
import { planWingman, WING_DEADZONE, WING_ENGAGE, WING_FOLLOW, WING_SLOW_RADIUS, WING_SPEED, WING_VENT, type WingPoint } from '../wingman-model.js';
import { spawnShot, WINGMAN_WEAPON } from './weapon.js';

/** 僚机被击落后多久补位（300 tick = 5 秒，给人一个“掉了一架”的呼吸窗口）。 */
export const WING_RESPAWN_TICKS = 300;
/** 补位机与场景初始僚机同规格，避免补位后变成另一个东西。 */
export const WING_HULL = 80;

export interface WingmanOptions {
  readonly player: EntityId;
  readonly width: number;
  readonly height: number;
  readonly speed?: number;
  readonly margin?: number;
}

interface Tuning {
  readonly width: number;
  readonly height: number;
  readonly margin: number;
  readonly speed: number;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function stateOf(ctx: SystemContext, entity: EntityId): FluxState {
  const flux = ctx.world.get(entity, Flux);
  return { soft: flux?.soft ?? 0, hard: flux?.hard ?? 0, overloadTicks: flux?.overloadTicks ?? 0 };
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

/**
 * 向落点走一步：死区内不动，靠近落点时按比例减速。
 * 少了这两条就会在落点旁边每 tick 微调，看起来像高频抖动。
 */
function stepToward(self: WingPoint, target: WingPoint, speed: number): WingPoint {
  const dx = target.x - self.x;
  const dy = target.y - self.y;
  const distance = Math.hypot(dx, dy);
  if (distance <= WING_DEADZONE) return self;
  const ease = Math.max(0.35, Math.min(1, distance / WING_SLOW_RADIUS));
  const step = Math.min(speed * ease, distance);
  return { x: self.x + (dx / distance) * step, y: self.y + (dy / distance) * step };
}

function liveWingmen(ctx: SystemContext): number {
  let alive = 0;
  for (const entity of ctx.world.query(Position, Wingman)) {
    if (ctx.world.get(entity, Mecha) !== undefined) alive += 1;
  }
  return alive;
}

function spawnWingman(ctx: SystemContext, player: WingPoint, tuning: Tuning): void {
  const x = clamp(player.x - 120, tuning.margin, tuning.width - tuning.margin);
  const y = clamp(player.y + 80, tuning.margin, tuning.height - tuning.margin);
  ctx.commands.spawn([
    [Position, { x, y }],
    [Box, { size: 22, tint: 16777215 }],
    [Mecha, { faction: 0, hull: WING_HULL, maxHull: WING_HULL }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Shield, { active: false, radius: 40 }],
    [Aim, { angle: 0 }],
    [Vent, { active: false }],
    [Wingman, { mode: WING_FOLLOW, timer: 0 }],
  ]);
}

/** 补位：僚机不在场时按 WingSlot 倒计时养出一架；在场时把倒计时清零。 */
function upkeepSlot(ctx: SystemContext, player: WingPoint, tuning: Tuning & { readonly slotOwner: EntityId }): void {
  const slot = ctx.world.get(tuning.slotOwner, WingSlot);
  if (slot === undefined) return;
  const alive = liveWingmen(ctx);
  if (alive > 0) {
    if (slot.respawnTicks !== 0) ctx.world.set(tuning.slotOwner, WingSlot, { respawnTicks: 0, losses: slot.losses });
    return;
  }
  if (slot.respawnTicks === 0) {
    ctx.world.set(tuning.slotOwner, WingSlot, { respawnTicks: WING_RESPAWN_TICKS, losses: slot.losses + 1 });
    return;
  }
  const next = slot.respawnTicks - 1;
  if (next === 0) spawnWingman(ctx, player, tuning);
  ctx.world.set(tuning.slotOwner, WingSlot, { respawnTicks: next, losses: slot.losses });
}

function moveWingman(ctx: SystemContext, entity: EntityId, self: WingPoint, plan: { mode: number; target: WingPoint }, enemy: WingPoint | undefined, tuning: Tuning): WingPoint {
  const next = stepToward(self, plan.target, tuning.speed);
  ctx.world.set(entity, Position, {
    x: clamp(next.x, tuning.margin, tuning.width - tuning.margin),
    y: clamp(next.y, tuning.margin, tuning.height - tuning.margin),
  });
  ctx.world.set(entity, Vent, { active: plan.mode === WING_VENT });
  const facing = enemy ?? plan.target;
  ctx.world.set(entity, Aim, { angle: Math.atan2(facing.y - next.y, facing.x - next.x) });
  return next;
}

/** 交战态才开火；装填、过载、排散任一成立都不打。返回新的装填计数。 */
function fireIfReady(ctx: SystemContext, entity: EntityId, plan: { mode: number }, state: FluxState, cooldown: number): number {
  if (plan.mode !== WING_ENGAGE || cooldown > 0) return cooldown;
  if (isOverloaded(state) || performanceFactor(state) <= 0) return cooldown;
  spawnShot(ctx, entity, WINGMAN_WEAPON, 0);
  const next = addSoft(state, WINGMAN_WEAPON.heat);
  ctx.world.set(entity, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
  return WINGMAN_WEAPON.period;
}

function updateOne(ctx: SystemContext, entity: EntityId, player: WingPoint, tuning: Tuning): void {
  const position = ctx.world.get(entity, Position);
  const wingman = ctx.world.get(entity, Wingman);
  if (position === undefined || wingman === undefined) return;
  const self: WingPoint = { x: position.x, y: position.y };
  const state = stateOf(ctx, entity);
  const enemy = nearestTo(self, ctx);
  const plan = planWingman({
    player,
    self,
    flux: fluxTotal(state),
    previousMode: Number(wingman.mode),
    side: entity % 2 === 0 ? 1 : -1,
    ...(enemy === undefined ? {} : { enemy }),
  });
  const cooldown = Math.max(0, Number(wingman.timer) - performanceFactor(state));
  moveWingman(ctx, entity, self, plan, enemy, tuning);
  const fired = enemy !== undefined && cooldown <= 0 ? fireIfReady(ctx, entity, plan, state, cooldown) : cooldown;
  ctx.world.set(entity, Wingman, { mode: plan.mode, timer: fired });
}

export function createWingmanSystem(options: WingmanOptions): SystemDef {
  const tuning: Tuning = {
    width: options.width,
    height: options.height,
    margin: options.margin ?? 24,
    speed: options.speed ?? WING_SPEED,
  };
  const slotTuning = { ...tuning, slotOwner: options.player };
  return {
    name: 'game.wingman',
    phase: 'ai',
    reads: [Position, Mecha, Flux, Wingman, Vent, WingSlot],
    writes: [Position, Aim, Wingman, Vent, Flux, WingSlot],
    update: (ctx) => {
      const playerPosition = ctx.world.get(options.player, Position);
      if (playerPosition === undefined) return;
      const player: WingPoint = { x: playerPosition.x, y: playerPosition.y };
      upkeepSlot(ctx, player, slotTuning);
      for (const entity of ctx.world.query(Position, Wingman)) {
        updateOne(ctx, entity, player, tuning);
      }
    },
  };
}
