# game.enemyWeapon · 敌机武器

- 阶段：ai
- 系统名：`game.enemyWeapon`
- 文件：`apps/game/src/game/systems/weapon.ts`

## 职责
仅为处于交战模式（`Ai.mode === AI_ENGAGE`）的机甲推进装填并开火。

## 输入 / 输出
- 读：`Position`、`Aim`、`Flux`、`Weapon`、`Vent`、`Ai`
- 写：`Flux`、`Weapon`，经命令缓冲生成 `Projectile`

## 不变量
- 排散（`Vent.active`）与过载都不开火。
- 与玩家主炮共用同一套 `WeaponSpec` 与开火路径，避免两套弹道逻辑。

## 所有权
`owns: ['enemy-weapon']`

## 验证
`apps/game/tests/enemy.contract.test.ts`
