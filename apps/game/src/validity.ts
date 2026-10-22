/** 单局有效性：系统熔断后整局 invalid，录制停止（§9 脏局规则）。 */
export interface RunState {
  readonly valid: boolean;
  /** 首次失效返回 true，重复调用返回 false（便于只记一次日志）。 */
  markInvalid(): boolean;
}

export function createRunState(): RunState {
  let valid = true;
  return {
    get valid(): boolean {
      return valid;
    },
    markInvalid(): boolean {
      if (!valid) {
        return false;
      }
      valid = false;
      return true;
    },
  };
}
