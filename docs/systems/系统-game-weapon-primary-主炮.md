# game.weapon.primary · 主炮

- 阶段：ai
- 系统名：`game.weapon.primary`
- 文件：`apps/game/src/game/systems/weapon.ts`

## 职责
- 弹丸 `slot = 0`，小、快、暖黄；持续输出、慢压软辐能。
按住左键连射：按 `Aim` 方向生成弹丸，并为发射者累积软辐能。

## 输入 / 输出
- 读：`Position`、`Aim`、`Flux`、`Weapon`、`Vent`
- 写：`Flux`（软辐能增加）、`Weapon`（装填）、经命令缓冲生成 `Projectile`

## 不变量
- 装填以 tick 计；红线区按性能系数减速。
- 过载或排散期间不发射。
- 弹丸只经 `ctx.commands.spawn` 生成，不在系统内直接改世界结构。

## 所有权
`owns: ['player-weapon']`

## 验证
`apps/game/tests/weapon.contract.test.ts`：发射一颗、软辐能与装填变化、过载/排散拒绝发射。
