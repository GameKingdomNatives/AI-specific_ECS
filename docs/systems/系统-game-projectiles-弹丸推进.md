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
