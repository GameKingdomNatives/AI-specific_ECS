# game.enemyAi · 敌机决策

- 阶段：ai
- 系统名：`game.enemyAi`
- 文件：`apps/game/src/game/systems/enemy.ts`

## 职责
只看得到位置与辐能，不看玩家输入：辐能越过阈值就关盾排散并后撤，否则压入射程带、朝玩家瞄准。

## 输入 / 输出
- 读：`Position`、`Flux`、`Mecha`、`Ai`
- 写：`Position`、`Aim`、`Shield`、`Vent`、`Ai`

## 不变量
- 被电子压制（`Suppressed.ticks > 0`）时不开盾，即使辐能很低。
- 决策不含随机数：同一世界状态得到同一行为，回放可复现。
- 排散与开盾互斥；过载时同样停排散。
- 后撤方向是玩家反方向，速度降为 80%。

## 所有权
`owns: ['enemy-ai']`

## 验证
`apps/game/tests/enemy.contract.test.ts`：低辐能交战、越线排散后撤、交战才开火。
