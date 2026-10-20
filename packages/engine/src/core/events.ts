export type EventPayload = Record<string, unknown>;

export interface EventRecord {
  readonly seq: number;
  readonly tick: number;
  readonly type: string;
  readonly payload: unknown;
}

type Handler = (payload: EventPayload) => void;

interface Deferred {
  readonly type: string;
  readonly payload: EventPayload;
}

/**
 * 事件总线：唯一跨模块通信机制。
 * - emit：同步即时派发，按发布顺序；
 * - emitDeferred：入队，flushDeferred 时按入队顺序派发；
 * - 事件只传纯数据（对象字面量），不传引用、函数、类实例。
 */
export class EventBus {
  private readonly handlers = new Map<string, Handler[]>();
  private readonly deferred: Deferred[] = [];
  private readonly recording: EventRecord[] = [];
  private seq = 0;
  private currentTick = 0;
  private record = false;

  setTick(tick: number): void {
    this.currentTick = tick;
  }

  on(type: string, handler: Handler): () => void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
    return () => {
      const current = this.handlers.get(type);
      if (current === undefined) {
        return;
      }
      const index = current.indexOf(handler);
      if (index >= 0) {
        current.splice(index, 1);
      }
    };
  }

  emit(type: string, payload: EventPayload): void {
    this.recordEvent(type, payload);
    const list = this.handlers.get(type);
    if (list === undefined) {
      return;
    }
    for (const handler of [...list]) {
      handler(payload);
    }
  }

  emitDeferred(type: string, payload: EventPayload): void {
    this.deferred.push({ type, payload });
  }

  flushDeferred(): number {
    let count = 0;
    while (this.deferred.length > 0) {
      const item = this.deferred.shift() as Deferred;
      this.emit(item.type, item.payload);
      count += 1;
    }
    return count;
  }

  startRecording(): void {
    this.record = true;
    this.recording.length = 0;
    this.seq = 0;
  }

  stopRecording(): EventRecord[] {
    this.record = false;
    return [...this.recording];
  }

  private recordEvent(type: string, payload: EventPayload): void {
    if (!this.record) {
      return;
    }
    this.seq += 1;
    this.recording.push({ seq: this.seq, tick: this.currentTick, type, payload });
  }
}
