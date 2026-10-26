import type { HitMark } from './render-table.js';

/** 命中飘字的环形缓冲：只保留最近 24 条，避免长时间战斗后无限增长。 */
export interface HitMarks {
  readonly list: HitMark[];
  /** 记录一次命中事件；返回槽位号，形状不合法时返回 null。 */
  handle(event: unknown, tick: number): number | null;
}

export function createHitMarks(limit = 24): HitMarks {
  const list: HitMark[] = [];
  return {
    list,
    handle(event, tick) {
      const e = (event ?? {}) as Record<string, unknown>;
      const x = Number(e.x);
      const y = Number(e.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const slot = Number(e.slot ?? 0);
      list.push({
        x,
        y,
        damage: Number(e.damage ?? 0),
        slot,
        shielded: e.shielded === true,
        ew: e.ew === true,
        tick,
      });
      if (list.length > limit) list.shift();
      return slot;
    },
  };
}
