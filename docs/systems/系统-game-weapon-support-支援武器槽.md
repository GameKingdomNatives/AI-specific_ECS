# game.weapon.support · 支援武器槽

- 阶段：ai
- 系统名：`game.weapon.support`
- 文件：`apps/game/src/game/systems/weapon.ts`
- 按键：`Q`

## 职责
电子战：发射穿盾弹，只给目标增加硬辐能、不扣结构；低直接伤害、长装填，用来把对手推进过载。

## 输入 / 输出
- 读：`Position`、`Aim`、`Flux`、`Support`、`Vent`
- 写：`Flux`、`Support`，经命令缓冲生成 `Projectile`（`effect = 1`）

## 不变量
- 弹丸 `effect = 1`，命中时由 `game.combat` 转成硬辐能，护盾挡不住。
- 装填 130 tick、每发软辐能 4.5。
- 过载或排散期间不发射。

## 所有权
`owns: ['support']`

## 验证
`apps/game/tests/weapon.contract.test.ts`（生成 effect=1）与 `combat.contract.test.ts`（穿盾只加硬辐能）。
