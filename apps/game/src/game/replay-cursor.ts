/**
 * 回放的播放游标：把「播放/暂停/倍速/拖动时间轴」压成 tick 的推进与夹取。
 *
 * 与帧数据层分开：帧层只回答「某一 tick 画面上有什么」，游标只回答「现在该看哪一 tick」。
 * 因此面板、导出、测试都能单独驱动它，也不需要世界或渲染器。
 */

import type { ReplayFrame, ReplayFrames } from './replay-frames.js';

/** 一 tick 的默认时长（60Hz 固定步进，与 `main.ts` 的 STEP_MS 同源）。 */
export const REPLAY_TICK_MS = 1000 / 60;

/** 面板提供的档位；游标本身接受任意正数，这里只是默认值。 */
export const REPLAY_SPEEDS = [0.5, 1, 2, 4] as const;

export interface ReplayCursorOptions {
  /** 一 tick 的毫秒数；缺省 60Hz。 */
  readonly tickMs?: number;
  /** 初始倍速；缺省 1。 */
  readonly speed?: number;
}

export interface ReplayCursor {
  /** 当前停住的 tick（已取整并夹在记录范围内）。 */
  readonly tick: number;
  readonly playing: boolean;
  readonly speed: number;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  /** 时间轴进度 0..1；没有记录时为 0。 */
  readonly progress: number;
  /** 跳到指定 tick（夹取）；返回实际落点。 */
  seek(tick: number): number;
  /** 相对跳动 n 个 tick（负数为后退）；会暂停。 */
  step(deltaTicks: number): number;
  play(): void;
  pause(): void;
  toggle(): void;
  /** 设置倍速（夹在 0.05..16）；返回生效值。 */
  setSpeed(speed: number): number;
  /** 播放中按真实时长推进；返回新的 tick。 */
  advance(deltaMs: number): number;
  /** 当前 tick 对应的一帧（可就近取）；没有记录时 null。 */
  frame(): ReplayFrame | null;
  /** 当前 tick 在帧序列里的下标；-1 表示没有记录。 */
  index(): number;
  /** 重新从记录两端取边界（记录在播中还会增长）。 */
  refresh(): void;
}

function clamp(value: number, low: number, high: number): number {
  if (value < low) return low;
  if (value > high) return high;
  return value;
}

function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 1;
  return clamp(speed, 0.05, 16);
}

interface CursorState {
  readonly frames: ReplayFrames;
  readonly tickMs: number;
  /** 浮点位置：倍速 0.5 时也能累积出正确的 tick。 */
  position: number;
  playing: boolean;
  speed: number;
  first: number;
  last: number;
}

function bounds(frames: ReplayFrames): { first: number; last: number } {
  return frames.frames === 0 ? { first: 0, last: 0 } : { first: frames.firstTick, last: frames.lastTick };
}

function snap(state: CursorState): number {
  if (state.frames.frames === 0) return 0;
  return Math.round(clamp(state.position, state.first, state.last));
}

function syncBounds(state: CursorState): void {
  const next = bounds(state.frames);
  state.first = next.first;
  state.last = next.last;
  if (state.frames.frames === 0) {
    state.position = 0;
    state.playing = false;
    return;
  }
  state.position = clamp(state.position, state.first, state.last);
}

function play(state: CursorState): void {
  syncBounds(state);
  if (state.frames.frames === 0) return;
  // 播到尾部再按播放＝从头看这一局，而不是原地卡住。
  if (state.position >= state.last) state.position = state.first;
  state.playing = true;
}

function step(state: CursorState, deltaTicks: number): number {
  syncBounds(state);
  state.playing = false;
  if (state.frames.frames === 0) return 0;
  const delta = Number.isFinite(deltaTicks) ? Math.round(deltaTicks) : 0;
  state.position = clamp(Math.round(state.position) + delta, state.first, state.last);
  return snap(state);
}

function advance(state: CursorState, deltaMs: number): number {
  syncBounds(state);
  if (!state.playing || state.frames.frames === 0) return snap(state);
  const ms = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
  state.position = clamp(state.position + (ms / state.tickMs) * state.speed, state.first, state.last);
  if (state.position >= state.last) {
    state.position = state.last;
    state.playing = false;
  }
  return snap(state);
}

function seekTo(state: CursorState, tick: number): number {
  syncBounds(state);
  if (state.frames.frames === 0) return 0;
  state.playing = false;
  state.position = clamp(Number.isFinite(tick) ? tick : state.first, state.first, state.last);
  return snap(state);
}

function toggle(state: CursorState): void {
  if (state.playing) state.playing = false;
  else play(state);
}

function setSpeed(state: CursorState, speed: number): number {
  state.speed = clampSpeed(speed);
  return state.speed;
}

function currentFrame(state: CursorState): ReplayFrame | null {
  if (state.frames.frames === 0) return null;
  return state.frames.frameAtOrBefore(snap(state));
}

function currentIndex(state: CursorState): number {
  if (state.frames.frames === 0) return -1;
  return state.frames.indexAtOrBefore(snap(state));
}

function progressOf(state: CursorState): number {
  if (state.frames.frames === 0 || state.last <= state.first) return 0;
  return (snap(state) - state.first) / (state.last - state.first);
}

function makeCursor(state: CursorState): ReplayCursor {
  return {
    get tick(): number {
      return snap(state);
    },
    get playing(): boolean {
      return state.playing;
    },
    get speed(): number {
      return state.speed;
    },
    get atStart(): boolean {
      return state.frames.frames === 0 || snap(state) <= state.first;
    },
    get atEnd(): boolean {
      return state.frames.frames === 0 || snap(state) >= state.last;
    },
    get progress(): number {
      return progressOf(state);
    },
    seek: (tick: number) => seekTo(state, tick),
    step: (deltaTicks: number) => step(state, deltaTicks),
    play: () => play(state),
    pause: () => {
      state.playing = false;
    },
    toggle: () => toggle(state),
    setSpeed: (speed: number) => setSpeed(state, speed),
    advance: (deltaMs: number) => advance(state, deltaMs),
    frame: () => currentFrame(state),
    index: () => currentIndex(state),
    refresh: () => syncBounds(state),
  };
}

export function createReplayCursor(frames: ReplayFrames, options: ReplayCursorOptions = {}): ReplayCursor {
  const tickMs = Number.isFinite(options.tickMs) && (options.tickMs ?? 0) > 0 ? Number(options.tickMs) : REPLAY_TICK_MS;
  const initial = frames.frames === 0 ? 0 : frames.firstTick;
  const state: CursorState = {
    frames,
    tickMs,
    position: initial,
    playing: false,
    speed: clampSpeed(options.speed ?? 1),
    first: initial,
    last: initial,
  };
  syncBounds(state);
  return makeCursor(state);
}
