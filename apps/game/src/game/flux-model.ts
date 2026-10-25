/**
 * 辐能状态机：纯函数，不依赖世界、渲染与输入端口。
 * 攻防共享同一资源池——开火产生软辐能，护盾承伤产生硬辐能；
 * 软辐能可被动消散，硬辐能必须关盾或主动排散才能清除。
 */
export interface FluxState {
  readonly soft: number;
  readonly hard: number;
  readonly overloadTicks: number;
}

export interface FluxInputs {
  readonly shieldActive: boolean;
  readonly venting: boolean;
}

/** 名义容量：超过即进入红线区。 */
export const FLUX_CAPACITY = 100;
/** 红线终点：到这里完全过载。 */
export const FLUX_REDLINE = 120;
export const OVERLOAD_TICKS = 150;
export const OVERLOAD_SOFT_DECAY = 0.6;
export const OVERLOAD_HARD_DECAY = 0.35;
/** 过载结束后保留的硬辐能：强迫玩家在解除过载后还要面对一次取舍。 */
export const HARD_AFTER_OVERLOAD = 50;
export const SOFT_DISSIPATION = 0.32;
/** 开盾时软辐能只能缓慢消散（护盾占用散热通道）。 */
export const SOFT_DISSIPATION_SHIELD = 0.11;
export const HARD_DISSIPATION = 0.4;
export const VENT_SOFT = 1.1;
export const VENT_HARD = 1.7;

export function createFlux(soft = 0, hard = 0): FluxState {
  return { soft, hard, overloadTicks: 0 };
}

export function fluxTotal(state: FluxState): number {
  return state.soft + state.hard;
}

export function fluxRatio(state: FluxState): number {
  return fluxTotal(state) / FLUX_CAPACITY;
}

export function isOverloaded(state: FluxState): boolean {
  return state.overloadTicks > 0;
}

/** 100% 以下满性能；100%–120% 线性衰减；过载为 0。 */
export function performanceFactor(state: FluxState): number {
  if (isOverloaded(state)) return 0;
  const total = fluxTotal(state);
  if (total <= FLUX_CAPACITY) return 1;
  if (total >= FLUX_REDLINE) return 0;
  return (FLUX_REDLINE - total) / (FLUX_REDLINE - FLUX_CAPACITY);
}

export function addSoft(state: FluxState, amount: number): FluxState {
  return { soft: state.soft + amount, hard: state.hard, overloadTicks: state.overloadTicks };
}

export function addHard(state: FluxState, amount: number): FluxState {
  return { soft: state.soft, hard: state.hard + amount, overloadTicks: state.overloadTicks };
}

function clampZero(value: number): number {
  return value > 0 ? value : 0;
}

function stepOverload(state: FluxState): FluxState {
  const ticks = state.overloadTicks - 1;
  if (ticks <= 0) {
    return { soft: 0, hard: HARD_AFTER_OVERLOAD, overloadTicks: 0 };
  }
  return {
    soft: clampZero(state.soft - OVERLOAD_SOFT_DECAY),
    hard: clampZero(state.hard - OVERLOAD_HARD_DECAY),
    overloadTicks: ticks,
  };
}

/**
 * 推进一个 tick：先判定入场时是否已达红线（伤害/开火可能在上一 tick 把辐能推过去），
 * 再消散。消散只会降低总量，因此不需要在末尾二次判定。
 */
export function stepFlux(state: FluxState, inputs: FluxInputs): FluxState {
  if (isOverloaded(state)) return stepOverload(state);
  if (fluxTotal(state) >= FLUX_REDLINE) {
    return { soft: state.soft, hard: state.hard, overloadTicks: OVERLOAD_TICKS };
  }
  const softDecay = inputs.shieldActive ? SOFT_DISSIPATION_SHIELD : SOFT_DISSIPATION;
  const soft = clampZero(state.soft - (inputs.venting ? VENT_SOFT : softDecay));
  const hard = clampZero(state.hard - (inputs.venting ? VENT_HARD : inputs.shieldActive ? 0 : HARD_DISSIPATION));
  return { soft, hard, overloadTicks: 0 };
}
