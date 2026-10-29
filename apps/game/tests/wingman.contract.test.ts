import assert from 'node:assert/strict';
import test from 'node:test';
import { Position, Velocity } from 'agent-specific_ecs/data';
import { Aim, Flux, Mecha, Projectile, Vent, Wingman } from '../src/game/components.js';
import { createWingmanSystem } from '../src/game/systems/wingman.js';
import { WING_ENGAGE, WING_FOLLOW, WING_HANDOFF_AT, WING_VENT } from '../src/game/wingman-model.js';
import { createFixture } from './harness.js';
import type { Fixture } from './harness.js';

const WIDTH = 1920;
const HEIGHT = 1080;

function setup() {
  const fixture = createFixture();
  const player = fixture.spawnWith([[Position, { x: 600, y: 600 }], [Mecha, { faction: 0, hull: 100, maxHull: 100 }]]);
  const wingman = fixture.spawnWith([
    [Position, { x: 700, y: 500 }],
    [Mecha, { faction: 0, hull: 80, maxHull: 80 }],
    [Flux, { soft: 0, hard: 0, overloadTicks: 0 }],
    [Wingman, { mode: WING_FOLLOW, timer: 0 }],
    [Vent, { active: false }],
    [Aim, { angle: 0 }],
  ]);
  return { fixture, player, wingman };
}

function spawnEnemy(fixture: Fixture, x: number, y: number) {
  return fixture.spawnWith([[Position, { x, y }], [Mecha, { faction: 1, hull: 100, maxHull: 100 }]]);
}

test('没有敌机时跟到玩家侧后方，写回跟随态且不排散', () => {
  const { fixture, player, wingman } = setup();
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  assert.equal(fixture.world.get(wingman, Wingman)?.mode, WING_FOLLOW);
  assert.equal(fixture.world.get(wingman, Vent)?.active, false);
  const position = fixture.world.get(wingman, Position);
  assert.ok(position !== undefined && position.x < 700, '应当向玩家侧后方靠拢（x 减小）');
  assert.ok(position !== undefined && position.y > 500, '应当向玩家侧后方靠拢（y 增大）');
});

test('敌机进交战半径就转交战：Aim 指向敌机，且不排散', () => {
  const { fixture, player, wingman } = setup();
  spawnEnemy(fixture, 1000, 600);
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  assert.equal(fixture.world.get(wingman, Wingman)?.mode, WING_ENGAGE);
  assert.equal(fixture.world.get(wingman, Vent)?.active, false);
  const aim = fixture.world.get(wingman, Aim);
  assert.ok(aim !== undefined && Number.isFinite(aim.angle));
});

test('辐能越过换手线就先排散：Vent 打开并远离敌机', () => {
  const { fixture, player, wingman } = setup();
  spawnEnemy(fixture, 1000, 600);
  fixture.world.set(wingman, Flux, { soft: WING_HANDOFF_AT, hard: 0, overloadTicks: 0 });
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  assert.equal(fixture.world.get(wingman, Wingman)?.mode, WING_VENT);
  assert.equal(fixture.world.get(wingman, Vent)?.active, true);
});

test('僚机被夹在场地内，不会飞出边界', () => {
  const { fixture, player, wingman } = setup();
  fixture.world.set(wingman, Position, { x: 2, y: 1078 });
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT, margin: 24 }));
  const position = fixture.world.get(wingman, Position);
  assert.ok(position !== undefined && position.x >= 24 && position.x <= WIDTH - 24);
  assert.ok(position.y >= 24 && position.y <= HEIGHT - 24);
});

test('玩家不存在时系统直接跳过，不抛错', () => {
  const { fixture, wingman } = setup();
  const before = fixture.world.get(wingman, Position);
  fixture.run(createWingmanSystem({ player: 999, width: WIDTH, height: HEIGHT }));
  const after = fixture.world.get(wingman, Position);
  assert.deepEqual(after, before);
});

test('交战态会开火：生成友军弹丸、抬升自身辐能并进入装填', () => {
  const { fixture, player, wingman } = setup();
  spawnEnemy(fixture, 1000, 600);
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  assert.equal(fixture.world.get(wingman, Wingman)?.mode, WING_ENGAGE);
  assert.equal(fixture.world.query(Position, Velocity, Projectile).length, 1, '应当打出一发弹丸');
  const flux = fixture.world.get(wingman, Flux);
  assert.ok(flux !== undefined && flux.soft > 0, '开火必须产生软辐能');
  assert.ok(Number(fixture.world.get(wingman, Wingman)?.timer) > 0, '开火后应当进入装填');
  const shot = fixture.world.query(Projectile)[0];
  assert.ok(shot !== undefined);
  assert.equal(fixture.world.get(shot, Projectile)?.faction, 0, '僚机的弹丸属于友军');
});

test('跟随时不开火，辐能不变', () => {
  const { fixture, player, wingman } = setup();
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  assert.equal(fixture.world.get(wingman, Wingman)?.mode, WING_FOLLOW);
  assert.equal(fixture.world.query(Projectile).length, 0);
  const flux = fixture.world.get(wingman, Flux);
  assert.equal(flux?.soft, 0);
});

test('落在死区里就不动：不会在落点旁边来回摆', () => {
  const { fixture, player, wingman } = setup();
  // 玩家 600,600 → 跟队落点 480,696；放进死区内 4px。
  fixture.world.set(wingman, Position, { x: 483, y: 699 });
  const before = fixture.world.get(wingman, Position);
  fixture.run(createWingmanSystem({ player, width: WIDTH, height: HEIGHT }));
  const after = fixture.world.get(wingman, Position);
  assert.deepEqual(after, before);
});
