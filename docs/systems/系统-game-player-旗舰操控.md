# game.player · 旗舰操控

- 阶段：ai
- 系统名：`game.player`
- 文件：`apps/game/src/game/systems/controls.ts`

## 职责
把玩家输入翻译成旗舰的位置与朝向：WASD 位移、指针朝向、右键护盾、V 排散。红线区按同一个性能系数同时降低移动与装填。

## 输入 / 输出
- 读：`Position`、`Flux`、`InputSnapshot`（`getInput()` 注入）
- 写：`Position`、`Aim`、`Shield`、`Vent`

## 不变量
- 过载时不许开盾、不许排散：控制层直接拒绝，不靠 UI 提醒。
- 位置夹在 `[margin, 宽/高 - margin]`，不会走出世界。
- 朝向只有一处计算（`Aim.angle`），渲染与开火共用。

## 所有权
`owns: ['mecha-control']` —— 只写玩家实体的控制类组件，不碰其他实体。

## 验证
`apps/game/tests/controls.contract.test.ts`：位移方向、朝向、护盾/排散开关、过载拒绝。
