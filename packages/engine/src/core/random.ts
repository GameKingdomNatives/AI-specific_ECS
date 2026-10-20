/** 种子随机流：同一 seed + 同一 stream 名 → 同一序列；与调用顺序无关。 */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

function mixSeeds(seed: number, salt: number): number {
  let value = (seed ^ salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

export class Random {
  private state: number;
  private readonly baseSeed: number;

  constructor(seed: number) {
    this.baseSeed = seed >>> 0;
    this.state = seed >>> 0;
  }

  /** [0, 1) 的确定性浮点。 */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  int(maxExclusive: number): number {
    if (maxExclusive <= 0) {
      throw new Error('int 的上界必须为正');
    }
    return Math.floor(this.next() * maxExclusive);
  }

  /**
   * 派生独立流：由「基础种子 + 流名」决定，不受当前已抽取次数影响。
   * 这样系统顺序调整不会让另一个系统的随机序列整体漂移。
   */
  fork(streamName: string): Random {
    return new Random(mixSeeds(this.baseSeed, fnv1a(streamName)));
  }
}

/** 从种子与流名直接构造，避免为了 fork 先 new 一个对象。 */
export function stream(seed: number, streamName: string): Random {
  return new Random(mixSeeds(seed, fnv1a(streamName)));
}
