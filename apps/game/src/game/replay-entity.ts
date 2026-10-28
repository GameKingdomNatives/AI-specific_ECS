/**
 * 回放帧的采样层：把世界里一个实体读成「一行帧数据」，以及把它读回来。
 *
 * 尺寸、阵营、状态标记都只有一份真相：弹丸尺寸复用 `render-table.ts` 的槽位表，
 * 阵营与状态复用 `components.ts` 的组件，避免回放画面和实际打的画面各说一套。
 */

import type { EntityId, World } from 'agent-specific_ecs/core';
import { Box } from 'agent-specific_ecs/data';
import { Aim, FACTION_ENEMY, Flux, Mecha, Projectile, Shield, Suppressed, Vent } from './components.js';
import { flagAt, KIND_MASK, REPLAY_STRIDE, valueAt, writeSlot, type Storage } from './replay-frame-store.js';

export const REPLAY_KIND_MECHA = 0;
export const REPLAY_KIND_PROJECTILE = 1;
export const REPLAY_KIND_OTHER = 2;

export const REPLAY_FLAG_ENEMY = 8;
export const REPLAY_FLAG_SHIELD = 16;
export const REPLAY_FLAG_VENT = 32;
export const REPLAY_FLAG_SUPPRESSED = 64;
export const REPLAY_FLAG_OVERLOAD = 128;

/** 槽位存在标记的高 8 位：低 8 位已经被类型/状态占满。 */
export const REPLAY_SLOT_SHIFT = 8;
export const REPLAY_SLOT_MASK = 0xf00;

/** 一帧里的一个实体：位置、尺寸、朝向、状态，够画出来就够了。 */
export interface ReplayEntry {
  readonly entity: EntityId;
  readonly kind: number;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly angle: number;
  readonly hull: number;
  readonly hullMax: number;
  readonly soft: number;
  readonly hard: number;
  readonly flags: number;
}

/** 弹丸绘制尺寸：与 `render-table.ts` 的 `projectileItems` 同表（0 主炮 / 1 终结 / 2 支援 / 9 敌机）。 */
const PROJECTILE_SIZE: Readonly<Record<number, number>> = { 0: 10, 1: 24, 2: 15, 9: 12 };
const DEFAULT_PROJECTILE_SIZE = 10;
/** 没有 `Box` 的普通实体（护盾环、特效块等）给一个可见的最小尺寸。 */
const DEFAULT_BODY_SIZE = 14;

export function kindOf(world: World, entity: EntityId): number {
  if (world.has(entity, Projectile)) return REPLAY_KIND_PROJECTILE;
  if (world.has(entity, Mecha)) return REPLAY_KIND_MECHA;
  return REPLAY_KIND_OTHER;
}

function factionOf(world: World, entity: EntityId): number | undefined {
  const mecha = world.get(entity, Mecha);
  if (mecha !== undefined) return mecha.faction;
  return world.get(entity, Projectile)?.faction;
}

function flagOf(active: boolean | undefined, bit: number): number {
  return active === true ? bit : 0;
}

export function flagsOf(world: World, entity: EntityId, kind: number): number {
  const enemy = factionOf(world, entity) === FACTION_ENEMY ? REPLAY_FLAG_ENEMY : 0;
  const slot = world.get(entity, Projectile)?.slot ?? 0;
  return kind
    | enemy
    | flagOf(world.get(entity, Shield)?.active, REPLAY_FLAG_SHIELD)
    | flagOf(world.get(entity, Vent)?.active, REPLAY_FLAG_VENT)
    | flagOf((world.get(entity, Suppressed)?.ticks ?? 0) > 0, REPLAY_FLAG_SUPPRESSED)
    | flagOf((world.get(entity, Flux)?.overloadTicks ?? 0) > 0, REPLAY_FLAG_OVERLOAD)
    | (Math.max(0, Math.min(15, slot)) << REPLAY_SLOT_SHIFT);
}

/** 弹丸没有 `Box`，尺寸按槽位取；机甲与其它实体按 `Box`，没有就给最小可见尺寸。 */
export function sizeOf(world: World, entity: EntityId, kind: number): number {
  const box = world.get(entity, Box);
  if (box !== undefined) return box.size;
  if (kind === REPLAY_KIND_PROJECTILE) {
    const slot = world.get(entity, Projectile)?.slot ?? 0;
    return PROJECTILE_SIZE[slot] ?? DEFAULT_PROJECTILE_SIZE;
  }
  return DEFAULT_BODY_SIZE;
}

function num(read: number | undefined, fallback = 0): number {
  return read ?? fallback;
}

/** 把实体写进帧存储的 slot 位置；尺寸在这里算好，读回时不再认识世界。 */
export function writeEntityAt(storage: Storage, slot: number, entity: EntityId, world: World, position: { readonly x: number; readonly y: number }): void {
  const kind = kindOf(world, entity);
  const mecha = world.get(entity, Mecha);
  const flux = world.get(entity, Flux);
  const values = [
    position.x,
    position.y,
    sizeOf(world, entity, kind),
    num(world.get(entity, Aim)?.angle),
    num(mecha?.hull),
    num(mecha?.maxHull),
    num(flux?.soft),
    num(flux?.hard),
    entity,
  ];
  writeSlot(storage, slot, values, flagsOf(world, entity, kind));
}

export function readEntryAt(storage: Storage, slot: number): ReplayEntry {
  const base = slot * REPLAY_STRIDE;
  const flags = flagAt(storage, slot);
  return {
    entity: valueAt(storage, base + 8),
    kind: flags & KIND_MASK,
    x: valueAt(storage, base),
    y: valueAt(storage, base + 1),
    size: valueAt(storage, base + 2),
    angle: valueAt(storage, base + 3),
    hull: valueAt(storage, base + 4),
    hullMax: valueAt(storage, base + 5),
    soft: valueAt(storage, base + 6),
    hard: valueAt(storage, base + 7),
    flags,
  };
}

/** 弹丸的武器槽（只有弹丸有；其它实体为 0）。 */
export function slotOf(entry: ReplayEntry): number {
  return (entry.flags & REPLAY_SLOT_MASK) >> REPLAY_SLOT_SHIFT;
}
