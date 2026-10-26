# game.projectiles · 弹丸推进

- 阶段：movement
- 系统名：`game.projectiles`
- 文件：`apps/game/src/game/systems/projectile.ts`

## 职责
弹丸按速度直线前进；出界即经命令缓冲回收。

## 输入 / 输出
- 读：`Position`、`Velocity`、`Projectile`
- 写：`Position`，越界时 `commands.despawn`

## 不变量
- 不反弹、不穿界：越界一律回收，避免弹幕实体无限堆积。
- 位置真值只在 ECS：物理层只读，不写回。

## 所有权
`owns: ['projectiles']`

## 验证
`apps/game/tests/projectile.contract.test.ts`

## 表现（iter-003）
`Projectile.slot` 区分来源：0 主炮（10px 暖黄）、1 终结（24px 橙）、2 支援（15px 品红）、9 敌机（12px 红）。渲染只读该字段，不再按 effect 猜。
