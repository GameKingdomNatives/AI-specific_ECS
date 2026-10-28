/**
 * 复盘回放的帧数据层：逐 tick 记下「当时画面上有什么、状态如何」。
 *
 * 记的是世界当时的样子（位置/尺寸/朝向/结构/辐能/护盾/排散/压制/过载），不是重演指令：
 * 面板拖动时间轴是 O(1) 取帧，永不偏离，也不需要再跑一遍物理。事件与操作另由 `Recorder`
 * 与总线录制提供，两者按 tick 对齐就得到完整历史。
 *
 * 采样细节（尺寸怎么取、标记怎么打）在 `replay-entity.ts`；这里只管帧序列与定位。
 * 存储按需增长：每帧只追加世界里真实存在的实体，不预分配最大容量。
 */

import type { EntityId, World } from 'agent-specific_ecs/core';
import { Position } from 'agent-specific_ecs/data';
import { createStorage, grow, type Storage } from './replay-frame-store.js';
import { readEntryAt, writeEntityAt, type ReplayEntry } from './replay-entity.js';
export { REPLAY_STRIDE } from './replay-frame-store.js';

export {
  REPLAY_FLAG_ENEMY,
  REPLAY_FLAG_OVERLOAD,
  REPLAY_FLAG_SHIELD,
  REPLAY_FLAG_SUPPRESSED,
  REPLAY_FLAG_VENT,
  REPLAY_KIND_MECHA,
  REPLAY_KIND_OTHER,
  REPLAY_KIND_PROJECTILE,
  REPLAY_SLOT_SHIFT,
  slotOf,
  type ReplayEntry,
} from './replay-entity.js';

export interface ReplayFrame {
  readonly tick: number;
  /** 这一帧的玩家实体；玩家可能换过（重开/换场景），所以逐帧记。 */
  readonly player: EntityId;
  readonly entities: readonly ReplayEntry[];
}

export interface ReplayFrames {
  /** 已记录的帧数。 */
  readonly frames: number;
  readonly firstTick: number;
  readonly lastTick: number;
  /** 因单帧上限被丢掉的实体数（正常对局应为 0）。 */
  readonly dropped: number;
  tickAt(index: number): number;
  /** 首个 tick ≥ 给定值的帧下标；没有则 -1。 */
  indexOfTick(tick: number): number;
  frameAt(tick: number): ReplayFrame | null;
  /** 取该 tick 或之前最近的帧；早于记录起点返回 null。 */
  frameAtOrBefore(tick: number): ReplayFrame | null;
  /** 取该 tick 或之前最近帧的下标；没有则 -1。 */
  indexAtOrBefore(tick: number): number;
  /** 是否已到单局帧上限（超过后不再记录，避免无限增长）。 */
  readonly full: boolean;
  clear(): void;
}

export interface ReplayRecorder extends ReplayFrames {
  capture(world: World, tick: number): void;
}

export interface ReplayRecorderOptions {
  /** 玩家实体；缺省记 -1（面板自己决定高亮谁）。 */
  readonly player?: () => EntityId;
  /** 单帧实体上限；超出只记前 N 个并累计 dropped。 */
  readonly maxEntitiesPerFrame?: number;
  /** 单局帧上限，缺省 12000（60Hz 约 3.3 分钟）；到顶后停止记录。 */
  readonly maxFrames?: number;
}

interface State {
  readonly storage: Storage;
  readonly offsets: number[];
  readonly counts: number[];
  readonly ticks: number[];
  readonly players: number[];
  readonly limit: number;
  readonly maxFrames: number;
  readonly player: (() => EntityId) | undefined;
  dropped: number;
}

function createState(options: ReplayRecorderOptions): State {
  return {
    storage: createStorage(),
    offsets: [],
    counts: [],
    ticks: [],
    players: [],
    limit: Math.max(1, Math.floor(options.maxEntitiesPerFrame ?? 64)),
    maxFrames: Math.max(1, Math.floor(options.maxFrames ?? 12000)),
    player: options.player,
    dropped: 0,
  };
}

function findExact(ticks: readonly number[], tick: number): number {
  let low = 0;
  let high = ticks.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const value = ticks[middle] ?? 0;
    if (value < tick) low = middle + 1;
    else if (value > tick) high = middle - 1;
    else return middle;
  }
  return -1;
}

function findAtOrBefore(ticks: readonly number[], tick: number): number {
  let low = 0;
  let high = ticks.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((ticks[middle] ?? 0) <= tick) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

function frameOf(state: State, index: number): ReplayFrame {
  const start = state.offsets[index] ?? 0;
  const count = state.counts[index] ?? 0;
  const entities: ReplayEntry[] = [];
  for (let slot = start; slot < start + count; slot += 1) entities.push(readEntryAt(state.storage, slot));
  return { tick: state.ticks[index] ?? 0, player: state.players[index] ?? -1, entities };
}

function captureFrame(state: State, world: World, tick: number): void {
  const start = state.storage.used;
  let count = 0;
  for (const entity of world.query(Position)) {
    const position = world.get(entity, Position);
    if (position === undefined) continue;
    if (count >= state.limit) {
      state.dropped += 1;
      continue;
    }
    grow(state.storage, state.storage.used + 1);
    writeEntityAt(state.storage, state.storage.used, entity, world, position);
    state.storage.used += 1;
    count += 1;
  }
  state.offsets.push(start);
  state.counts.push(count);
  state.ticks.push(tick);
  state.players.push(state.player?.() ?? -1);
}

function makeRecorder(state: State): ReplayRecorder {
  return {
    get frames(): number {
      return state.ticks.length;
    },
    get firstTick(): number {
      return state.ticks[0] ?? -1;
    },
    get lastTick(): number {
      return state.ticks[state.ticks.length - 1] ?? -1;
    },
    get dropped(): number {
      return state.dropped;
    },
    get full(): boolean {
      return state.ticks.length >= state.maxFrames;
    },
    tickAt(index: number): number {
      return state.ticks[index] ?? -1;
    },
    indexOfTick(tick: number): number {
      return findExact(state.ticks, tick);
    },
    frameAt(tick: number): ReplayFrame | null {
      const index = findExact(state.ticks, tick);
      return index < 0 ? null : frameOf(state, index);
    },
    frameAtOrBefore(tick: number): ReplayFrame | null {
      const index = findAtOrBefore(state.ticks, tick);
      return index < 0 ? null : frameOf(state, index);
    },
    indexAtOrBefore(tick: number): number {
      return findAtOrBefore(state.ticks, tick);
    },
    clear(): void {
      state.offsets.length = 0;
      state.counts.length = 0;
      state.ticks.length = 0;
      state.players.length = 0;
      state.storage.used = 0;
      state.dropped = 0;
    },
    capture(world: World, tick: number): void {
      if (state.ticks.length >= state.maxFrames) return;
      captureFrame(state, world, tick);
    },
  };
}

/** 创建一个按需增长的帧记录器；`capture` 每 tick 调一次。 */
export function createReplayRecorder(options: ReplayRecorderOptions = {}): ReplayRecorder {
  return makeRecorder(createState(options));
}
