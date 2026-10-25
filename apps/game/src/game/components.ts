import { defineComponent } from 'agent-specific_ecs/core';

/** 阵营：0 玩家，1 敌方。用数值而非字符串，保证可哈希、可回放。 */
export const FACTION_PLAYER = 0;
export const FACTION_ENEMY = 1;

/** 机甲本体：阵营 + 结构值。 */
export const Mecha = defineComponent('Mecha', { faction: 'u32', hull: 'f32', maxHull: 'f32' });
/** 辐能：软/硬两段 + 过载剩余 tick（0 = 正常）。 */
export const Flux = defineComponent('Flux', { soft: 'f32', hard: 'f32', overloadTicks: 'u32' });
/** 护盾：开启时伤害转硬辐能，软辐能只能缓慢消散。 */
export const Shield = defineComponent('Shield', { active: 'bool', radius: 'f32' });
/** 武器装填：剩余 tick；红线区按性能系数减速。 */
export const Weapon = defineComponent('Weapon', { cooldown: 'f32' });
/** 弹丸：伤害与发射方阵营；位置/速度复用标准 Position/Velocity。 */
export const Projectile = defineComponent('Projectile', { damage: 'f32', faction: 'u32' });
/** 朝向（弧度）：渲染与开火共用同一份，避免两套真相。 */
export const Aim = defineComponent('Aim', { angle: 'f32' });
/** 敌机 AI：0 = 交战，1 = 排散/后撤。 */
export const Ai = defineComponent('Ai', { mode: 'u32', timer: 'u32' });
/** 主动排散：硬辐能快速下降，但排散期间无法开火与开盾。 */
export const Vent = defineComponent('Vent', { active: 'bool' });
