import { interpolatePoint } from 'agent-specific_ecs/core';
import type { EntityId, World } from 'agent-specific_ecs/core';
import { Box, Bullet, Position } from '@itb/fixture';
import type { RenderItem } from 'agent-specific_ecs/ports';
import type { SceneAssets } from 'agent-specific_ecs/scene';
import { Aim, Flux, Mecha, Projectile, Shield, Support, Terminator } from './game/components.js';
import { FLUX_CAPACITY, FLUX_REDLINE, fluxTotal, isOverloaded } from './game/flux-model.js';
import { layoutFluxBar } from './game/flux-bar.js';

export interface RenderTableContext {
  readonly player: EntityId;
  readonly kills: number;
  readonly width: number;
  readonly assets: ReadonlyMap<EntityId, SceneAssets> | undefined;
  readonly url: (name: string) => string;
}

function textureFor(entity: EntityId, context: RenderTableContext): string {
  const sceneTexture = context.assets?.get(entity)?.texture;
  if (sceneTexture !== undefined) return context.url(sceneTexture);
  return entity === context.player ? context.url('player') : context.url('box');
}

function mechaItems(world: World, alpha: number, previous: ReadonlyMap<EntityId, { x: number; y: number }>, context: RenderTableContext, items: RenderItem[]): void {
  for (const entity of world.query(Position, Box)) {
    const position = world.get(entity, Position);
    const box = world.get(entity, Box);
    if (position === undefined || box === undefined) continue;
    const point = interpolatePoint(previous.get(entity), position, alpha);
    const aim = world.get(entity, Aim);
    const mecha = world.get(entity, Mecha);
    const tint = mecha === undefined ? (entity === context.player ? 0xffaa66 : 0xf0f0f0) : mecha.faction === 0 ? 0x9fd8ff : 0xff9a7a;
    items.push({
      id: entity, x: point.x, y: point.y, rot: aim?.angle ?? 0,
      sx: box.size, sy: box.size, layer: 4, shape: 'rect', tint, alpha: 0.95, visible: true,
      texture: textureFor(entity, context),
    });
  }
}

function projectileItems(world: World, alpha: number, previous: ReadonlyMap<EntityId, { x: number; y: number }>, context: RenderTableContext, items: RenderItem[]): void {
  for (const entity of world.query(Position, Projectile)) {
    const position = world.get(entity, Position);
    const projectile = world.get(entity, Projectile);
    if (position === undefined || projectile === undefined) continue;
    const point = interpolatePoint(previous.get(entity), position, alpha);
    items.push({
      id: entity, x: point.x, y: point.y, rot: 0, sx: 12, sy: 12, layer: 3, shape: 'circle',
      tint: projectile.effect === 1 ? 0x7ad7ff : projectile.faction === 0 ? 0xffd27a : 0xff6b6b,
      alpha: 1, visible: true, texture: context.url('bullet'),
    });
  }
}

function shieldItems(world: World, previous: ReadonlyMap<EntityId, { x: number; y: number }>, items: RenderItem[]): void {
  for (const entity of world.query(Position, Shield)) {
    const shield = world.get(entity, Shield);
    if (shield?.active !== true) continue;
    const position = world.get(entity, Position);
    if (position === undefined) continue;
    const point = previous.get(entity) ?? position;
    const diameter = Number(shield.radius) * 2;
    items.push({ id: -300000 - entity, x: point.x, y: point.y, rot: 0, sx: diameter, sy: diameter, layer: 3, shape: 'circle', tint: 0x6fb6ff, alpha: 0.18, visible: true });
  }
}

function barItems(entity: EntityId, x: number, y: number, soft: number, hard: number, overloadTicks: number, items: RenderItem[]): void {
  const width = 64;
  const base = -100000 - entity * 8;
  const layout = layoutFluxBar(soft, hard, width);
  const left = x - width / 2;
  items.push({ id: base, x, y, rot: 0, sx: width, sy: 7, layer: 5, shape: 'rect', tint: 0x1b1b1b, alpha: 0.75, visible: true });
  // 容量线右侧的红区：让玩家看见“还能烧多少才过载”。
  if (layout.redZoneWidth > 0.5) {
    items.push({ id: base - 4, x: left + layout.capacityX + layout.redZoneWidth / 2, y, rot: 0, sx: layout.redZoneWidth, sy: 7, layer: 4, shape: 'rect', tint: 0xff4d4d, alpha: 0.18, visible: true });
  }
  if (layout.soft.width > 0.5) {
    items.push({ id: base - 1, x: left + layout.soft.x + layout.soft.width / 2, y, rot: 0, sx: layout.soft.width, sy: 5, layer: 5, shape: 'rect', tint: 0xffb347, alpha: 0.95, visible: true });
  }
  if (layout.hard.width > 0.5) {
    items.push({ id: base - 2, x: left + layout.hard.x + layout.hard.width / 2, y, rot: 0, sx: layout.hard.width, sy: 5, layer: 5, shape: 'rect', tint: 0xff4d4d, alpha: 0.95, visible: true });
  }
  // 100/120 容量刻线：满格是过载，不是容量。
  items.push({ id: base - 5, x: left + layout.capacityX, y, rot: 0, sx: 1, sy: 9, layer: 5, shape: 'rect', tint: 0xf2eee9, alpha: 0.85, visible: true });
  if (overloadTicks > 0) {
    items.push({ id: base - 3, x, y: y - 14, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xff5a5a, alpha: 0.95, visible: true, text: `OVERLOAD ${(overloadTicks / 60).toFixed(1)}s`, font: 'monospace', fontSize: 15 });
  }
}

