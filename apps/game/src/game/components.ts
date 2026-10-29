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
/** 弹丸：伤害、发射方阵营、效果类型（0 = 直接伤害，1 = 电子战：只加硬辐能）、武器槽（0 主炮 / 1 终结 / 2 支援 / 9 敌机）。 */
export const Projectile = defineComponent('Projectile', { damage: 'f32', faction: 'u32', effect: 'u32', slot: 'u32' });
/** 终结武器槽：高爆发、高软辐能，装填慢。 */
export const Terminator = defineComponent('Terminator', { cooldown: 'f32' });
/** 支援武器槽：长射程电子战，低直接伤害。 */
export const Support = defineComponent('Support', { cooldown: 'f32' });
/** 朝向（弧度）：渲染与开火共用同一份，避免两套真相。 */
export const Aim = defineComponent('Aim', { angle: 'f32' });
/** 敌机 AI：0 = 交战，1 = 排散/后撤。 */
export const Ai = defineComponent('Ai', { mode: 'u32', timer: 'u32' });
/** 主动排散：硬辐能快速下降，但排散期间无法开火与开盾。 */
export const Vent = defineComponent('Vent', { active: 'bool' });
/** 电子压制：支援弹命中后 90 tick 内目标无法开盾（压盾 1.5s）。 */
export const Suppressed = defineComponent('Suppressed', { ticks: 'f32' });
/** 僚机：自主协作状态（0 跟随 / 1 交战 / 2 排散 / 3 待命），逐 tick 由决策层写入。 */
export const Wingman = defineComponent('Wingman', { mode: 'u32', timer: 'u32' });

/** 僚机位：挂在玩家身上的补位状态（0 = 僚机在场，>0 = 补位倒计时）；损失数用于复盘。 */
export const WingSlot = defineComponent('WingSlot', { respawnTicks: 'u32', losses: 'u32' });

/** 单局推进：波次编号、总波数、补位倒计时（0 = 不在补位）。 */
export const Run = defineComponent('Run', { wave: 'u32', maxWave: 'u32', spawnTicks: 'u32' });
