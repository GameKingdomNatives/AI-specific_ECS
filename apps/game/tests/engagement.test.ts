import assert from 'node:assert/strict';
import test from 'node:test';
import { AI_ENGAGE, AI_VENT, HANDOFF_AT, RESUME_AT, selectAttacker } from '../src/game/engagement.js';

test('单机：辐能低于换手线就继续打，越过换手线就退出攻击态去排散', () => {
  assert.equal(selectAttacker([{ id: 7, flux: 10, mode: AI_ENGAGE }], 7), 7);
  assert.equal(selectAttacker([{ id: 7, flux: HANDOFF_AT, mode: AI_ENGAGE }], 7), undefined);
  assert.equal(selectAttacker([], undefined), undefined);
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
