# game.flux · 辐能推进

- 阶段：ai
- 系统名：`game.flux`
- 文件：`apps/game/src/game/systems/flux.ts`
- 模型：`apps/game/src/game/flux-model.ts`（纯函数）

## 职责
每 tick 对每个带 `Flux` 的实体推进一步辐能：消散 → 排散 → 红线/过载判定。攻防共享同一资源池是本作的核心元规则。

## 输入 / 输出
- 读：`Flux`、`Shield`、`Vent`
- 写：`Flux`、`Shield`（过载时强制关盾）、`Vent`（过载时停排散）

## 不变量
- 硬辐能只在关盾或主动排散时下降；开盾时只掉软辐能。
- 到 120%（红线终点）才过载；100%–120% 只是性能线性衰减。
- 过载期间任何输入都不能解除；结束后保留 50 点硬辐能。

## 所有权
`owns: ['flux']` —— 只有辐能系统写辐能状态，其他系统通过读数决策。

## 验证
`apps/game/tests/flux.contract.test.ts`：软/硬消散差异、排散速度、红线与过载边界、过载后残留硬辐能。
