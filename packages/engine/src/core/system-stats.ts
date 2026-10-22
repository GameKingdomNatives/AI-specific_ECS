/** 每系统耗时的环形统计（纯逻辑，不依赖浏览器）。 */
export interface SystemTiming {
  readonly last: number;
  readonly avg: number;
  readonly p95: number;
  readonly count: number;
}

export interface SystemStats {
  push(ms: number): void;
  get(): SystemTiming;
}

export function createSystemStats(capacity = 60): SystemStats {
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
    get(): SystemTiming {
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
      return {
        last: samples[lastIndex] ?? 0,
        avg: sum / filled,
        p95: values[Math.min(values.length - 1, Math.floor(values.length * 0.95))] ?? 0,
        count: filled,
      };
    },
  };
}
