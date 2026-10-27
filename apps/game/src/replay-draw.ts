/**
 * 复盘面板的画面：把记录下来的**历史帧**画成俯视图，并把事件摊到时间轴条上。
 *
 * 只读 `ReplayFrame` 与总线事件，不碰世界、不跑系统——所以画出来的东西永远是当时的那一帧。
 * 颜色沿用 `render-table.ts` 的阵营色，玩家与敌人一眼能分开。
 */

import type { EntityId } from 'agent-specific_ecs/core';
import type { BattleEvent } from './game/battle-review.js';
import { REPLAY_FLAG_ENEMY, REPLAY_FLAG_OVERLOAD, REPLAY_FLAG_SHIELD, REPLAY_FLAG_SUPPRESSED, REPLAY_FLAG_VENT, REPLAY_KIND_MECHA, REPLAY_KIND_PROJECTILE, type ReplayEntry, type ReplayFrame } from './game/replay-frames.js';

export interface ReplayViewOptions {
  /** 世界坐标尺寸（1920×1080），画布按比例缩放。 */
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly player: EntityId;
  /** 当时鼠标的世界坐标；给了就画准星，能看出「他在瞄哪」。 */
  readonly pointer?: { readonly x: number; readonly y: number };
}

/** 辐能容量：与 `flux-model.ts` 的 120 同口径，条子才能和游戏里一样长。 */
const FLUX_CAPACITY = 120;

function colorOf(entry: ReplayEntry, player: EntityId): string {
  const enemy = (entry.flags & REPLAY_FLAG_ENEMY) !== 0;
  if (entry.kind === REPLAY_KIND_PROJECTILE) return enemy ? '#ff6b6b' : '#ffd27a';
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

function drawBars(ctx: CanvasRenderingContext2D, entry: ReplayEntry, scale: number): void {
  const width = Math.max(18, entry.size * scale);
  const height = 3;
  const x = entry.x * scale - width / 2;
  const y = entry.y * scale - entry.size * scale * 0.72;
  ctx.fillStyle = 'rgba(20,18,16,0.82)';
  ctx.fillRect(x, y, width, height);
  const hullRatio = entry.hullMax > 0 ? Math.max(0, Math.min(1, entry.hull / entry.hullMax)) : 0;
  ctx.fillStyle = hullRatio > 0.35 ? '#b8f28c' : '#ff9f43';
  ctx.fillRect(x, y, width * hullRatio, height);
  const fluxRatio = Math.max(0, Math.min(1, (entry.soft + entry.hard) / FLUX_CAPACITY));
  if (fluxRatio > 0) {
    ctx.fillStyle = entry.hard > 0 ? '#ff4d4d' : '#ffb347';
    ctx.fillRect(x, y + height + 1, width * fluxRatio, 2);
  }
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
    ctx.fillStyle = colorOf(entry, options.player);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, size * 0.35), 0, Math.PI * 2);
    ctx.fill();
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

/** 画一帧历史画面：`ctx` 尺寸已由调用方设定，这里按世界坐标等比缩放。 */
export function drawReplayFrame(ctx: CanvasRenderingContext2D, frame: ReplayFrame, options: ReplayViewOptions): void {
  const { width, height } = ctx.canvas;
  drawBackdrop(ctx, width, height);
  const scale = Math.min(width / options.worldWidth, height / options.worldHeight);
  const offsetX = (width - options.worldWidth * scale) / 2;
  const offsetY = (height - options.worldHeight * scale) / 2;
  ctx.save();
  ctx.translate(offsetX, offsetY);
  for (const entry of frame.entities) drawEntry(ctx, entry, options, scale);
  if (options.pointer !== undefined) drawPointer(ctx, options.pointer, scale);
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
