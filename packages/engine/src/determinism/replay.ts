import type { InputSnapshot } from '../ports/index.js';
import type { Recording, SerializedEvent } from './recording.js';
import { toSnapshot } from './recording.js';
import { hashHex } from './hash.js';

export interface ReplayHooks {
  /** 执行一个逻辑 tick；调用方负责把 input 交给自己的系统。 */
  step(tick: number, input: InputSnapshot): void;
  /** 当前世界状态的哈希，用于逐 tick 对比。 */
  hash(): number;
  /** 取走自上次调用以来产生的事件（按发生顺序）；不提供则不收集。 */
  events?: () => readonly SerializedEvent[];
}

export interface ReplayResult {
  readonly ticks: number;
  readonly hashes: readonly number[];
  readonly finalHash: number;
  /** null 表示录制里没有开局哈希（旧录制），无法判定。 */
  readonly startHashMatches: boolean | null;
  /** 重演过程中收集到的事件（未提供 events 钩子时为空）。 */
  readonly events: readonly SerializedEvent[];
}

/** 按录制逐 tick 重演；同一录制必须产出同一串哈希与同一串事件。 */
export function replay(recording: Recording, hooks: ReplayHooks): ReplayResult {
  const startHashMatches = recording.startHash === undefined
    ? null
    : hashHex(hooks.hash()) === recording.startHash;
  const hashes: number[] = [];
  const events: SerializedEvent[] = [];
  for (const tick of recording.ticks) {
    hooks.step(tick.tick, toSnapshot(tick));
    hashes.push(hooks.hash());
    if (hooks.events !== undefined) {
      events.push(...hooks.events());
    }
  }
  return {
    ticks: recording.ticks.length,
    hashes,
    finalHash: hashes[hashes.length - 1] ?? 0,
    startHashMatches,
    events,
  };
}

/** 返回首个偏离的 tick 下标；完全一致返回 null。 */
export function firstDivergence(actual: readonly number[], expected: readonly number[]): number | null {
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index += 1) {
    if (actual[index] !== expected[index]) {
      return index;
    }
  }
  return null;
}

function sameEvent(left: SerializedEvent | undefined, right: SerializedEvent | undefined): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return left.tick === right.tick
    && left.type === right.type
    && JSON.stringify(left.payload) === JSON.stringify(right.payload);
}

/** 事件级比对：类型或 payload（JSON 口径）任一不同即算偏离。 */
export function firstEventDivergence(
  actual: readonly SerializedEvent[],
  expected: readonly SerializedEvent[],
): { readonly index: number; readonly tick: number } | null {
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index += 1) {
    if (!sameEvent(actual[index], expected[index])) {
      return { index, tick: actual[index]?.tick ?? expected[index]?.tick ?? 0 };
    }
  }
  return null;
}
