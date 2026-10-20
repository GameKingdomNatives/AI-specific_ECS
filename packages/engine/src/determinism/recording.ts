import type { InputSnapshot } from '../ports/index.js';

export interface SerializedInput {
  readonly tick: number;
  readonly keys: readonly string[];
  readonly buttons: readonly number[];
  readonly pointer: { readonly x: number; readonly y: number };
}

export interface Recording {
  readonly version: 1;
  readonly seed: number;
  readonly ticks: readonly SerializedInput[];
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

/** 录制器：只收输入与 tick；世界由重放端用同一 seed 重算。 */
export class Recorder {
  private readonly ticks: SerializedInput[] = [];
  private readonly seed: number;

  constructor(seed: number) {
    this.seed = seed >>> 0;
  }

  record(tick: number, input: InputSnapshot): void {
    this.ticks.push(serializeInput(tick, input));
  }

  get count(): number {
    return this.ticks.length;
  }

  toRecording(): Recording {
    return { version: 1, seed: this.seed, ticks: [...this.ticks] };
  }
}

/** 序列化时键顺序固定，保证录制文件可做文本比对。 */
export function serialize(recording: Recording): string {
  return JSON.stringify({
    version: recording.version,
    seed: recording.seed,
    ticks: recording.ticks.map((tick) => ({
      tick: tick.tick,
      keys: tick.keys,
      buttons: tick.buttons,
      pointer: { x: tick.pointer.x, y: tick.pointer.y },
    })),
  });
}

export function deserialize(text: string): Recording {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('录制文件不是对象');
  }
  const record = parsed as Partial<Recording>;
  if (record.version !== 1 || typeof record.seed !== 'number' || !Array.isArray(record.ticks)) {
    throw new Error('录制文件版本或字段不合法');
  }
  return {
    version: 1,
    seed: record.seed >>> 0,
    ticks: record.ticks.map((tick) => ({
      tick: tick.tick,
      keys: [...tick.keys],
      buttons: [...tick.buttons],
      pointer: { x: tick.pointer.x, y: tick.pointer.y },
    })),
  };
}
