import { strict as assert } from 'node:assert';
import test from 'node:test';
import { REPLAY_SPEEDS, REPLAY_TICK_MS, createReplayCursor } from '../src/game/replay-cursor.js';
import type { ReplayFrame, ReplayFrames } from '../src/game/replay-frames.js';

function frameOf(tick: number): ReplayFrame {
  return { tick, player: 1, entities: [] };
}

/** 只实现游标用到的那部分帧接口，ticks 升序。 */
function fakeFrames(ticks: readonly number[]): ReplayFrames & { push(tick: number): void } {
  const list = [...ticks];
  const exact = (tick: number): number => list.indexOf(tick);
  const before = (tick: number): number => {
    let found = -1;
    for (let index = 0; index < list.length; index += 1) {
      if ((list[index] ?? 0) <= tick) found = index;
    }
    return found;
  };

  return {
    get frames(): number {
      return list.length;
    },
    get firstTick(): number {
      return list[0] ?? -1;
    },
    get lastTick(): number {
      return list[list.length - 1] ?? -1;
    },
    dropped: 0,
    get full(): boolean {
      return false;
    },
    tickAt(index: number): number {
      return list[index] ?? -1;
    },
    indexOfTick(tick: number): number {
      return exact(tick);
    },
    indexAtOrBefore(tick: number): number {
      return before(tick);
    },
    frameAt(tick: number): ReplayFrame | null {
      return list.includes(tick) ? frameOf(tick) : null;
    },
    frameAtOrBefore(tick: number): ReplayFrame | null {
      const index = before(tick);
      return index < 0 ? null : frameOf(list[index] ?? 0);
    },
    clear(): void {
      list.length = 0;
    },
    push(tick: number): void {
      list.push(tick);
    },
  };
}

test('空记录不崩：tick 0 / frame null / 进度 0', () => {
  const cursor = createReplayCursor(fakeFrames([]));
  assert.equal(cursor.tick, 0);
  assert.equal(cursor.frame(), null);
  assert.equal(cursor.progress, 0);
  assert.equal(cursor.index(), -1);
  cursor.play();
  assert.equal(cursor.advance(16), 0);
  assert.equal(cursor.tick, 0);
});

test('seek 夹在记录两端；起点/终点标志正确', () => {
  const cursor = createReplayCursor(fakeFrames([100, 101, 102]));
  assert.equal(cursor.tick, 100);
  assert.equal(cursor.seek(102), 102);
  assert.equal(cursor.atEnd, true);
  assert.equal(cursor.progress, 1);
  assert.equal(cursor.seek(999), 102);
  assert.equal(cursor.seek(-5), 100);
  assert.equal(cursor.atStart, true);
  assert.equal(cursor.progress, 0);
});

test('step 会暂停并逐帧跳动', () => {
  const cursor = createReplayCursor(fakeFrames([10, 11, 12]));
  cursor.play();
  assert.equal(cursor.step(2), 12);
  assert.equal(cursor.playing, false);
  assert.equal(cursor.step(-1), 11);
  assert.equal(cursor.step(-99), 10);
});

test('advance 按倍速与 tick 时长推进，尾帧自动暂停', () => {
  const cursor = createReplayCursor(fakeFrames([100, 101, 102, 103, 104]), { tickMs: 10 });
  cursor.seek(100);
  cursor.play();
  assert.equal(cursor.advance(25), 103);
  assert.equal(cursor.playing, true);
  cursor.setSpeed(2);
  assert.equal(cursor.advance(10), 104);
  assert.equal(cursor.playing, false);
  assert.equal(cursor.atEnd, true);
});

test('播到尾部再按播放，从头开始这一局', () => {
  const cursor = createReplayCursor(fakeFrames([5, 6, 7]), { tickMs: 10 });
  cursor.seek(7);
  assert.equal(cursor.atEnd, true);
  cursor.play();
  assert.equal(cursor.tick, 5);
  assert.equal(cursor.playing, true);
});

test('倍速被夹在 0.05..16，非法值回落到 1', () => {
  const cursor = createReplayCursor(fakeFrames([0, 1]));
  assert.equal(cursor.setSpeed(0), 0.05);
  assert.equal(cursor.setSpeed(999), 16);
  assert.equal(cursor.setSpeed(Number.NaN), 1);
  assert.deepEqual([...REPLAY_SPEEDS], [0.5, 1, 2, 4]);
  assert.ok(REPLAY_TICK_MS > 0);
});

test('记录在播中增长：refresh 后能继续推进到新尾', () => {
  const frames = fakeFrames([100, 101]);
  const cursor = createReplayCursor(frames, { tickMs: 10 });
  cursor.seek(100);
  cursor.play();
  assert.equal(cursor.advance(30), 101);
  assert.equal(cursor.playing, false);
  frames.push(102);
  frames.push(103);
  cursor.refresh();
  assert.equal(cursor.atEnd, false);
  cursor.play();
  assert.equal(cursor.advance(5), 102);
});

test('index() 返回就近帧下标', () => {
  const cursor = createReplayCursor(fakeFrames([10, 11, 12]));
  assert.equal(cursor.index(), 0);
  cursor.seek(11);
  assert.equal(cursor.index(), 1);
});
