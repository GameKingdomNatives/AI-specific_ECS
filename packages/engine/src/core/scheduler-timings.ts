import { createSystemStats } from './system-stats.js';
import type { SystemStats, SystemTiming } from './system-stats.js';

export interface SystemTimingEntry extends SystemTiming {
  readonly system: string;
}

/** 每系统耗时簿：按系统名维护环形窗口，报告顺序由调用方给定。 */
export class TimingBook {
  private readonly entries = new Map<string, SystemStats>();
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  record(systemName: string, ms: number): void {
    let stats = this.entries.get(systemName);
    if (stats === undefined) {
      stats = createSystemStats(this.capacity);
      this.entries.set(systemName, stats);
    }
    stats.push(ms);
  }

  report(names: readonly string[]): readonly SystemTimingEntry[] {
    const out: SystemTimingEntry[] = [];
    for (const name of names) {
      const stats = this.entries.get(name);
      if (stats !== undefined) {
        out.push({ system: name, ...stats.get() });
      }
    }
    return out;
  }
}
