/**
 * 回放画面的事件标记：把「事件流」摆回它发生的位置。
 *
 * 纯计算——给定当前帧、事件表与播放头 tick，算出该在哪些坐标画什么字。
 * 画面之外的逻辑（淡出窗口、坐标兜底）都在这里，绘制层只负责画。
 */

import type { BattleEvent } from './battle-review.js';
import { REPLAY_FLAG_ENEMY, type ReplayEntry, type ReplayFrame } from './replay-frames.js';

/** 事件在画面上停留的 tick 数；离开窗口就退场，避免整屏标注。 */
export const REPLAY_MARK_WINDOW = 18;

export interface ReplayMark {
  readonly tick: number;
  /** 距离播放头多少 tick（0 = 就在此刻）。 */
  readonly age: number;
  /** 1 → 0 的强度，越新越亮。 */
  readonly weight: number;
  readonly kind: BattleEvent['kind'];
  readonly x: number;
  readonly y: number;
  /** 事件主体是不是敌方：决定标记颜色（开火看射手，命中看受击方）。 */
  readonly enemy: boolean;
  readonly label: string;
}

export interface ReplayMarkOptions {
  /** 事件可见窗口（tick），缺省 `REPLAY_MARK_WINDOW`。 */
  readonly windowTicks?: number;
}

/** 事件主体：开火是射手，其余是受击/当事人。 */
function subjectOf(event: BattleEvent): number {
  return event.target ?? event.entity;
}

function labelOf(event: BattleEvent): string {
  if (event.kind === 'shot') return event.slot === undefined ? '开火' : '开火 槽' + event.slot;
  if (event.kind === 'kill') return '击毁';
  if (event.kind === 'overload') return '过载';
  if (event.kind === 'vent') return '排散';
  const parts = ['命中'];
  if (event.damage !== undefined) parts.push('-' + event.damage);
  if (event.shielded === true) parts.push('穿盾');
  if (event.ew === true) parts.push('EW');
  return parts.join(' ');
}

function findEntry(frame: ReplayFrame, entity: number): ReplayEntry | undefined {
  return frame.entities.find((entry) => entry.entity === entity);
}

/** 事件位置：优先用事件自带的 x/y，缺失时用当前帧里该实体的位置兜底。 */
function pointOf(event: BattleEvent, frame: ReplayFrame): { x: number; y: number } | null {
  if (event.x !== undefined && event.y !== undefined) return { x: event.x, y: event.y };
  const entry = findEntry(frame, subjectOf(event));
  return entry === undefined ? null : { x: entry.x, y: entry.y };
}

/**
 * 取播放头之前 `windowTicks` 内的事件，换算成画面标记。
 * 早于窗口的事件不再返回——回放要回答「刚刚发生了什么」，不是把整局钉在屏幕上。
 */
export function collectMarks(frame: ReplayFrame, events: readonly BattleEvent[], tick: number, options: ReplayMarkOptions = {}): ReplayMark[] {
  const windowTicks = Math.max(1, Math.floor(options.windowTicks ?? REPLAY_MARK_WINDOW));
  const marks: ReplayMark[] = [];
  for (const event of events) {
    const age = tick - event.tick;
    if (age < 0 || age > windowTicks) continue;
    const point = pointOf(event, frame);
    if (point === null) continue;
    const entry = findEntry(frame, subjectOf(event));
    marks.push({
      tick: event.tick,
      age,
      weight: 1 - age / windowTicks,
      kind: event.kind,
      x: point.x,
      y: point.y,
      enemy: entry !== undefined && (entry.flags & REPLAY_FLAG_ENEMY) !== 0,
      label: labelOf(event),
    });
  }
  return marks;
}
