# game.combat · 命中与伤害

- 阶段：damage
- 系统名：`game.combat`
- 文件：`apps/game/src/game/systems/combat.ts`

## 职责
用弹丸当前位置向物理端口查圆，取 id 最小且阵营不同的机甲：护盾吸收则把伤害转成硬辐能，否则扣结构；结构归零即销毁并发出击杀事件。

## 输入 / 输出
- 读：`Position`、`Projectile`、`Flux`、`Shield`、`Mecha`、物理查询结果
- 写：`Flux`（硬辐能）、`Mecha`（结构值）、`commands.despawn`、事件 `game.hit` / `game.kill`

## 不变量
- 命中列表先按实体 id 升序再取第一个，保证确定性。
- 护盾只转硬辐能、不穿透扣结构；这是「攻防共享资源池」的关键一段。
- 一次命中只回收一颗弹丸，不连坐。

## 所有权
`owns: ['combat']`

## 验证
`apps/game/tests/combat.contract.test.ts`：护盾转硬辐能、无盾扣结构、结构归零销毁并发事件。

## 电子压制（iter-003）
支援弹（`effect = 1`）命中后，目标 `Suppressed.ticks = 90`（1.5s）：期间目标无法开盾。计时在 `game.combat` 每 tick 递减，不新增系统。
