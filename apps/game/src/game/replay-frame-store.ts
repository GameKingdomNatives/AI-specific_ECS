/**
 * 回放帧的底层存储：按需翻倍的 Float32/Uint8 双数组 + 定长步进读写。
 * 只负责「内存里的字节怎么摆」，不关心世界里有什么实体。
 */

/** 每个实体写 9 个数：x / y / 尺寸 / 朝向 / 结构 / 结构上限 / 软辐能 / 硬辐能 / 实体号。 */
export const REPLAY_STRIDE = 9;

export const KIND_MASK = 7;

export interface Storage {
  values: Float32Array;
  flags: Uint8Array;
  used: number;
}

export function createStorage(): Storage {
  return { values: new Float32Array(128 * REPLAY_STRIDE), flags: new Uint8Array(128), used: 0 };
}

export function grow(storage: Storage, needed: number): void {
  if (needed <= storage.flags.length) return;
  let size = Math.max(64, storage.flags.length * 2);
  while (size < needed) size *= 2;
  const values = new Float32Array(size * REPLAY_STRIDE);
  values.set(storage.values);
  const flags = new Uint8Array(size);
  flags.set(storage.flags);
  storage.values = values;
  storage.flags = flags;
}

export function valueAt(storage: Storage, index: number): number {
  return storage.values[index] ?? 0;
}

export function flagAt(storage: Storage, slot: number): number {
  return storage.flags[slot] ?? 0;
}

export function writeSlot(storage: Storage, slot: number, values: readonly number[], flag: number): void {
  const base = slot * REPLAY_STRIDE;
  for (let index = 0; index < values.length; index += 1) storage.values[base + index] = values[index] ?? 0;
  storage.flags[slot] = flag;
}
