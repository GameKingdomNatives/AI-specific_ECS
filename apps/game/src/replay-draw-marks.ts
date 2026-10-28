/**
 * 回放画面上的「事件标记」与「操作标签」：回答「发生了什么、发生在哪、我当时按了什么」。
 *
 * 与实体绘制分开，是因为这两层只在时间窗内出现，且要在实体之上——
 * 实体是历史，标记是这一秒的注解。
 */

import type { ReplayMark } from './game/replay-events.js';

const MONO = 'ui-monospace, Consolas, monospace';

const MARK_COLORS: Readonly<Record<string, string>> = {
  shot: '#ffd27a',
  hit: '#ff6b6b',
  kill: '#ff9f43',
  overload: '#ff4d4d',
  vent: '#6fb6ff',
};

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, alpha: number): void {
  if (text === '') return;
  ctx.font = '600 12px ' + MONO;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  const width = ctx.measureText(text).width + 8;
  ctx.globalAlpha = Math.min(1, alpha + 0.15);
  ctx.fillStyle = 'rgba(12,10,9,0.72)';
  ctx.fillRect(x - width / 2, y - 15, width, 15);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number, width = 2): void {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawOne(ctx: CanvasRenderingContext2D, mark: ReplayMark, x: number, y: number): void {
  const color = MARK_COLORS[mark.kind] ?? '#a8a29e';
  const alpha = 0.28 + 0.72 * mark.weight;
  const radius = 7 + (1 - mark.weight) * 18;
  if (mark.kind === 'kill') {
    ring(ctx, x, y, radius, color, alpha, 2.5);
    ring(ctx, x, y, radius * 0.55, color, alpha, 1.5);
  } else if (mark.kind === 'hit') {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ring(ctx, x, y, radius, color, alpha, 1.5);
  } else if (mark.kind === 'shot') {
    ring(ctx, x, y, radius * 0.6, color, alpha * 0.9, 1.5);
  } else {
    ring(ctx, x, y, radius, color, alpha, 2);
  }
  label(ctx, mark.label, x, y - radius - 2, color, alpha);
}

/** 把时间窗内的事件画在发生的地方；越新越亮、越大。 */
export function drawEventMarks(ctx: CanvasRenderingContext2D, marks: readonly ReplayMark[], scale: number): void {
  for (const mark of marks) drawOne(ctx, mark, mark.x * scale, mark.y * scale);
}

/** 操作标签：贴在玩家机甲上方，回答「这一秒我在做什么」。 */
export function drawInputChips(ctx: CanvasRenderingContext2D, chips: readonly string[], player: { readonly x: number; readonly y: number; readonly size: number } | undefined, scale: number): void {
  if (chips.length === 0) return;
  const text = chips.join(' ');
  ctx.font = '600 12px ' + MONO;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = ctx.measureText(text).width + 14;
  const height = 20;
  const x = player === undefined ? 90 : player.x * scale;
  const y = player === undefined ? 26 : player.y * scale - player.size * scale * 0.72 - 34;
  ctx.fillStyle = 'rgba(12,10,9,0.78)';
  ctx.strokeStyle = '#3a332d';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - height / 2, width, height, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fb923c';
  ctx.fillText(text, x, y + 1);
}
