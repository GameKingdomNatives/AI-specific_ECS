/**
 * 复盘总线的接线：在 `attachBattleReview`（事件层）之上加一层帧记录（画面层）。
 *
 * 两层各管一段历史：事件流回答「发生了什么」，帧流回答「那时画面上是什么样」。
 * 面板同时消费两者，于是拖到某个 tick 就能看到「当时的位置 + 当时的事件」，
 * 而不是只读一段文字总结。
 */

import type { World } from 'agent-specific_ecs/core';
import type { IEventBusPort, InputSnapshot } from 'agent-specific_ecs/ports';
import { attachBattleReview, type BattleLog, type BattleLogOptions } from './battle-review-host.js';
import { createReplayCursor, type ReplayCursor } from './game/replay-cursor.js';
import { createReplayRecorder, type ReplayFrames, type ReplayRecorder } from './game/replay-frames.js';
import { createReplayInputs, type ReplayInput, type ReplayInputs } from './game/replay-inputs.js';

type BusTap = Pick<IEventBusPort, 'on'>;

export interface ReplayLogOptions extends BattleLogOptions {
  /** 单帧实体上限；缺省 64。 */
  readonly maxEntitiesPerFrame?: number;
  /** 单局帧上限；缺省 12000 tick（60Hz 约 3.3 分钟）。 */
  readonly maxFrames?: number;
}

export interface ReplayLog extends BattleLog {
  /** 帧记录器本身（可直接拿去做导出/测试）。 */
  readonly frames: ReplayRecorder;
  /** 播放游标（面板与调试共用同一条时间轴）。 */
  readonly cursor: ReplayCursor;
  /** 逐 tick 的操作流；面板用它显示「当时按了什么、瞄哪」。 */
  readonly inputs: ReplayInputs;
  /** 不晚于该 tick 的最近一条操作。 */
  inputAt(tick: number): ReplayInput | null;
  /** 每个固定步长调一次：把这一 tick 的画面（与可选的操作）记下来。 */
  capture(world: World, tick: number, input?: InputSnapshot): void;
  /** 重开/换场景时清空这一局的历史（事件 + 帧 + 游标）。 */
  clear(): void;
}

function recorderOptions(options: ReplayLogOptions): { player: () => number; maxEntitiesPerFrame?: number; maxFrames?: number } {
  return {
    player: options.player,
    ...(options.maxEntitiesPerFrame === undefined ? {} : { maxEntitiesPerFrame: options.maxEntitiesPerFrame }),
    ...(options.maxFrames === undefined ? {} : { maxFrames: options.maxFrames }),
  };
}

export function attachReplayLog(bus: BusTap, options: ReplayLogOptions): ReplayLog {
  const log = attachBattleReview(bus, options);
  const frames = createReplayRecorder(recorderOptions(options));
  const inputs = createReplayInputs(options.maxFrames ?? 12000);
  const cursor = createReplayCursor(frames);
  return {
    frames,
    cursor,
    inputs,
    get events() {
      return log.events;
    },
    summary(durationTicks: number, tailSize?: number) {
      return log.summary(durationTicks, tailSize);
    },
    flux(windowTicks?: number, toTick?: number) {
      return log.flux(windowTicks, toTick);
    },
    cause(overload, windowTicks?: number) {
      return log.cause(overload, windowTicks);
    },
    timeline() {
      return log.timeline();
    },
    inputAt(tick: number): ReplayInput | null {
      return inputs.atOrBefore(tick);
    },
    capture(world: World, tick: number, input?: InputSnapshot): void {
      frames.capture(world, tick);
      if (input !== undefined) inputs.record(tick, input);
      cursor.refresh();
    },
    clear(): void {
      // 帧层可直接清；事件层是按局累积的数组，重开时由 `attachBattleReview` 的容量上限兜底，
      // 这里只清帧与游标，保证时间轴不会停在上一局的尾巴上。
      frames.clear();
      inputs.clear();
      cursor.refresh();
    },
  };
}

/** 对外只暴露帧数与时间轴范围，方便调试面板显示「这一局记了多久」。 */
export function framesInfo(frames: ReplayFrames): { frames: number; firstTick: number; lastTick: number; full: boolean; dropped: number } {
  return { frames: frames.frames, firstTick: frames.firstTick, lastTick: frames.lastTick, full: frames.full, dropped: frames.dropped };
}
