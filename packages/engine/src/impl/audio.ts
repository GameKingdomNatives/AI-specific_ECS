import type { IAudio } from '../ports/index.js';

export interface AudioStats {
  readonly plays: number;
  readonly stops: number;
  readonly volume: number;
  readonly enabled: boolean;
}

export interface WebAudioStats extends AudioStats {
  readonly decoded: number;
  readonly failures: number;
  readonly started: number;
}

/** 最小结构化类型：只为可注入与可测试，不绑定具体 DOM 实现。 */
export interface AudioNodeLike {
  connect(target: AudioNodeLike): AudioNodeLike;
}

export interface GainNodeLike extends AudioNodeLike {
  readonly gain: { value: number };
}

export interface BufferSourceLike extends AudioNodeLike {
  buffer: unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

export interface AudioContextLike {
  readonly destination: AudioNodeLike;
  readonly currentTime: number;
  createGain(): GainNodeLike;
  createBufferSource(): BufferSourceLike;
  decodeAudioData(data: ArrayBuffer): Promise<unknown>;
}

export interface WebAudioOptions {
  /** 浏览器传 `() => new AudioContext()`；无浏览器环境返回 null 即静音回退。 */
  readonly contextFactory?: () => AudioContextLike | null;
  /** 资源加载器，默认 fetch(id) 取 ArrayBuffer；返回 null 表示放弃。 */
  readonly load?: (id: string) => Promise<ArrayBuffer | null>;
  readonly volume?: number;
  readonly enabled?: boolean;
}

export interface NullAudioOptions {
  /** 默认静音：没有资源与解码时，宁可无声也不抛错。 */
  readonly enabled?: boolean;
  readonly volume?: number;
}

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * 音频端口的占位实现：不加载、不解码、不发声，只维护状态并在统计里留痕。
 * 这样 UI／系统可以照常调用 play/stop，等真实后端接入时无需改调用方。
 */
export function createNullAudio(options: NullAudioOptions = {}): IAudio & { stats(): AudioStats } {
  const enabled = options.enabled ?? false;
  let volume = clamp(options.volume ?? 1);
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
      volume = clamp(next);
    },
    stats(): AudioStats {
      return { plays, stops, volume, enabled };
    },
  };
}

interface WebAudioState {
  enabled: boolean;
  volume: number;
  plays: number;
  stops: number;
  decoded: number;
  failures: number;
  started: number;
  context: AudioContextLike | null;
  master: GainNodeLike | null;
  readonly buffers: Map<string, unknown>;
  readonly active: Map<string, BufferSourceLike[]>;
  readonly options: WebAudioOptions;
}

function ensureContext(state: WebAudioState): AudioContextLike | null {
  if (state.context !== null) {
    return state.context;
  }
  try {
    state.context = state.options.contextFactory?.() ?? null;
  } catch {
    state.context = null;
  }
  if (state.context === null) {
    state.enabled = false;
    return null;
  }
  state.master = state.context.createGain();
  state.master.gain.value = state.volume;
  state.master.connect(state.context.destination);
  return state.context;
}

function defaultLoad(id: string): Promise<ArrayBuffer | null> {
  return fetch(id).then((response) => (response.ok ? response.arrayBuffer() : null));
}

async function loadBuffer(state: WebAudioState, id: string): Promise<unknown | null> {
  const cached = state.buffers.get(id);
  if (cached !== undefined) {
    return cached;
  }
  const context = ensureContext(state);
  if (context === null) {
    return null;
  }
  try {
    const loader = state.options.load ?? defaultLoad;
    const data = await loader(id);
    if (data === null) {
      state.failures += 1;
      return null;
    }
    const buffer = await context.decodeAudioData(data);
    state.buffers.set(id, buffer);
    state.decoded += 1;
    return buffer;
  } catch {
    state.failures += 1;
    return null;
  }
}

function startSource(state: WebAudioState, id: string, buffer: unknown, gainScale: number): void {
  const context = state.context;
  const master = state.master;
  if (context === null || master === null) {
    return;
  }
  const gain = context.createGain();
  gain.gain.value = clamp(gainScale);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(master);
  source.start();
  state.started += 1;
  const list = state.active.get(id) ?? [];
  list.push(source);
  state.active.set(id, list);
}

function playId(state: WebAudioState, id: string, volume: number | undefined): void {
  if (!state.enabled || ensureContext(state) === null) {
    return;
  }
  state.plays += 1;
  void loadBuffer(state, id).then((buffer) => {
    if (buffer !== null) {
      startSource(state, id, buffer, volume ?? 1);
    }
  });
}

function stopId(state: WebAudioState, id: string): void {
  state.stops += 1;
  for (const source of state.active.get(id) ?? []) {
    try {
      source.stop();
    } catch {
      // 已经自然结束的源再次 stop 会抛错，忽略即可。
    }
  }
  state.active.delete(id);
}

function setVolumeOf(state: WebAudioState, next: number): void {
  state.volume = clamp(next);
  if (state.master !== null) {
    state.master.gain.value = state.volume;
  }
}

function statsOf(state: WebAudioState): WebAudioStats {
  return {
    plays: state.plays,
    stops: state.stops,
    volume: state.volume,
    enabled: state.enabled,
    decoded: state.decoded,
    failures: state.failures,
    started: state.started,
  };
}

/**
 * WebAudio 后端：首次 play 才建上下文与解码；没有上下文（Node/拒绝授权）
 * 自动退化为静音，并保留统计。调用方无需区分两种后端。
 */
export function createWebAudio(options: WebAudioOptions = {}): IAudio & { stats(): WebAudioStats } {
  const state: WebAudioState = {
    enabled: options.enabled ?? true,
    volume: clamp(options.volume ?? 1),
    plays: 0,
    stops: 0,
    decoded: 0,
    failures: 0,
    started: 0,
    context: null,
    master: null,
    buffers: new Map<string, unknown>(),
    active: new Map<string, BufferSourceLike[]>(),
    options,
  };
  return {
    play: (id, volume) => playId(state, id, volume),
    stop: (id) => stopId(state, id),
    setVolume: (next) => setVolumeOf(state, next),
    stats: () => statsOf(state),
  };
}
