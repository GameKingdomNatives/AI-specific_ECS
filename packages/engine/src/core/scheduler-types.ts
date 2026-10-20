export interface SchedulerOptions {
  /** 同一系统连续失败多少次后熔断禁用，默认 3。 */
  readonly maxConsecutiveFailures?: number;
  /** 每次系统抛错时回调；用于日志、诊断 dump 与面板展示。 */
  readonly onSystemError?: (systemName: string, error: unknown, tick: number) => void;
}

export interface SystemFailure {
  readonly system: string;
  readonly error: unknown;
  readonly tick: number;
}
