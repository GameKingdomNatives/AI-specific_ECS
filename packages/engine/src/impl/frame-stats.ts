/** 帧耗时环形统计：只保留最近 N 次，给出 last/avg/p95。 */
export interface FrameTiming {
  readonly last: number;
  readonly avg: number;
  readonly p95: number;
  readonly count: number;
}

export interface FrameStats {
  push(ms: number): void;
  get(): FrameTiming;
}

export function createFrameStats(capacity = 60): FrameStats {
  const window = Math.max(1, Math.floor(capacity));
  const samples = new Float64Array(window);
  let filled = 0;
  let cursor = 0;

  return {
    push(ms: number): void {
      if (!Number.isFinite(ms) || ms < 0) {
        return;
      }
      samples[cursor] = ms;
      cursor = (cursor + 1) % window;
      filled = Math.min(filled + 1, window);
    },
    get(): FrameTiming {
      if (filled === 0) {
        return { last: 0, avg: 0, p95: 0, count: 0 };
      }
      const lastIndex = (cursor - 1 + window) % window;
      const values: number[] = [];
      let sum = 0;
      for (let index = 0; index < filled; index += 1) {
        const value = samples[index] ?? 0;
        values.push(value);
        sum += value;
      }
      values.sort((left, right) => left - right);
      const p95Index = Math.min(values.length - 1, Math.floor(values.length * 0.95));
      return {
        last: samples[lastIndex] ?? 0,
        avg: sum / filled,
        p95: values[p95Index] ?? 0,
        count: filled,
      };
    },
  };
}
