# game.weapon.terminator · 终结武器槽

- 阶段：ai
- 系统名：`game.weapon.terminator`
- 文件：`apps/game/src/game/systems/weapon.ts`
- 按键：`E`

## 职责
高爆发、低频率的一击：在敌方过载窗口或护盾承伤时倾泻伤害，代价是瞬间拉高软辐能。

## 输入 / 输出
- 读：`Position`、`Aim`、`Flux`、`Terminator`、`Vent`
- 写：`Flux`、`Terminator`，经命令缓冲生成 `Projectile`

## 不变量
- 单发软辐能 12，装填 96 tick；红线区同样按性能系数减速。
- 过载或排散期间不发射。
- 与主炮共用同一套开火/弹道代码（`WeaponSpec`），没有第二套真相。

## 所有权
`owns: ['terminator']`

## 验证
`apps/game/tests/weapon.contract.test.ts`：发射一颗、软辐能 ≥12、装填 ≥90。
