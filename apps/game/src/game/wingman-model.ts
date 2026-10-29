/**
 * 僚机的纯决策层：给定玩家、自己、最近敌机的位置与自己的辐能，
 * 返回这一 tick 该往哪走、处于什么状态。不碰世界，便于单测，也保证回放可复现。
 *
 * 设计约束（来自项目身份与 IDEA-002 的裁定）：玩家只驾驶旗舰、战中零指挥；
 * 僚机自主协作但行为必须可读——四态：跟随 / 交战 / 排散 / 待命。
 */

export const WING_FOLLOW = 0;
export const WING_ENGAGE = 1;
export const WING_VENT = 2;
export const WING_IDLE = 3;

/** 与交战令牌同口径：软+硬辐能越过这条线就先排散，降到接管线以下再交战。 */
export const WING_HANDOFF_AT = 60;
export const WING_RESUME_AT = 30;
/** 交战半径：敌人在这之内才推进，否则跟队。 */
export const WING_RANGE = 620;
/** 与敌机保持的侧向距离；同时是「不站在玩家火线上」的最小车道距离。 */
export const WING_LANE = 90;
/** 每 tick 位移上限（玩家 10，敌机 3；僚机取中间偏快，跟得上又不飘）。 */
export const WING_SPEED = 7;
/** 跟队点：玩家右后方，固定世界偏移，避免和玩家重叠。 */
export const WING_FOLLOW_OFFSET = { x: -120, y: 96 } as const;
/** 交战落点相对敌机的后撤量：贴在敌机侧后，不挡玩家射界。 */
const WING_STANDOFF = 180;

export interface WingPoint {
  readonly x: number;
  readonly y: number;
}

export interface WingInput {
  readonly player: WingPoint;
  readonly self: WingPoint;
  readonly enemy?: WingPoint;
  /** 软 + 硬辐能。 */
  readonly flux: number;
}

export interface WingPlan {
  readonly mode: number;
  readonly target: WingPoint;
}

function distance(a: WingPoint, b: WingPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 点到线段的最短距离：用来判断僚机是不是站在玩家与敌机的连线上。 */
export function laneDistance(point: WingPoint, from: WingPoint, to: WingPoint): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return distance(point, from);
  const t = Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / lengthSq));
  return Math.hypot(point.x - (from.x + t * dx), point.y - (from.y + t * dy));
}

function unitAway(from: WingPoint, of: WingPoint): WingPoint {
  const dx = from.x - of.x;
  const dy = from.y - of.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return { x: 1, y: 0 };
  return { x: dx / length, y: dy / length };
}

/** 交战落点：敌机侧后方（按玩家→敌机方向取侧向），再沿侧向推开到车道距离之外。 */
function flankPoint(player: WingPoint, enemy: WingPoint): WingPoint {
  const dir = unitAway(enemy, player);
  const perp = { x: -dir.y, y: dir.x };
  const base = { x: enemy.x - dir.x * WING_STANDOFF + perp.x * WING_LANE, y: enemy.y - dir.y * WING_STANDOFF + perp.y * WING_LANE };
  const lane = laneDistance(base, player, enemy);
  if (lane >= WING_LANE) return base;
  const push = WING_LANE - lane + 10;
  return { x: base.x + perp.x * push, y: base.y + perp.y * push };
}

export function planWingman(input: WingInput): WingPlan {
  const { player, self, enemy, flux } = input;
  if (flux >= WING_HANDOFF_AT) {
    const away = unitAway(self, enemy ?? player);
    return { mode: WING_VENT, target: { x: self.x + away.x * WING_SPEED * 4, y: self.y + away.y * WING_SPEED * 4 } };
  }
  if (enemy === undefined || distance(self, enemy) > WING_RANGE) {
    const follow = { x: player.x + WING_FOLLOW_OFFSET.x, y: player.y + WING_FOLLOW_OFFSET.y };
    return { mode: WING_FOLLOW, target: follow };
  }
  return { mode: WING_ENGAGE, target: flankPoint(player, enemy) };
}

/** 排散结束后能否回到交战：降到接管线以下即可。 */
export function canResume(flux: number): boolean {
  return flux <= WING_RESUME_AT;
}
