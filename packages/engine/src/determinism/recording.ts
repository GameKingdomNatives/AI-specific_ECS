import type { EventRecord } from '../core/events.js';
import type { InputSnapshot } from '../ports/index.js';

export interface SerializedInput {
  readonly tick: number;
  readonly keys: readonly string[];
  readonly buttons: readonly number[];
  readonly pointer: { readonly x: number; readonly y: number };
}

/** 事件级录制：只保留可 JSON 化的字段，顺序即发生顺序。 */
export interface SerializedEvent {
  readonly tick: number;
  readonly type: string;
  readonly payload: unknown;
}

export interface Recording {
  /** 1 = 只有输入；2 = 输入 + 事件。 */
  readonly version: 1 | 2;
  readonly seed: number;
  /** 开局世界哈希：用于判断录制是否来自「干净开局」。 */
  readonly startHash?: string;
  readonly ticks: readonly SerializedInput[];
  /** 仅 version 2 存在；空数组表示「明确录制了零事件」。 */
  readonly events?: readonly SerializedEvent[];
}

export function serializeInput(tick: number, input: InputSnapshot): SerializedInput {
  return {
    tick,
    keys: [...input.keys].sort(),
    buttons: [...input.buttons].sort((left, right) => left - right),
    pointer: { x: input.pointer.x, y: input.pointer.y },
  };
}

export function toSnapshot(input: SerializedInput): InputSnapshot {
  return {
    tick: input.tick,
    keys: new Set(input.keys),
    buttons: new Set(input.buttons),
    pointer: { x: input.pointer.x, y: input.pointer.y },
  };
}

function toSerializedEvents(records: readonly EventRecord[]): SerializedEvent[] {
  return records.map((record) => ({ tick: record.tick, type: record.type, payload: record.payload }));
}

/** 录制器：只收输入与 tick；世界由重放端用同一 seed 重算。 */
export class Recorder {
  private readonly ticks: SerializedInput[] = [];
  private readonly seed: number;
  private readonly startHash: string | undefined;
  private events: SerializedEvent[] | null = null;

  constructor(seed: number, startHash?: string) {
    this.seed = seed >>> 0;
    this.startHash = startHash;
  }

  record(tick: number, input: InputSnapshot): void {
    this.ticks.push(serializeInput(tick, input));
  }

  /** 附加事件段；空数组也会让录制升为 v2（表示「明确录制了零事件」）。 */
  captureEvents(records: readonly EventRecord[]): void {
    this.events = toSerializedEvents(records);
  }

  get count(): number {
    return this.ticks.length;
  }

  get eventCount(): number {
    return this.events?.length ?? 0;
  }

  toRecording(): Recording {
    const base = {
      seed: this.seed,
      ...(this.startHash === undefined ? {} : { startHash: this.startHash }),
      ticks: [...this.ticks],
    };
    if (this.events === null) {
      return { version: 1, ...base };
    }
    return { version: 2, ...base, events: [...this.events] };
  }
}

/** 序列化时键顺序固定，保证录制文件可做文本比对。 */
export function serialize(recording: Recording): string {
  return JSON.stringify({
    version: recording.version,
    seed: recording.seed,
    ...(recording.startHash === undefined ? {} : { startHash: recording.startHash }),
    ticks: recording.ticks.map((tick) => ({
      tick: tick.tick,
      keys: tick.keys,
      buttons: tick.buttons,
      pointer: { x: tick.pointer.x, y: tick.pointer.y },
    })),
    ...(recording.events === undefined
      ? {}
      : { events: recording.events.map((event) => ({ tick: event.tick, type: event.type, payload: event.payload })) }),
  });
}

function parseEvent(value: unknown): SerializedEvent {
  if (typeof value !== 'object' || value === null) {
    throw new Error('录制事件不是对象');
  }
  const record = value as Partial<SerializedEvent>;
  if (typeof record.tick !== 'number' || typeof record.type !== 'string') {
    throw new Error('录制事件字段不合法');
  }
  return { tick: record.tick, type: record.type, payload: record.payload };
}

export function deserialize(text: string): Recording {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('录制文件不是对象');
  }
  const record = parsed as Partial<Recording>;
  if ((record.version !== 1 && record.version !== 2) || typeof record.seed !== 'number' || !Array.isArray(record.ticks)) {
    throw new Error('录制文件版本或字段不合法');
  }
  return {
    version: record.version,
    seed: record.seed >>> 0,
    ...(typeof record.startHash === 'string' ? { startHash: record.startHash } : {}),
    ticks: record.ticks.map((tick) => ({
      tick: tick.tick,
      keys: [...tick.keys],
      buttons: [...tick.buttons],
      pointer: { x: tick.pointer.x, y: tick.pointer.y },
    })),
    ...(record.version === 2
      ? { events: Array.isArray(record.events) ? record.events.map(parseEvent) : [] }
      : {}),
  };
}
