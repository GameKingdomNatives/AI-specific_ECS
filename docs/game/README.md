# 游戏项目 · 深入战火 / Into the Battlefield

> 与本仓库的引擎（`packages/engine`，npm 名 `agent-specific_ecs`）**平级**：引擎是可被外部消费的库，游戏是产品；`packages/fixture` 只是引擎的测试替身。

## 当前切片

- 场景：`apps/game/scenes/flux-core.scene.json`（`?scene=flux-core.scene.json` 或编辑器打开）
- 内容：一架旗舰 + 一架敌机；辐能状态机（软/硬/过载/红线）、主炮、敌机 AI（交战 / 排散后撤）、命中与护盾转硬辐能、辐能条 HUD。
- 目标：验证《三段走式工程文档》第一段的「单机辐能博弈」是否成立；不做舰队、不做肉鸽、不做美术。

## 操作

- `WASD` 移动；鼠标指向即朝向；左键开火；右键开盾；`V` 排散。

## 目录

- `apps/game/src/game/components.ts`：游戏组件（Mecha / Flux / Shield / Weapon / Projectile / Aim / Ai / Vent）
- `apps/game/src/game/flux-model.ts`：辐能纯函数状态机
- `apps/game/src/game/systems/`：七个游戏系统
- `apps/game/tests/*.contract.test.ts`：契约测试（进全量门禁）
- 系统卡：`docs/systems/game-*.md`

## 迭代路线（2026-10-25 人定）

1. **A · 三武器槽**：主炮 / 终结 / 支援，仍用纯色块，验证「开火—辐能—窗口」节奏。
2. **C · 标准组件上移**：把 Position / Box / Velocity 从夹具上移进引擎，游戏不再依赖测试替身（F-01）。
3. **B · 战后复盘回放**：用引擎录制能力做关键决策点标注；不做战中侧栏，避免破坏单一认知模型。

约束：单局目标 **3 分钟**；敌机保持两态 AI（不加"诱导过载"）；不追求美术，纯色块保持可读；数值按当前先验值不调。

## 与引擎的边界

- 游戏系统只依赖 `agent-specific_ecs/core`、`/ports`、`/scene` 与注入的端口实例；
- 引擎不得 import `apps/`；
- 游戏侧暴露的引擎缺口记在 `docs/game/engine-feedback.md`，不在游戏代码里私改引擎契约。
