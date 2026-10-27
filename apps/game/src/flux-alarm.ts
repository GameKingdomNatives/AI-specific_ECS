import type { FluxState } from './game/flux-model.js';
import { warningLevel, type WarningLevel } from './game/flux-warning.js';

export interface FluxAlarmDeps {
  readonly getFlux: () => FluxState | undefined;
  readonly play: (id: string) => void;
}

/**
 * 辐能听感：只在「等级上升」时响一次，退回安全区再重置。
 * 不写世界、不进系统，纯表现层——回放与哈希不受影响。
 */
export function createFluxAlarm(deps: FluxAlarmDeps): { tick(): void; reset(): void } {
  let last: WarningLevel = 0;
  return {
    tick(): void {
      const flux = deps.getFlux();
      const level = flux === undefined ? 0 : warningLevel(flux);
      if (level > last) deps.play(level >= 2 ? 'error' : 'click');
      last = level;
    },
    reset(): void {
      last = 0;
    },
  };
}
