/**
 * 复盘面板的画面：把记录下来的历史帧画成俯视图。
 *
 * 只读 ReplayFrame 与事件表，不碰世界、不跑系统——所以画出来的东西永远是当时的那一帧。
 * 颜色沿用 render-table.ts 的阵营色与弹丸槽位色，玩家、敌人、三种弹药一眼能分开。
 * 事件标记与操作标签在 replay-draw-marks.ts，这里只负责实体、状态环与信息条。
 */

import type { EntityId } from 'agent-specific_ecs/core';
import type { BattleEvent } from './game/battle-review.js';
import { collectMarks, REPLAY_MARK_WINDOW } from './game/replay-events.js';
import { REPLAY_FLAG_ENEMY, REPLAY_FLAG_OVERLOAD, REPLAY_FLAG_SHIELD, REPLAY_FLAG_SUPPRESSED, REPLAY_FLAG_VENT, REPLAY_KIND_MECHA, REPLAY_KIND_PROJECTILE, slotOf, type ReplayEntry, type ReplayFrame } from './game/replay-frames.js';
import { drawEventMarks, drawInputChips } from './replay-draw-marks.js';

export interface ReplayViewOptions {
  /** 世界坐标尺寸（1920×1080），画布按比例缩放。 */
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly player: EntityId;
  /** 当时鼠标的世界坐标；给了就画准星，能看出「他在瞄哪」。 */
  readonly pointer?: { readonly x: number; readonly y: number };
  /** 事件表；给了就画出时间窗内的事件标记。 */
  readonly events?: readonly BattleEvent[];
  /** 播放头 tick；缺省用当前帧的 tick。 */
  readonly tick?: number;
  /** 事件在画面上停留的 tick 数；缺省 REPLAY_MARK_WINDOW。 */
  readonly markWindow?: number;
  /** 这一秒按下的键与鼠标按钮；非空时贴在玩家机甲上方。 */
  readonly chips?: readonly string[];
}

/** 辐能容量：与 flux-model.ts 的 120 同口径，条子才能和游戏里一样长。 */
const FLUX_CAPACITY = 120;

const MONO = 'ui-monospace, Consolas, monospace';

/** 弹丸槽位色：与 render-table.ts 的 projectileItems 同色（终结橙、支援紫、敌机红）。 */
function projectileColor(entry: ReplayEntry): string {
  const enemy = (entry.flags & REPLAY_FLAG_ENEMY) !== 0;
  if (enemy) return '#ff6b6b';
  const slot = slotOf(entry);
  if (slot === 1) return '#ff9f43';
  if (slot === 2) return '#d18cff';
  return '#ffd27a';
}

function colorOf(entry: ReplayEntry, player: EntityId): string {
  const enemy = (entry.flags & REPLAY_FLAG_ENEMY) !== 0;
  if (entry.kind === REPLAY_KIND_PROJECTILE) return projectileColor(entry);
  if (entry.kind === REPLAY_KIND_MECHA) return enemy ? '#ff9a7a' : (entry.entity === player ? '#9fd8ff' : '#cfe6ff');
  return '#d8d2c8';
}

function drawBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = '#0d0c0b';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#201d1a';
  ctx.lineWidth = 1;
  const step = width / 12;
  for (let x = step; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  const rowStep = height / 7;
  for (let y = rowStep; y < height; y += rowStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawShield(ctx: CanvasRenderingContext2D, entry: ReplayEntry, scale: number): void {
  ctx.strokeStyle = 'rgba(111,182,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(entry.x * scale, entry.y * scale, entry.size * 0.95 * scale, 0, Math.PI * 2);
  ctx.stroke();
}

function barText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string): void {
  ctx.font = '600 11px ' + MONO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(12,10,9,0.7)';
  const width = ctx.measureText(text).width + 4;
  ctx.fillRect(x - 2, y - 7, width, 13);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** 机甲的信息条：结构 + 辐能（软/硬分段），并给数字读数——3px 的细线读不出「还剩多少」。 */
function drawBars(ctx: CanvasRenderingContext2D, entry: ReplayEntry, scale: number): void {
  const width = Math.max(40, entry.size * scale * 2);
  const hullHeight = 7;
  const fluxHeight = 5;
  const gap = 2;
  const x = entry.x * scale - width / 2;
  const baseY = entry.y * scale - entry.size * scale * 0.72;
  const hullY = baseY - hullHeight - fluxHeight - gap;
  ctx.fillStyle = 'rgba(20,18,16,0.85)';
  ctx.fillRect(x - 1, hullY - 1, width + 2, hullHeight + 2);
  const hullRatio = entry.hullMax > 0 ? Math.max(0, Math.min(1, entry.hull / entry.hullMax)) : 0;
  ctx.fillStyle = hullRatio > 0.35 ? '#b8f28c' : '#ff9f43';
  ctx.fillRect(x, hullY, width * hullRatio, hullHeight);
  const fluxY = hullY + hullHeight + gap;
  ctx.fillStyle = 'rgba(20,18,16,0.85)';
  ctx.fillRect(x - 1, fluxY - 1, width + 2, fluxHeight + 2);
  const softRatio = Math.max(0, Math.min(1, entry.soft / FLUX_CAPACITY));
  const hardRatio = Math.max(0, Math.min(1, entry.hard / FLUX_CAPACITY));
  ctx.fillStyle = '#ffb347';
  ctx.fillRect(x, fluxY, width * softRatio, fluxHeight);
  ctx.fillStyle = '#ff4d4d';
  ctx.fillRect(x + width * softRatio, fluxY, width * Math.min(hardRatio, 1 - softRatio), fluxHeight);
  barText(ctx, Math.round(entry.hull) + '/' + Math.round(entry.hullMax), x, hullY - 8, '#d8f7bd');
  barText(ctx, String(Math.round(entry.soft + entry.hard)), x + width - 26, fluxY - 8, entry.hard > 0 ? '#ff8b8b' : '#ffcf8a');
}

function drawMarks(ctx: CanvasRenderingContext2D, entry: ReplayEntry, scale: number): void {
  const x = entry.x * scale;
  const y = entry.y * scale;
  const radius = entry.size * scale * 0.8;
  if ((entry.flags & REPLAY_FLAG_OVERLOAD) !== 0) {
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if ((entry.flags & REPLAY_FLAG_VENT) !== 0) {
    ctx.strokeStyle = 'rgba(111,182,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  if ((entry.flags & REPLAY_FLAG_SUPPRESSED) !== 0) {
    ctx.strokeStyle = '#c8a2ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - radius, y - radius);
    ctx.lineTo(x + radius, y + radius);
    ctx.stroke();
  }
}

function drawPointer(ctx: CanvasRenderingContext2D, pointer: { readonly x: number; readonly y: number }, scale: number): void {
  const x = pointer.x * scale;
  const y = pointer.y * scale;
  ctx.strokeStyle = 'rgba(251,146,60,0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 3, y);
  ctx.moveTo(x + 3, y);
  ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10);
  ctx.lineTo(x, y - 3);
  ctx.moveTo(x, y + 3);
  ctx.lineTo(x, y + 10);
  ctx.stroke();
}

function drawEntry(ctx: CanvasRenderingContext2D, entry: ReplayEntry, options: ReplayViewOptions, scale: number): void {
  const x = entry.x * scale;
  const y = entry.y * scale;
  const size = Math.max(3, entry.size * scale);
  ctx.save();
  ctx.translate(x, y);
  if (entry.kind === REPLAY_KIND_PROJECTILE) {
    ctx.fillStyle = projectileColor(entry);
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2.5, size * 0.4), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    ctx.rotate(entry.angle);
    ctx.fillStyle = colorOf(entry, options.player);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size / 2, -size / 2, size, size);
  }
  ctx.restore();
  if (entry.kind === REPLAY_KIND_MECHA) {
    if ((entry.flags & REPLAY_FLAG_SHIELD) !== 0) drawShield(ctx, entry, scale);
    drawMarks(ctx, entry, scale);
    drawBars(ctx, entry, scale);
  }
}

function playerEntry(frame: ReplayFrame, player: EntityId): ReplayEntry | undefined {
  return frame.entities.find((entry) => entry.entity === player && entry.kind === REPLAY_KIND_MECHA);
}

/** 画一帧历史画面：ctx 尺寸已由调用方设定，这里按世界坐标等比缩放。 */
export function drawReplayFrame(ctx: CanvasRenderingContext2D, frame: ReplayFrame, options: ReplayViewOptions): void {
  const { width, height } = ctx.canvas;
  drawBackdrop(ctx, width, height);
  const scale = Math.min(width / options.worldWidth, height / options.worldHeight);
  const offsetX = (width - options.worldWidth * scale) / 2;
  const offsetY = (height - options.worldHeight * scale) / 2;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  for (const entry of frame.entities) drawEntry(ctx, entry, options, scale);
  const tick = options.tick ?? frame.tick;
  const events = options.events ?? [];
  if (events.length > 0) {
    const marks = collectMarks(frame, events, tick, { windowTicks: options.markWindow ?? REPLAY_MARK_WINDOW });
    drawEventMarks(ctx, marks, scale);
  }
  if (options.pointer !== undefined) drawPointer(ctx, options.pointer, scale);
  if (options.chips !== undefined && options.chips.length > 0) {
    drawInputChips(ctx, options.chips, playerEntry(frame, options.player), scale);
  }
  ctx.restore();
}

const EVENT_COLORS: Readonly<Record<string, string>> = {
  shot: '#ffd27a',
  hit: '#ff6b6b',
  kill: '#ff9f43',
  overload: '#ff4d4d',
  vent: '#6fb6ff',
};

export interface ReplayTimelineOptions {
  readonly events: readonly BattleEvent[];
  readonly firstTick: number;
  readonly lastTick: number;
  readonly tick: number;
}

/** 画事件时间轴：每个事件一根短竖线，播放头压在当前 tick 上。 */
export function drawReplayTimeline(ctx: CanvasRenderingContext2D, options: ReplayTimelineOptions): void {
  const { width, height } = ctx.canvas;
  const span = Math.max(1, options.lastTick - options.firstTick);
  const xOf = (tick: number): number => ((tick - options.firstTick) / span) * width;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#15120f';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#2a2521';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  for (const event of options.events) {
    if (event.tick < options.firstTick || event.tick > options.lastTick) continue;
    const x = xOf(event.tick);
    ctx.strokeStyle = EVENT_COLORS[event.kind] ?? '#a8a29e';
    ctx.lineWidth = event.kind === 'kill' ? 2 : 1;
    const half = event.kind === 'shot' ? 2.5 : 4;
    ctx.beginPath();
    ctx.moveTo(x, height / 2 - half);
    ctx.lineTo(x, height / 2 + half);
    ctx.stroke();
  }
  const playhead = xOf(options.tick);
  ctx.strokeStyle = '#f2eee9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playhead, 0);
  ctx.lineTo(playhead, height);
  ctx.stroke();
}
