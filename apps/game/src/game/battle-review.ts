/**
 * 战后复盘的数据层：把一局里的事件收成可读摘要。
 *
 * 只做纯计算，不碰渲染、不碰事件总线——接线（谁在什么时候喂事件）与呈现（时间线还是归因）
 * 都在外层决定，这样「先定数据形状、再做界面」不会互相拉扯。
 * 事件来源见 `apps/game/src/game/systems/combat.ts`（game.hit / game.kill）、
 * `apps/game/src/game/systems/weapon.ts`（game.shot）与 `systems/flux.ts`（game.flux 过载）。
 */

export type BattleEventKind = 'shot' | 'hit' | 'kill' | 'overload' | 'vent';

export interface BattleEvent {
  readonly tick: number;
  readonly kind: BattleEventKind;
  /** 事件主体：开火者 / 过载者 / 排散者；命中与击杀是受击方，玩家自己即为受击方。 */
  readonly entity: number;
  /** 命中/击杀的受击方（与 entity 同义，保留给将来的归因字段）。 */
  readonly target?: number;
  readonly slot?: number;
  readonly damage?: number;
  readonly shielded?: boolean;
  readonly ew?: boolean;
}

export interface BattleSummary {
  /** 记录覆盖的时长（tick）。 */
  readonly durationTicks: number;
  /** 玩家开火次数（按 shot 计）。 */
  readonly playerShots: number;
  /** 玩家命中次数（打到非玩家的 hit）。 */
  readonly playerHits: number;
  /** 玩家打出的伤害。 */
  readonly damageDealt: number;
  /** 玩家承受的伤害。 */
  readonly damageTaken: number;
  /** 玩家击毁数。 */
  readonly kills: number;
  /** 玩家过载次数。 */
  readonly overloads: number;
  /** 玩家排散次数。 */
  readonly vents: number;
  /** 玩家是否被击杀。 */
  readonly playerKilled: boolean;
  /** 最后一次承受的命中（归因入口：哪一发、是否穿盾）。 */
  readonly lastHit?: BattleEvent;
  /** 第一次过载（节奏断点）。 */
  readonly firstOverload?: BattleEvent;
  /** 最近的事件，按时间升序；给「时间线」视图。 */
  readonly tail: readonly BattleEvent[];
}

/** 默认保留最近 512 条：足够一局 3 分钟的完整时间线，又不吃内存。 */
export const REVIEW_CAPACITY = 512;

export interface BattleReview {
  readonly events: readonly BattleEvent[];
  record(event: BattleEvent): void;
  /** 记录器自身的容量（测试与 HUD 共用同一口径）。 */
  readonly capacity: number;
}

export function createBattleReview(capacity: number = REVIEW_CAPACITY): BattleReview {
  const limit = Math.max(1, Math.floor(capacity));
  const events: BattleEvent[] = [];
  return {
    get events(): readonly BattleEvent[] {
      return events;
    },
    capacity: limit,
    record(event: BattleEvent): void {
      events.push(event);
      if (events.length > limit) events.shift();
    },
  };
}

interface Tally {
  playerShots: number;
  playerHits: number;
  damageDealt: number;
  damageTaken: number;
  kills: number;
  overloads: number;
  vents: number;
  playerKilled: boolean;
  lastHit?: BattleEvent;
  firstOverload?: BattleEvent;
}

function emptyTally(): Tally {
  return { playerShots: 0, playerHits: 0, damageDealt: 0, damageTaken: 0, kills: 0, overloads: 0, vents: 0, playerKilled: false };
}

function applyShot(tally: Tally, event: BattleEvent, player: number): void {
  if (event.entity === player) tally.playerShots += 1;
}

function applyHit(tally: Tally, event: BattleEvent, player: number): void {
  const target = event.target ?? event.entity;
  if (target !== player) {
    tally.playerHits += 1;
    tally.damageDealt += event.damage ?? 0;
    return;
  }
  tally.damageTaken += event.damage ?? 0;
  tally.lastHit = event;
}

function applyKill(tally: Tally, event: BattleEvent, player: number): void {
  const target = event.target ?? event.entity;
  if (target === player) {
    tally.playerKilled = true;
    return;
  }
  tally.kills += 1;
}

function applyOverload(tally: Tally, event: BattleEvent, player: number): void {
  if (event.entity !== player) return;
  tally.overloads += 1;
  if (tally.firstOverload === undefined) tally.firstOverload = event;
}

function applyEvent(tally: Tally, event: BattleEvent, player: number): void {
  if (event.kind === 'shot') return applyShot(tally, event, player);
  if (event.kind === 'hit') return applyHit(tally, event, player);
  if (event.kind === 'kill') return applyKill(tally, event, player);
  if (event.kind === 'overload') return applyOverload(tally, event, player);
  if (event.kind === 'vent' && event.entity === player) tally.vents += 1;
}

function tallyEvents(events: readonly BattleEvent[], player: number): Tally {
  const tally = emptyTally();
  for (const event of events) applyEvent(tally, event, player);
  return tally;
}

export function summarize(
  events: readonly BattleEvent[],
  player: number,
  durationTicks: number,
  tailSize = 12,
): BattleSummary {
  const tally = tallyEvents(events, player);
  const size = Math.max(0, Math.floor(tailSize));
  return {
    durationTicks,
    playerShots: tally.playerShots,
    playerHits: tally.playerHits,
    damageDealt: tally.damageDealt,
    damageTaken: tally.damageTaken,
    kills: tally.kills,
    overloads: tally.overloads,
    vents: tally.vents,
    playerKilled: tally.playerKilled,
    ...(tally.lastHit === undefined ? {} : { lastHit: tally.lastHit }),
    ...(tally.firstOverload === undefined ? {} : { firstOverload: tally.firstOverload }),
    tail: size === 0 ? [] : events.slice(-size),
  };
}
