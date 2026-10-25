import type { EntityId, SystemContext, SystemDef } from 'agent-specific_ecs/core';
import type { InputSnapshot } from 'agent-specific_ecs/ports';
import { Position, Velocity } from '@itb/fixture';
import { Ai, Aim, Flux, Projectile, Weapon, Vent } from '../components.js';
import { addSoft, isOverloaded, performanceFactor, type FluxState } from '../flux-model.js';

export interface WeaponSpec {
  readonly damage: number;
  readonly speed: number;
  /** 每发产生的软辐能。 */
  readonly heat: number;
  /** 名义装填 tick（红线区按性能系数减速）。 */
  readonly period: number;
  readonly muzzle?: number;
}

export const PRIMARY_WEAPON: WeaponSpec = { damage: 6, speed: 18, heat: 1.6, period: 9, muzzle: 26 };
export const ENEMY_WEAPON: WeaponSpec = { damage: 9, speed: 13, heat: 2.4, period: 16, muzzle: 30 };

function spawnShot(ctx: SystemContext, entity: EntityId, spec: WeaponSpec, faction: number): void {
  const position = ctx.world.get(entity, Position);
  const aim = ctx.world.get(entity, Aim);
  if (position === undefined || aim === undefined) return;
  const muzzle = spec.muzzle ?? 24;
  ctx.commands.spawn([
    [Position, { x: position.x + Math.cos(aim.angle) * muzzle, y: position.y + Math.sin(aim.angle) * muzzle }],
    [Velocity, { x: Math.cos(aim.angle) * spec.speed, y: Math.sin(aim.angle) * spec.speed }],
    [Projectile, { damage: spec.damage, faction }],
  ]);
  ctx.bus.emit('game.shot', { entity, faction, x: position.x, y: position.y });
}

/** 推进装填并写回；返回推进后的剩余 tick。 */
function cool(ctx: SystemContext, entity: EntityId, state: FluxState): number {
  const current = ctx.world.get(entity, Weapon);
  if (current === undefined) return 0;
  const cooldown = Math.max(0, current.cooldown - performanceFactor(state));
  ctx.world.set(entity, Weapon, { cooldown });
  return cooldown;
}

function fire(ctx: SystemContext, entity: EntityId, state: FluxState, spec: WeaponSpec, faction: number): void {
  spawnShot(ctx, entity, spec, faction);
  const next = addSoft(state, spec.heat);
  ctx.world.set(entity, Flux, { soft: next.soft, hard: next.hard, overloadTicks: next.overloadTicks });
  ctx.world.set(entity, Weapon, { cooldown: spec.period });
}

/** 玩家主炮：按住左键连射；过载或排散期间无法开火。 */
export function createPlayerWeaponSystem(options: {
  readonly player: EntityId;
  readonly getInput: () => InputSnapshot;
  readonly spec?: WeaponSpec;
}): SystemDef {
  const spec = options.spec ?? PRIMARY_WEAPON;
  return {
    name: 'game.weapon.primary',
    phase: 'ai',
    reads: [Position, Aim, Flux, Weapon, Vent],
    writes: [Flux, Weapon],
    update: (ctx) => {
      const entity = options.player;
      const flux = ctx.world.get(entity, Flux);
      if (flux === undefined) return;
      const cooldown = cool(ctx, entity, flux);
      const vent = ctx.world.get(entity, Vent);
      const input = options.getInput();
      const wantsFire = input.buttons.has(0) && !isOverloaded(flux) && vent?.active !== true;
      if (!wantsFire || cooldown > 0 || performanceFactor(flux) <= 0) return;
      fire(ctx, entity, flux, spec, 0);
    },
  };
}

/** 敌机武器：只在交战模式开火，装填同样受红线区影响。 */
export function createEnemyWeaponSystem(options: { readonly spec?: WeaponSpec } = {}): SystemDef {
  const spec = options.spec ?? ENEMY_WEAPON;
  return {
    name: 'game.enemyWeapon',
    phase: 'ai',
    reads: [Position, Aim, Flux, Weapon, Vent],
    writes: [Flux, Weapon],
    update: (ctx) => {
      for (const entity of ctx.world.query(Weapon)) {
        const flux = ctx.world.get(entity, Flux);
        const ai = ctx.world.get(entity, Ai);
        if (flux === undefined || ai === undefined || ai.mode !== 0) continue;
        const cooldown = cool(ctx, entity, flux);
        const vent = ctx.world.get(entity, Vent);
        if (cooldown > 0 || vent?.active === true || performanceFactor(flux) <= 0) continue;
        fire(ctx, entity, flux, spec, 1);
      }
    },
  };
}
