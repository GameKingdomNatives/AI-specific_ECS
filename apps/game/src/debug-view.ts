/** 调试叠加层开关：?debug=1 初始开启，F3 切换。 */
export interface DebugView {
  readonly enabled: boolean;
  toggle(): boolean;
  set(on: boolean): boolean;
}

export function createDebugView(initial: boolean): DebugView {
  let enabled = initial;
  window.addEventListener('keydown', (event) => {
    if (event.code === 'F3') {
      enabled = !enabled;
    }
  });
  return {
    get enabled(): boolean {
      return enabled;
    },
    toggle(): boolean {
      enabled = !enabled;
      return enabled;
    },
    set(on: boolean): boolean {
      enabled = on;
      return enabled;
    },
  };
}
