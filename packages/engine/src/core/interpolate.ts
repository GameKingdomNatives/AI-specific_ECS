/** 渲染插值（只影响显示，不进入逻辑与哈希）。 */
export interface Point {
  readonly x: number;
  readonly y: number;
}

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * clamp01(alpha);
}

/** 上一帧与当前 tick 之间插值；没有上一帧（新实体）时直接用当前值。 */
export function interpolatePoint(previous: Point | undefined, current: Point, alpha: number): Point {
  if (previous === undefined) {
    return { x: current.x, y: current.y };
  }
  return { x: lerp(previous.x, current.x, alpha), y: lerp(previous.y, current.y, alpha) };
}
