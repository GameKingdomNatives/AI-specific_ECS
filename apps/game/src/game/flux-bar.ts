import { FLUX_CAPACITY, FLUX_REDLINE } from './flux-model.js';

/** 辐能条几何：只做纯计算，渲染层不再自己算位置（P2b 的根因就是两段中心各算各的）。 */
export interface FluxBarLayout {
  readonly width: number;
  readonly soft: { readonly x: number; readonly width: number };
  readonly hard: { readonly x: number; readonly width: number };
  /** 容量线（100/120）在条内的横坐标。 */
  readonly capacityX: number;
  /** 红区起点（容量线）到右端的宽度。 */
  readonly redZoneWidth: number;
  /** 总辐能占过载线的比例，满格 = 过载。 */
  readonly totalRatio: number;
}

/**
 * 满格 = 过载线 120；100 处画容量刻线。
 * 软段在前、硬段紧随其后；两段永不重叠，总宽 = min(1, (soft+hard)/120) × width。
 */
export function layoutFluxBar(soft: number, hard: number, width = 64): FluxBarLayout {
  const safeSoft = Math.max(0, soft);
  const safeHard = Math.max(0, hard);
  const scale = width / FLUX_REDLINE;
  const softWidth = Math.min(width, safeSoft * scale);
  const hardWidth = Math.min(width - softWidth, safeHard * scale);
  const capacityX = (FLUX_CAPACITY / FLUX_REDLINE) * width;
  return {
    width,
    soft: { x: 0, width: softWidth },
    hard: { x: softWidth, width: hardWidth },
    capacityX,
    redZoneWidth: width - capacityX,
    totalRatio: Math.min(1, (safeSoft + safeHard) / FLUX_REDLINE),
  };
}
