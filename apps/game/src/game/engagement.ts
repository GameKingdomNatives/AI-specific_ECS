/**
 * 交战令牌：同一 tick 只允许一架敌机处于攻击态，其余排散待命。
 * 攻击者辐能涨到 HANDOFF_AT 就让位给已排散干净的同伴（<= RESUME_AT），形成「压制 → 排散 → 接管」的循环。
 * 纯函数、无世界依赖：给定每个敌人的辐能与当前模式，返回本 tick 的唯一攻击者。
 */
export const AI_ENGAGE = 0;
export const AI_VENT = 1;

/** 换手线：攻击者软+硬辐能到这里就交给同伴。 */
export const HANDOFF_AT = 60;
/** 接管线：同伴辐能降到这以下才有资格接管。 */
export const RESUME_AT = 30;

export interface Combatant {
  readonly id: number;
  readonly flux: number;
  readonly mode: number;
}

function pickLowest(list: readonly Combatant[]): Combatant | undefined {
  let best: Combatant | undefined;
  for (const item of list) {
    if (best === undefined || item.flux < best.flux || (item.flux === best.flux && item.id < best.id)) best = item;
  }
  return best;
}

/**
 * 选攻击者：
 * - 只有一个敌人时，辐能未到换手线就继续打；到了就返回 undefined（它自己排散），保持单机行为不变。
 * - 多机时，当前攻击者未到换手线就继续；否则优先交给辐能最低且已降到接管线以下的同伴；
 *   若没人降到接管线以下，就交给辐能最低的那架（避免两边都僵在原地）。
 */
export function selectAttacker(enemies: readonly Combatant[], current: number | undefined): number | undefined {
  if (enemies.length === 0) return undefined;
  const sorted = [...enemies].sort((left, right) => left.id - right.id);
  const active = sorted.find((item) => item.id === current);
  if (active !== undefined && active.flux < HANDOFF_AT) return active.id;
  if (sorted.length === 1) return undefined;
  const ready = sorted.filter((item) => item.flux <= RESUME_AT);
  const pool = ready.length > 0 ? ready : sorted;
  return pickLowest(pool)?.id;
}
