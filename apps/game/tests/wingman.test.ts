import assert from 'node:assert/strict';
import test from 'node:test';
import { laneDistance, planWingman, WING_DEADZONE, WING_ENGAGE, WING_FOLLOW, WING_FOLLOW_OFFSET, WING_HANDOFF_AT, WING_LANE, WING_RANGE, WING_RANGE_EXIT, WING_RESUME_AT, WING_VENT } from '../src/game/wingman-model.js';

const player = { x: 400, y: 500 };

test('没有敌人时跟到玩家侧后方', () => {
  const plan = planWingman({ player, self: { x: 0, y: 0 }, flux: 0 });
  assert.equal(plan.mode, WING_FOLLOW);
  assert.equal(plan.target.x, player.x + WING_FOLLOW_OFFSET.x);
  assert.equal(plan.target.y, player.y + WING_FOLLOW_OFFSET.y);
});

test('敌机在射程内就进入交战，落点不在玩家火线上', () => {
  const enemy = { x: 1000, y: 500 };
  const plan = planWingman({ player, self: { x: 700, y: 500 }, enemy, flux: 0 });
  assert.equal(plan.mode, WING_ENGAGE);
  assert.ok(laneDistance(plan.target, player, enemy) >= WING_LANE - 0.001);
  assert.ok(Math.hypot(plan.target.x - enemy.x, plan.target.y - enemy.y) > 0);
});

test('辐能越过换手线就先排散：往远离敌人的方向退', () => {
  const enemy = { x: 1000, y: 500 };
  const self = { x: 700, y: 500 };
  const plan = planWingman({ player, self, enemy, flux: WING_HANDOFF_AT });
  assert.equal(plan.mode, WING_VENT);
  assert.ok(Math.hypot(plan.target.x - enemy.x, plan.target.y - enemy.y) > Math.hypot(self.x - enemy.x, self.y - enemy.y));
});

test('敌人超出交战半径时回到跟随', () => {
  const enemy = { x: player.x + WING_RANGE + 50, y: player.y };
  const plan = planWingman({ player, self: { x: player.x + 10, y: player.y }, enemy, flux: 0 });
  assert.equal(plan.mode, WING_FOLLOW);
});

test('laneDistance 量的是到线段的距离', () => {
  assert.equal(laneDistance({ x: 50, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 0);
  assert.equal(laneDistance({ x: 50, y: 90 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 90);
  assert.equal(laneDistance({ x: -30, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }), 30);
});

test('已经交战时敌人退到原半径外一点仍保持交战（避免边界抖动）', () => {
  const enemy = { x: player.x + WING_RANGE + 60, y: player.y };
  const plan = planWingman({ player, self: { x: player.x + 10, y: player.y }, enemy, flux: 0, previousMode: WING_ENGAGE });
  assert.equal(plan.mode, WING_ENGAGE);
  assert.ok(WING_RANGE_EXIT > WING_RANGE);
});

test('排散中辐能还没降到接管线以下就继续排散', () => {
  const enemy = { x: player.x + 200, y: player.y };
  const plan = planWingman({ player, self: { x: player.x + 10, y: player.y }, enemy, flux: WING_RESUME_AT + 10, previousMode: WING_VENT });
  assert.equal(plan.mode, WING_VENT);
});

test('侧的偏好由外部给定，换侧不会凭空翻转落点', () => {
  const enemy = { x: player.x + 400, y: player.y };
  const self = { x: player.x + 200, y: player.y };
  const left = planWingman({ player, self, enemy, flux: 0, side: 1 });
  const right = planWingman({ player, self, enemy, flux: 0, side: -1 });
  assert.notDeepEqual(left.target, right.target);
});

test('死区与减速半径是正数且死区小于减速半径', () => {
  assert.ok(WING_DEADZONE > 0);
  assert.ok(WING_DEADZONE < 70);
});
