import { interpolatePoint } from 'agent-specific_ecs/core';
import type { EntityId, World } from 'agent-specific_ecs/core';
import { Bullet } from '@itb/fixture';
import { Box, Position } from 'agent-specific_ecs/data';
import type { RenderItem } from 'agent-specific_ecs/ports';
import type { SceneAssets } from 'agent-specific_ecs/scene';
import { Aim, Flux, Mecha, Projectile, Run, Shield, Support, Suppressed, Terminator } from './game/components.js';
import { FLUX_CAPACITY, FLUX_REDLINE, fluxTotal, isOverloaded } from './game/flux-model.js';
import { layoutFluxBar } from './game/flux-bar.js';
import { warningLevel, warningPulse, warningText } from './game/flux-warning.js';
import type { FeedEntry } from './flux-feed.js';

export interface HitMark {
  readonly x: number;
  readonly y: number;
  readonly damage: number;
  readonly slot: number;
  readonly shielded: boolean;
  readonly ew: boolean;
  readonly tick: number;
}

export interface RenderTableContext {
  readonly player: EntityId;
  readonly kills: number;
  readonly width: number;
  readonly height: number;
  readonly hits: readonly HitMark[];
  readonly feed: readonly FeedEntry[];
  readonly nowTick: number;
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
      // 贴图朝上（-y），世界角 0 指向 +x：补 90° 才和鼠标方向一致。
      id: entity, x: point.x, y: point.y, rot: (aim?.angle ?? 0) + Math.PI / 2,
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
    const slot = Number(projectile.slot);
    const size = slot === 1 ? 24 : slot === 2 ? 15 : slot === 9 ? 12 : 10;
    const tint = slot === 1 ? 0xff9f43 : slot === 2 ? 0xd18cff : projectile.faction === 0 ? 0xffd27a : 0xff6b6b;
    items.push({
      id: entity, x: point.x, y: point.y, rot: 0, sx: size, sy: size, layer: 3, shape: 'circle',
      tint, alpha: 1, visible: true, texture: context.url('bullet'),
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

function enemyHullOf(world: World): { hull: number; max: number; ew: number; count: number } {
  let hull = 0;
  let max = 0;
  let ew = 0;
  let count = 0;
  for (const entity of world.query(Position, Mecha)) {
    const other = world.get(entity, Mecha);
    if (other === undefined || other.faction === 0) continue;
    const suppressed = world.get(entity, Suppressed);
    hull += other.hull;
    max += other.maxHull;
    count += 1;
    ew = Math.max(ew, suppressed === undefined ? 0 : suppressed.ticks);
  }
  return { hull, max, ew, count };
}

function suppressedItems(world: World, previous: ReadonlyMap<EntityId, { x: number; y: number }>, items: RenderItem[]): void {
  for (const entity of world.query(Position, Suppressed)) {
    const suppressed = world.get(entity, Suppressed);
    const position = world.get(entity, Position);
    if (suppressed === undefined || position === undefined || suppressed.ticks <= 0) continue;
    const point = previous.get(entity) ?? position;
    items.push({ id: -400000 - entity, x: point.x, y: point.y, rot: 0, sx: 74, sy: 74, layer: 4, shape: 'circle', tint: 0xb07cff, alpha: 0.3, visible: true });
    items.push({ id: -410000 - entity, x: point.x, y: point.y - 72, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xc9a8ff, alpha: 0.9, visible: true, text: `EW ${(suppressed.ticks / 60).toFixed(1)}s`, font: 'monospace', fontSize: 14 });
  }
}

function hitMarks(context: RenderTableContext, items: RenderItem[]): void {
  for (const hit of context.hits) {
    const age = context.nowTick - hit.tick;
    if (age < 0 || age > 24) continue;
    const tint = hit.ew ? 0xd18cff : hit.shielded ? 0x6fb6ff : hit.slot === 1 ? 0xff9f43 : 0xffd27a;
    const text = hit.ew ? 'EW' : hit.shielded ? 'BLOCK' : `-${Math.round(hit.damage)}`;
    items.push({ id: -500000 - hit.tick * 16 - hit.slot, x: hit.x, y: hit.y - 34 - age * 1.4, rot: 0, sx: 1, sy: 1, layer: 6, shape: 'rect', tint, alpha: Math.max(0, 1 - age / 24), visible: true, text, font: 'monospace', fontSize: hit.slot === 1 ? 20 : 16 });
  }
}

/** 辐能事件跟着玩家走：最关键的博弈信息不能贴在屏幕角落。 */
function feedItems(world: World, context: RenderTableContext, items: RenderItem[]): void {
  const anchor = context.player < 0 ? undefined : world.get(context.player, Position);
  if (anchor === undefined) return;
  const recent = context.feed.slice(-4);
  recent.forEach((entry, index) => {
    const age = context.nowTick - entry.tick;
    const fade = age > 120 ? Math.max(0, 1 - (age - 120) / 30) : 1;
    items.push({ id: -700000 - index, x: anchor.x, y: anchor.y - 80 - (recent.length - 1 - index) * 20, rot: 0, sx: 1, sy: 1, layer: 6, shape: 'rect', tint: entry.tint, alpha: 0.95 * fade, visible: true, text: entry.text, font: 'monospace', fontSize: 14 });
  });
}

/** 四条屏幕边：只负责画，不判断等级。 */
function edgeBars(context: RenderTableContext, tint: number, alpha: number, thickness: number, items: RenderItem[]): void {
  const { width, height } = context;
  items.push({ id: -800001, x: width / 2, y: thickness / 2, rot: 0, sx: width, sy: thickness, layer: 7, shape: 'rect', tint, alpha, visible: true });
  items.push({ id: -800002, x: width / 2, y: height - thickness / 2, rot: 0, sx: width, sy: thickness, layer: 7, shape: 'rect', tint, alpha, visible: true });
  items.push({ id: -800003, x: thickness / 2, y: height / 2, rot: 0, sx: thickness, sy: height, layer: 7, shape: 'rect', tint, alpha, visible: true });
  items.push({ id: -800004, x: width - thickness / 2, y: height / 2, rot: 0, sx: thickness, sy: height, layer: 7, shape: 'rect', tint, alpha, visible: true });
}

interface WarningView {
  readonly flux: { soft: number; hard: number; overloadTicks: number };
  readonly x: number;
  readonly y: number;
  readonly level: 1 | 2 | 3;
}

/** 只在「有东西要警告」时给出视图；没有就是 undefined，调用方直接不画。 */
function warningView(world: World, player: EntityId): WarningView | undefined {
  if (player < 0) return undefined;
  const flux = world.get(player, Flux);
  const position = world.get(player, Position);
  if (flux === undefined || position === undefined) return undefined;
  const level = warningLevel(flux);
  if (level === 0) return undefined;
  return { flux, x: position.x, y: position.y, level };
}

/** 警告层：越危险，屏幕边缘与机甲环呼吸得越快；文字写在机甲脚下。 */
function warningItems(world: World, player: EntityId, context: RenderTableContext, items: RenderItem[]): void {
  const view = warningView(world, player);
  if (view === undefined) return;
  const { level, x, y, flux } = view;
  const pulse = warningPulse(context.nowTick, level);
  const tint = level === 3 ? 0xff3b3b : 0xff8a4c;
  const thickness = level >= 2 ? 10 : 6;
  const edgeAlpha = 0.05 + pulse * (level >= 2 ? 0.16 : 0.08);
  edgeBars(context, tint, edgeAlpha, thickness, items);
  if (level >= 2) {
    items.push({ id: -800010, x, y, rot: 0, sx: 96, sy: 96, layer: 4, shape: 'circle', tint, alpha: 0.08 + pulse * 0.12, visible: true });
  }
  items.push({ id: -800020, x, y: y + 48, rot: 0, sx: 1, sy: 1, layer: 7, shape: 'rect', tint, alpha: 0.95, visible: true, text: warningText(flux), font: 'monospace', fontSize: level >= 2 ? 18 : 15 });
}

/** 波次后缀：标题行只关心「第几波 / 还差几秒补位」。 */
function waveLabel(run: { wave: number; maxWave: number; spawnTicks: number } | undefined): string {
  if (run === undefined) return '';
  const pending = run.spawnTicks > 0 ? ` 补位 ${(run.spawnTicks / 60).toFixed(1)}s` : '';
  return ` · W${run.wave}/${run.maxWave}${pending}`;
}

/** 敌机聚合：多机时显示「架数 + 总血量」，避免只看得到最后一架。 */
function enemyLabel(enemy: { hull: number; max: number; ew: number; count: number }): string {
  const ew = enemy.ew > 0 ? ` · EW ${(enemy.ew / 60).toFixed(1)}s` : '';
  return `ENEMY ${enemy.count}架 ${Math.round(enemy.hull)}/${Math.round(enemy.max)}${ew}`;
}

function hudItems(world: World, player: EntityId, context: RenderTableContext, items: RenderItem[]): void {
  const flux = player < 0 ? undefined : world.get(player, Flux);
  const mecha = player < 0 ? undefined : world.get(player, Mecha);
  const total = flux === undefined ? 0 : fluxTotal(flux);
  const hull = mecha === undefined ? 0 : mecha.hull;
  const maxHull = mecha === undefined ? 0 : mecha.maxHull;
  const enemy = enemyHullOf(world);
  const wave = waveLabel(player < 0 ? undefined : world.get(player, Run));
  const status = flux !== undefined && isOverloaded(flux) ? ' · OVERLOAD' : total > FLUX_CAPACITY ? ' · REDLINE' : '';
  const energy = slotOf(world, player, Terminator);
  const support = slotOf(world, player, Support);
  items.push({ id: -2, x: context.width / 2, y: 88, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xb8ada0, alpha: 0.8, visible: true, text: 'WASD 移动 · 左键 开火 · 空格 护盾 · V 排散 · E 终结 · Q 支援 · ? 教学', font: 'sans-serif', fontSize: 16 });
  const cards = [
    ['主炮 LMB · 持续输出 · 6伤 / 3.6软 / 9t', 0xffd27a],
    ['终结 E · 破甲重击 · 26伤 / 12软 / 96t', 0xff9f43],
    ['支援 Q · 压盾 1.5s · 穿盾只加压辐能 / 130t', 0xd18cff],
  ] as const;
  cards.forEach(([text, tint], index) => {
    items.push({ id: -10 - index, x: 300, y: context.height - 96 + index * 26, rot: 0, sx: 1, sy: 1, layer: 6, shape: 'rect', tint, alpha: 0.9, visible: true, text, font: 'sans-serif', fontSize: 16 });
  });
  items.push({ id: -1, x: context.width / 2, y: 58, rot: 0, sx: 1, sy: 1, layer: 5, shape: 'rect', tint: 0xf2eee9, alpha: 0.9, visible: true, text: `FLUX ${Math.round(total)} / ${FLUX_REDLINE} · HULL ${Math.round(hull)}/${Math.round(maxHull)} · ENEMY ${enemyLabel(enemy)} · KILLS ${context.kills}${wave} · E ${energy} Q ${support}${status}`, font: 'monospace', fontSize: 20 });
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
  suppressedItems(world, previous, items);
  hitMarks(context, items);
  feedItems(world, context, items);
  warningItems(world, context.player, context, items);
  hudItems(world, context.player, context, items);
  return items;
}
