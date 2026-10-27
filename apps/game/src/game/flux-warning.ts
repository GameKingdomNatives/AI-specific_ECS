/**
 * 辐能警告分级：把「什么时候该停手」变成玩家不需要读条就能感知的信号。
 * 纯函数，不依赖世界与渲染；HUD 与音频共用同一套阈值，避免两处说法不一致。
 */
import { FLUX_CAPACITY, FLUX_REDLINE, fluxTotal, isOverloaded, type FluxState } from './flux-model.js';

export const WARN_LEVEL_NONE = 0;
export const WARN_LEVEL_HIGH = 1;
export const WARN_LEVEL_REDLINE = 2;
export const WARN_LEVEL_OVERLOAD = 3;

/** 预警线：总辐能到容量的 70%（84/120）就开始给提示，否则只剩最后 20 点才反应。 */
export const WARN_RATIO = 0.7;

export type WarningLevel = 0 | 1 | 2 | 3;

export function warningLevel(state: FluxState): WarningLevel {
  if (isOverloaded(state)) return WARN_LEVEL_OVERLOAD;
  const total = fluxTotal(state);
  if (total >= FLUX_CAPACITY) return WARN_LEVEL_REDLINE;
  if (total >= FLUX_CAPACITY * WARN_RATIO) return WARN_LEVEL_HIGH;
  return WARN_LEVEL_NONE;
}

/** 玩家视野内的一句话：说清「现在什么状态、还要几秒」。 */
export function warningText(state: FluxState): string {
  const level = warningLevel(state);
  if (level === WARN_LEVEL_OVERLOAD) return `过载 ${(state.overloadTicks / 60).toFixed(1)}s`;
  if (level === WARN_LEVEL_REDLINE) return `红区 ${Math.round(fluxTotal(state))} / ${FLUX_REDLINE} · 输出衰减`;
  if (level === WARN_LEVEL_HIGH) return `辐能 ${Math.round(fluxTotal(state))} / ${FLUX_REDLINE}`;
  return '';
}

/** 0–1 的呼吸系数：越危险跳得越快，给渲染做闪烁与边缘脉冲。 */
export function warningPulse(nowTick: number, level: WarningLevel): number {
  if (level === WARN_LEVEL_NONE) return 0;
  const period = level === WARN_LEVEL_OVERLOAD ? 12 : level === WARN_LEVEL_REDLINE ? 24 : 48;
  return 0.5 + 0.5 * Math.sin((nowTick / period) * Math.PI * 2);
}
