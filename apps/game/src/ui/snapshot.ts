/** UI 只读快照：引擎每帧（降频）产出的纯数据，不含 Pixi 对象与函数。 */
export interface UiSnapshot {
  readonly tick: number;
  readonly entities: number;
  readonly bullets: number;
  readonly kills: number;
  readonly bodies: number;
  readonly recordingTicks: number;
  readonly dumps: number;
  readonly audioPlays: number;
  readonly hash: string;
  readonly dataStatus: string;
  readonly mode: string;
  readonly note: string;
}

export type UiListener = () => void;

export interface UiStore {
  get(): UiSnapshot;
  /** 只允许部分更新，UI 永远拿到完整快照。 */
  update(patch: Partial<UiSnapshot>): void;
  subscribe(listener: UiListener): () => void;
}

export function createUiStore(initial: UiSnapshot): UiStore {
  let snapshot = initial;
  const listeners = new Set<UiListener>();
  return {
    get(): UiSnapshot {
      return snapshot;
    },
    update(patch: Partial<UiSnapshot>): void {
      snapshot = { ...snapshot, ...patch };
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener: UiListener): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
