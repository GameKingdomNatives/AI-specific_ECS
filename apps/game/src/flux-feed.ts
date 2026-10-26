/** 辐能事件流：只记录玩家自己的「为什么涨了/为什么停了」，给 HUD 右下一列小字。 */
export interface FeedEntry {
  readonly text: string;
  readonly tint: number;
  readonly tick: number;
}

const SLOT_NAMES: Readonly<Record<number, string>> = { 0: '主炮', 1: '终结', 2: '支援', 9: '敌机' };
const MAX_ENTRIES = 5;
const TICK_TTL = 150;

function field(event: unknown, key: string): unknown {
  return typeof event === 'object' && event !== null && key in event ? (event as Record<string, unknown>)[key] : undefined;
}

export interface FluxFeed {
  readonly list: FeedEntry[];
  shot(event: unknown, player: number, tick: number): void;
  hit(event: unknown, player: number, tick: number): void;
  overload(event: unknown, tick: number): void;
  vent(event: unknown, player: number, tick: number): void;
}

export function createFluxFeed(): FluxFeed {
  const list: FeedEntry[] = [];
  function push(text: string, tint: number, tick: number): void {
    list.push({ text, tint, tick });
    if (list.length > MAX_ENTRIES) list.shift();
  }
  function playerEvent(event: unknown, player: number, key: string): boolean {
    return Number(field(event, key)) === player;
  }
  return {
    list,
    shot(event, player, tick) {
      if (!playerEvent(event, player, 'entity')) return;
      const heat = Number(field(event, 'heat') ?? 0);
      if (heat <= 0) return;
      const slot = Number(field(event, 'slot') ?? 0);
      push(`${SLOT_NAMES[slot] ?? '开火'} +${heat.toFixed(1)} 软`, 0xffd27a, tick);
    },
    hit(event, player, tick) {
      if (!playerEvent(event, player, 'target')) return;
      const damage = Number(field(event, 'damage') ?? 0);
      if (field(event, 'ew') === true) {
        push(`EW +${(damage * 1.8).toFixed(1)} 硬`, 0xd18cff, tick);
        return;
      }
      if (field(event, 'shielded') === true) {
        push(`护盾转 +${(damage * 1.25).toFixed(1)} 硬`, 0x6fb6ff, tick);
      }
    },
    overload(event, tick) {
      if (field(event, 'kind') !== 'overload') return;
      push('过载 · 停机', 0xff6b6b, tick);
    },
    vent(event, player, tick) {
      if (!playerEvent(event, player, 'entity')) return;
      push('排散中', 0x7ee787, tick);
    },
  };
}

/** 渲染用：过滤过期条目。 */
export function liveFeed(list: readonly FeedEntry[], nowTick: number): FeedEntry[] {
  return list.filter((entry) => nowTick - entry.tick <= TICK_TTL);
}
