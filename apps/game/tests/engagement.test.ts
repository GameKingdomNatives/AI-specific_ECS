import assert from 'node:assert/strict';
import test from 'node:test';
import { AI_ENGAGE, AI_VENT, HANDOFF_AT, RESUME_AT, selectAttacker } from '../src/game/engagement.js';

test('单机：辐能低于换手线就继续打，越过换手线就退出攻击态去排散', () => {
  assert.equal(selectAttacker([{ id: 7, flux: 10, mode: AI_ENGAGE }], 7), 7);
  assert.equal(selectAttacker([{ id: 7, flux: HANDOFF_AT, mode: AI_ENGAGE }], 7), undefined);
  assert.equal(selectAttacker([], undefined), undefined);
});

test('单机：排散到接管线以下必须自己重新接管，不能永久停在排散态', () => {
  assert.equal(selectAttacker([{ id: 7, flux: RESUME_AT, mode: AI_VENT }], undefined), 7);
  assert.equal(selectAttacker([{ id: 7, flux: RESUME_AT - 10, mode: AI_VENT }], undefined), 7);
  assert.equal(selectAttacker([{ id: 7, flux: RESUME_AT + 5, mode: AI_VENT }], undefined), undefined);
});

test('单机：从满辐能排散到接管线，接管恰好发生在 RESUME_AT 这一刻', () => {
  let attacker: number | undefined;
  let engagedAt: number | undefined;
  for (let flux = HANDOFF_AT; flux >= 0; flux -= 1) {
    attacker = selectAttacker([{ id: 7, flux, mode: flux >= HANDOFF_AT ? AI_ENGAGE : AI_VENT }], undefined);
    if (attacker === 7) {
      engagedAt = flux;
      break;
    }
  }
  assert.equal(engagedAt, RESUME_AT, '只在降到接管线以下（含）才重新接管');
});

test('双机：攻击者到换手线后交给排散干净的同伴，不出现两个攻击者', () => {
  const enemies = [
    { id: 3, flux: HANDOFF_AT, mode: AI_ENGAGE },
    { id: 9, flux: 12, mode: AI_VENT },
  ];
  assert.equal(selectAttacker(enemies, 3), 9);
  assert.equal(new Set([selectAttacker(enemies, 3)]).size, 1);
});

test('双机：攻击者未到换手线时保持攻击态，同伴即使排散干净也不抢', () => {
  const enemies = [
    { id: 3, flux: 20, mode: AI_ENGAGE },
    { id: 9, flux: 0, mode: AI_VENT },
  ];
  assert.equal(selectAttacker(enemies, 3), 3);
});

test('双机都过换手线时，交给辐能更低的一架接管', () => {
  const enemies = [
    { id: 3, flux: 80, mode: AI_ENGAGE },
    { id: 9, flux: 55, mode: AI_VENT },
  ];
  assert.equal(selectAttacker(enemies, 3), 9);
});

test('接管线以上不得接管：同伴没排散干净就先让它继续排散，由辐能最低者顶上', () => {
  const enemies = [
    { id: 3, flux: 90, mode: AI_ENGAGE },
    { id: 9, flux: RESUME_AT + 20, mode: AI_VENT },
  ];
  assert.equal(selectAttacker(enemies, 3), 9);
});
