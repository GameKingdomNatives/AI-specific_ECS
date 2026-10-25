import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FLUX_REDLINE,
  HARD_AFTER_OVERLOAD,
  OVERLOAD_TICKS,
  createFlux,
  fluxTotal,
  isOverloaded,
  performanceFactor,
  stepFlux,
} from '../src/game/flux-model.js';

test('软辐能被动消散，硬辐能在开盾时不消散', () => {
  const start = { soft: 30, hard: 30, overloadTicks: 0 };
  const shielded = stepFlux(start, { shieldActive: true, venting: false });
  assert.equal(shielded.hard, 30);
  assert.ok(shielded.soft < 30);
  const open = stepFlux(start, { shieldActive: false, venting: false });
  assert.ok(open.hard < 30);
  assert.ok(open.soft < shielded.soft + 1);
});

test('排散同时清软硬，且速度高于被动消散', () => {
  const state = { soft: 40, hard: 40, overloadTicks: 0 };
  const vented = stepFlux(state, { shieldActive: false, venting: true });
  const idle = stepFlux(state, { shieldActive: false, venting: false });
  assert.ok(vented.soft < idle.soft);
  assert.ok(vented.hard < idle.hard);
});

test('到红线才过载，红线内只是性能衰减', () => {
  const redline = stepFlux({ soft: 100, hard: 5, overloadTicks: 0 }, { shieldActive: true, venting: false });
  assert.equal(isOverloaded(redline), false);
  assert.ok(performanceFactor(redline) > 0 && performanceFactor(redline) < 1);
  const overloaded = stepFlux({ soft: FLUX_REDLINE, hard: 0, overloadTicks: 0 }, { shieldActive: false, venting: false });
  assert.equal(isOverloaded(overloaded), true);
  assert.equal(overloaded.overloadTicks, OVERLOAD_TICKS);
  assert.equal(performanceFactor(overloaded), 0);
});

test('过载期间不能靠输入解除，结束后保留一半硬辐能', () => {
  let state = createFlux(0, FLUX_REDLINE);
  state = stepFlux(state, { shieldActive: true, venting: true });
  assert.equal(isOverloaded(state), true);
  for (let index = 0; index < OVERLOAD_TICKS - 1; index += 1) {
    state = stepFlux(state, { shieldActive: true, venting: true });
    assert.equal(isOverloaded(state), true);
  }
  const recovered = stepFlux(state, { shieldActive: true, venting: true });
  assert.equal(isOverloaded(recovered), false);
  assert.equal(recovered.soft, 0);
  assert.equal(recovered.hard, HARD_AFTER_OVERLOAD);
  assert.equal(fluxTotal(recovered), HARD_AFTER_OVERLOAD);
});
