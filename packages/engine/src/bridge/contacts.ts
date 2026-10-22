import type { SystemDef } from '../core/scheduler.js';
import type { Contact, IPhysics } from '../ports/index.js';

export interface ContactEventOptions {
  /** 每 tick 最多派发的接触事件数（进出合计），默认 64。 */
  readonly maxEventsPerTick?: number;
  readonly enterType?: string;
  readonly exitType?: string;
}

export interface ContactEventStats {
  readonly active: number;
  readonly overflow: number;
  readonly enterType: string;
  readonly exitType: string;
}

export interface ContactEventSystem extends SystemDef {
  stats(): ContactEventStats;
}

export function pairKey(contact: Contact): string {
  return `${contact.a}:${contact.b}`;
}

/**
 * 接触事件桥：比较前后 tick 的 contacts()，把进入/离开转成延迟事件。
 * 冷路径：事件只在阶段末派发；每 tick 有上限，溢出计入 stats 而不阻塞逻辑。
 * contacts() 按 (a,b) 升序，事件顺序因此稳定；事件不参与世界哈希。
 */
export function createContactEvents(physics: IPhysics, options: ContactEventOptions = {}): ContactEventSystem {
  const enterType = options.enterType ?? 'physics.contactEnter';
  const exitType = options.exitType ?? 'physics.contactExit';
  const cap = Math.max(0, Math.floor(options.maxEventsPerTick ?? 64));
  let previous = new Map<string, Contact>();
  let overflow = 0;

  return {
    name: 'physics.contacts',
    phase: 'collision',
    reads: [],
    writes: [],
    update: (ctx) => {
      const next = new Map<string, Contact>();
      for (const contact of physics.contacts()) {
        next.set(pairKey(contact), contact);
      }
      let emitted = 0;
      overflow = 0;
      for (const [key, contact] of next) {
        if (previous.has(key)) {
          continue;
        }
        if (emitted >= cap) {
          overflow += 1;
          continue;
        }
        ctx.bus.emitDeferred(enterType, { a: contact.a, b: contact.b, key });
        emitted += 1;
      }
      for (const [key, contact] of previous) {
        if (next.has(key)) {
          continue;
        }
        if (emitted >= cap) {
          overflow += 1;
          continue;
        }
        ctx.bus.emitDeferred(exitType, { a: contact.a, b: contact.b, key });
        emitted += 1;
      }
      previous = next;
    },
    stats: () => ({ active: previous.size, overflow, enterType, exitType }),
  };
}
