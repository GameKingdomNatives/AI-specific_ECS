import assert from 'node:assert/strict';
import test from 'node:test';
import { createFlux } from '../src/game/flux-model.js';
import { WARN_LEVEL_HIGH, WARN_LEVEL_NONE, WARN_LEVEL_OVERLOAD, WARN_LEVEL_REDLINE, warningLevel, warningPulse, warningText } from '../src/game/flux-warning.js';
import { createFluxAlarm } from '../src/flux-alarm.js';

test('分级：70% 预警、容量线红区、过载最高级', () => {
  assert.equal(warningLevel(createFlux(50, 0)), WARN_LEVEL_NONE);
  assert.equal(warningLevel(createFlux(70, 14)), WARN_LEVEL_HIGH);
  assert.equal(warningLevel(createFlux(60, 40)), WARN_LEVEL_REDLINE);
  assert.equal(warningLevel({ soft: 30, hard: 20, overloadTicks: 120 }), WARN_LEVEL_OVERLOAD);
});

test('文字说清状态：预警给当前值，红区给原因，过载给剩余秒数', () => {
  assert.equal(warningText(createFlux(50, 0)), '');
  assert.equal(warningText(createFlux(70, 14)), '辐能 84 / 120');
  assert.match(warningText(createFlux(60, 40)), /^红区 100 \/ 120 · 输出衰减$/);
  assert.equal(warningText({ soft: 10, hard: 10, overloadTicks: 150 }), '过载 2.5s');
});

test('呼吸系数只在有警告时非零，且落在 0–1', () => {
  assert.equal(warningPulse(37, WARN_LEVEL_NONE), 0);
  for (const level of [WARN_LEVEL_HIGH, WARN_LEVEL_REDLINE, WARN_LEVEL_OVERLOAD] as const) {
    for (const tick of [0, 3, 11, 29]) {
      const value = warningPulse(tick, level);
      assert.ok(value >= 0 && value <= 1, `${level}@${tick} => ${value}`);
    }
  }
});

test('声音只在等级上升时响一次，降回去不重复', () => {
  let flux = createFlux(0, 0);
  const plays: string[] = [];
  const alarm = createFluxAlarm({ getFlux: () => flux, play: (id) => plays.push(id) });
  alarm.tick();
  assert.deepEqual(plays, []);
  flux = createFlux(70, 14);
  alarm.tick();
  assert.deepEqual(plays, ['click']);
  alarm.tick();
  assert.deepEqual(plays, ['click'], '同一级不重复响');
  flux = createFlux(60, 40);
  alarm.tick();
  assert.deepEqual(plays, ['click', 'error']);
  flux = createFlux(10, 0);
  alarm.tick();
  flux = createFlux(60, 40);
  alarm.tick();
  assert.deepEqual(plays, ['click', 'error', 'error'], '退回安全区后再进入会再响');
});
