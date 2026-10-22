/** 相机抖动的纯数学部分：随时间衰减的双正弦偏移（屏幕像素）。 */
export interface ShakeOffset {
  readonly x: number;
  readonly y: number;
}

export function shakeOffset(elapsedMs: number, durationMs: number, amplitude: number): ShakeOffset {
  if (!(durationMs > 0) || !(amplitude > 0) || elapsedMs < 0 || elapsedMs >= durationMs) {
    return { x: 0, y: 0 };
  }
  const decay = 1 - elapsedMs / durationMs;
  const seconds = elapsedMs / 1000;
  return {
    x: amplitude * decay * Math.sin(seconds * 62.8),
    y: amplitude * decay * Math.cos(seconds * 47.1),
  };
}
