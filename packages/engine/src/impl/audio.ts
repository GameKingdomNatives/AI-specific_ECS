import type { IAudio } from '../ports/index.js';

export interface AudioStats {
  readonly plays: number;
  readonly stops: number;
  readonly volume: number;
  readonly enabled: boolean;
}

export interface NullAudioOptions {
  /** 默认静音：没有资源与解码时，宁可无声也不抛错。 */
  readonly enabled?: boolean;
  readonly volume?: number;
}

/**
 * 音频端口的占位实现：不加载、不解码、不发声，只维护状态并在统计里留痕。
 * 这样 UI／系统可以照常调用 play/stop，等真实后端接入时无需改调用方。
 */
export function createNullAudio(options: NullAudioOptions = {}): IAudio & { stats(): AudioStats } {
  const enabled = options.enabled ?? false;
  let volume = Math.min(1, Math.max(0, options.volume ?? 1));
  let plays = 0;
  let stops = 0;
  return {
    play(_id: string, _volume?: number): void {
      if (!enabled) {
        return;
      }
      plays += 1;
    },
    stop(_id: string): void {
      stops += 1;
    },
    setVolume(next: number): void {
      volume = Math.min(1, Math.max(0, next));
    },
    stats(): AudioStats {
      return { plays, stops, volume, enabled };
    },
  };
}
