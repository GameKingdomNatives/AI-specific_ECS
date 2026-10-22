export interface SchedulerOptions {
  /** 同一系统连续失败多少次后熔断禁用，默认 3。 */
  readonly maxConsecutiveFailures?: number;
  /** 每次系统抛错时回调；用于日志、诊断 dump 与面板展示。 */
  readonly onSystemError?: (systemName: string, error: unknown, tick: number) => void;
  /** §4 所有权守卫：开启后系统只能写声明过的组件（默认关，dev/测试开启）。 */
  readonly enforceWrites?: boolean;
  /** 每系统耗时环形窗口大小，默认 60。 */
  readonly timingCapacity?: number;
}

export interface SystemFailure {
  readonly system: string;
  readonly error: unknown;
  readonly tick: number;
}
