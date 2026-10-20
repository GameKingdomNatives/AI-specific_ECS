import type { InputSnapshot } from '../ports/index.js';
import type { Recording } from './recording.js';
import { toSnapshot } from './recording.js';
import { hashHex } from './hash.js';

export interface ReplayHooks {
  /** 执行一个逻辑 tick；调用方负责把 input 交给自己的系统。 */
  step(tick: number, input: InputSnapshot): void;
  /** 当前世界状态的哈希，用于逐 tick 对比。 */
  hash(): number;
}

export interface ReplayResult {
  readonly ticks: number;
  readonly hashes: readonly number[];
  readonly finalHash: number;
  /** null 表示录制里没有开局哈希（旧录制），无法判定。 */
  readonly startHashMatches: boolean | null;
}

/** 按录制逐 tick 重演；同一录制必须产出同一串哈希。 */
export function replay(recording: Recording, hooks: ReplayHooks): ReplayResult {
  const startHashMatches = recording.startHash === undefined
    ? null
    : hashHex(hooks.hash()) === recording.startHash;
  const hashes: number[] = [];
  for (const tick of recording.ticks) {
    hooks.step(tick.tick, toSnapshot(tick));
    hashes.push(hooks.hash());
  }
  return {
    ticks: recording.ticks.length,
    hashes,
    finalHash: hashes[hashes.length - 1] ?? 0,
    startHashMatches,
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