function hullItems(world: World, previous: ReadonlyMap<EntityId, { x: number; y: number }>, items: RenderItem[]): void {
  for (const entity of world.query(Position, Mecha)) {
    const mecha = world.get(entity, Mecha);
    const position = world.get(entity, Position);
    if (mecha === undefined || position === undefined) continue;
    const point = previous.get(entity) ?? position;
    const width = 56;
    const y = point.y - 54;
    const base = -200000 - entity * 8;
    const maxHull = Number(mecha.maxHull);
    const hull = Number(mecha.hull);
    const ratio = maxHull > 0 ? Math.max(0, Math.min(1, hull / maxHull)) : 0;
    items.push({ id: base, x: point.x, y, rot: 0, sx: width, sy: 5, layer: 5, shape: 'rect', tint: 0x1b1b1b, alpha: 0.7, visible: true });
    if (ratio > 0) {
      items.push({ id: base - 1, x: point.x - width / 2 + (width * ratio) / 2, y, rot: 0, sx: width * ratio, sy: 3, layer: 5, shape: 'rect', tint: mecha.faction === 0 ? 0x7ee787 : 0xff6b6b, alpha: 0.95, visible: true });
    }
  }
}

function fluxItems(world: World, previous: ReadonlyMap<EntityId, { x: number; y: number }>, items: RenderItem[]): void {
  for (const entity of world.query(Position, Flux)) {
    const flux = world.get(entity, Flux);
    const position = world.get(entity, Position);
    if (flux === undefined || position === undefined) continue;
    const point = previous.get(entity) ?? position;
    barItems(entity, point.x, point.y - 40, flux.soft, flux.hard, flux.overloadTicks, items);
  }
}

function enemyHullOf(world: World): { hull: number; max: number } {
  for (const entity of world.query(Position, Mecha)) {
    const other = world.get(entity, Mecha);
    if (other !== undefined && other.faction !== 0) return { hull: other.hull, max: other.maxHull };
  }
  return { hull: 0, max: 0 };
}

function hudItems(world: World, player: EntityId, context: RenderTableContext, items: RenderItem[]): void {
  const flux = player < 0 ? undefined : world.get(player, Flux);
  const mecha = player < 0 ? undefined : world.get(player, Mecha);
  const total = flux === undefined ? 0 : fluxTotal(flux);
  const hull = mecha === undefined ? 0 : mecha.hull;
  const maxHull = mecha === undefined ? 0 : mecha.maxHull;
  const enemy = enemyHullOf(world);
  const enemyHull = enemy.hull;
  const enemyMax = enemy.max;
  const status = flux !== undefined && isOverloaded(flux) ? ' · OVERLOAD' : total > FLUX_CAPACITY ? ' · REDLINE' : '';
  const energy = slotOf(world, player, Terminator);
  const support = slotOf(world, player, Support);
  items.push({ id: -1, x: context.width / 2, y: 58, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xf2eee9, alpha: 0.9, visible: true, text: `FLUX ${Math.round(total)} / ${FLUX_REDLINE} · HULL ${Math.round(hull)}/${Math.round(maxHull)} · ENEMY ${Math.round(enemyHull)}/${Math.round(enemyMax)} · KILLS ${context.kills} · E ${energy} Q ${support}${status}`, font: 'monospace', fontSize: 20 });
}

function slotOf(world: World, player: EntityId, def: typeof Terminator | typeof Support): number {
  if (player < 0) return 0;
  const slot = world.get(player, def);
  return slot === undefined ? 0 : Math.ceil(slot.cooldown);
}

/** 世界 → 渲染表：机甲、弹丸、护盾、辐能条与顶部 HUD 都只读世界，不写回。 */
export function renderTable(
  world: World,
  alpha: number,
  previous: Map<EntityId, { x: number; y: number }>,
  context: RenderTableContext,
): RenderItem[] {
  const items: RenderItem[] = [];
  mechaItems(world, alpha, previous, context, items);
  projectileItems(world, alpha, previous, context, items);
  for (const entity of world.query(Position, Bullet)) {
    const position = world.get(entity, Position);
    if (position === undefined) continue;
    const point = interpolatePoint(previous.get(entity), position, alpha);
    items.push({ id: entity, x: point.x, y: point.y, rot: 0, sx: 14, sy: 14, layer: 3, shape: 'circle', tint: 0xffffff, alpha: 1, visible: true, texture: context.url('bullet') });
  }
  shieldItems(world, previous, items);
  fluxItems(world, previous, items);
  hullItems(world, previous, items);
  hudItems(world, context.player, context, items);
  return items;
}
