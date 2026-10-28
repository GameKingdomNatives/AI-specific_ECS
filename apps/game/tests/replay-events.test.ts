import assert from 'node:assert/strict';
import test from 'node:test';
import type { BattleEvent } from '../src/game/battle-review.js';
import { collectMarks, REPLAY_MARK_WINDOW } from '../src/game/replay-events.js';
import { REPLAY_FLAG_ENEMY, REPLAY_KIND_MECHA, type ReplayEntry, type ReplayFrame } from '../src/game/replay-frames.js';

function entry(entity: number, x: number, y: number, flags = REPLAY_KIND_MECHA): ReplayEntry {
  return { entity, kind: flags & 7, x, y, size: 20, angle: 0, hull: 100, hullMax: 100, soft: 0, hard: 0, flags };
}

function frame(entities: ReplayEntry[], tick = 10): ReplayFrame {
  return { tick, player: entities[0]?.entity ?? -1, entities };
}

test('带坐标的事件直接落在发生点', () => {
  const events: BattleEvent[] = [{ tick: 10, kind: 'hit', entity: 2, target: 2, x: 300, y: 400, damage: 6 }];
  const marks = collectMarks(frame([entry(1, 0, 0), entry(2, 50, 60)]), events, 10);
  assert.equal(marks.length, 1);
  const mark = marks[0];
  assert.equal(mark?.x, 300);
  assert.equal(mark?.y, 400);
  assert.equal(mark?.age, 0);
  assert.equal(mark?.weight, 1);
  assert.equal(mark?.label, '命中 -6');
});

test('没有坐标的事件用该帧实体位置兜底', () => {
  const events: BattleEvent[] = [{ tick: 10, kind: 'overload', entity: 1 }];
  const marks = collectMarks(frame([entry(1, 120, 240)]), events, 10);
  assert.equal(marks.length, 1);
  assert.equal(marks[0]?.x, 120);
  assert.equal(marks[0]?.y, 240);
  assert.equal(marks[0]?.label, '过载');
});

test('超出窗口的事件退场，窗口内的按距离衰减', () => {
  const events: BattleEvent[] = [
    { tick: 10, kind: 'shot', entity: 1, x: 10, y: 10 },
    { tick: 10 - REPLAY_MARK_WINDOW, kind: 'shot', entity: 1, x: 10, y: 10 },
    { tick: 10 - REPLAY_MARK_WINDOW - 1, kind: 'shot', entity: 1, x: 10, y: 10 },
  ];
  const marks = collectMarks(frame([entry(1, 0, 0)]), events, 10);
  assert.equal(marks.length, 2);
  assert.equal(marks[0]?.weight, 1);
  const aged = marks[1];
  assert.ok((aged?.weight ?? 1) < 0.01);
});

test('窗口参数可调，未来事件不算数', () => {
  const events: BattleEvent[] = [
    { tick: 20, kind: 'hit', entity: 2, target: 2, x: 0, y: 0 },
    { tick: 9, kind: 'hit', entity: 2, target: 2, x: 0, y: 0 },
  ];
  const marks = collectMarks(frame([entry(2, 0, 0)], 5), events, 10, { windowTicks: 5 });
  assert.equal(marks.length, 1);
  assert.equal(marks[0]?.tick, 9);
});

test('没坐标又不在该帧里的事件被跳过，敌方主体带阵营', () => {
  const enemyFlags = REPLAY_KIND_MECHA | REPLAY_FLAG_ENEMY;
  const events: BattleEvent[] = [
    { tick: 10, kind: 'hit', entity: 3, target: 3, damage: 4 },
    { tick: 10, kind: 'hit', entity: 2, target: 2, damage: 9, shielded: true },
  ];
  const marks = collectMarks(frame([entry(2, 80, 80, enemyFlags)]), events, 10);
  assert.equal(marks.length, 1);
  assert.equal(marks[0]?.enemy, true);
  assert.equal(marks[0]?.label, '命中 -9 穿盾');
});
