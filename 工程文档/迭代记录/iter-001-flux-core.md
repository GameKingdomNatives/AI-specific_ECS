# 迭代 001：flux-core 首个可玩切片

## 基本信息

| 字段 | 内容 |
|---|---|
| 迭代编号 | iter-001 |
| 目标 | 用引擎成果跑通「辐能博弈」最小可玩切片，并暴露引擎/门禁的适配缺口 |
| 对齐需求 | 用户 2026-10-25：引擎与游戏是平级项目，本阶段推进游戏、反哺引擎 |
| 起始日期 | 2026-10-25 |
| 完成日期 | —（待验收） |
| 状态 | 待返工（见 iter-003） |

## 范围

### 包含
- 游戏内容层 `apps/game/src/game/`（组件、纯函数辐能模型、7 个系统）
- 场景 `apps/game/scenes/flux-core.scene.json`
- 辐能条 HUD、护盾转硬辐能、敌机两态 AI
- 门禁泛化（ADR-057）与检查脚本的管道修复

### 不包含
- 三武器槽、复盘时间轴、僚机、关卡、美术（后续迭代）
- 默认场景切换（保留 demo 为默认）

## 检查点

| # | 检查点 | 状态 | 证据 |
|---|---|---|---|
| 1 | 辐能状态机（软/硬/过载/红线）为纯函数并可单测 | ✅ | `apps/game/tests/flux.contract.test.ts` 4 例 |
| 2 | 旗舰操控（WASD/朝向/开火/护盾/排散）可断言 | ✅ | `controls.contract.test.ts` 2 例 |
| 3 | 敌机两态 AI 与开火 | ✅ | `enemy.contract.test.ts` 3 例 |
| 4 | 命中：护盾转硬辐能、无盾扣结构 | ✅ | `combat.contract.test.ts` 2 例 |
| 5 | 弹丸推进与出界回收 | ✅ | `projectile.contract.test.ts` 1 例 |
| 6 | 游戏系统进门禁（能力表/系统卡/契约测试/结构扫描） | ✅ | `capabilities`、`harness`、`registry` PASS |
| 7 | 全量门禁 | ⚠️ | 73/76；build/storybook/starter 为沙箱管道限制（L3） |
| 8 | 浏览器实跑与手感 | — | 待人在完整会话验证（L4） |

## 边界校验

| 约束 | 是否违反 | 说明 |
|---|---|---|
| 引擎不 import apps | 未违反 | `engine-standalone` + depcruise PASS |
| 游戏内容不进引擎包体 | 未违反 | `package-surface` 仅 dist/src + docs |
| 系统只走命令缓冲做结构变更 | 未违反 | `system-structure` 扫描通过 |
| 不用 any / 断言绕过 | 未违反 | tsc + eslint PASS |

## 证据分层

- L0：`tsc -b` PASS
- L1：51 个测试文件 / 212 例全绿；回放同哈希；bench 0.674ms（预算 4ms）
- L2：全量门禁 80/83（2026-10-26，见 L3）
- L3：`build`、`storybook`、`starter` 因沙箱禁管道子进程未执行
- L4：待人在自己的终端跑 `npm run dev` + `?scene=flux-core.scene.json`

## 环境说明

- 会话类型：受限（DSH 沙箱，workspace-write）
- 环境指纹：node v26.12.1；npm 解析到需要 Node 22 的 shim；管道子进程 EPERM
- 未执行步骤：build / storybook / starter

## 验收

- [x] 检查点 1–6 完成
- [x] 边界未违反
- [ ] L2 全绿（受阻于 L3）
- [ ] 人已验收（固定问题表：[验收-001-002-首轮](../验收记录/验收-001-002-首轮.md)）

### 验收结论

待人在完整会话中跑全量门禁并试玩后填写。

### 遗留问题

- build/storybook/starter 需在无管道限制的会话复验。
- 游戏借用夹具的 Position/Box（F-01），迭代 003 处理。

## 产物

| 产物 | 路径 |
|---|---|
| 游戏组件与系统 | `apps/game/src/game/` |
| 场景 | `apps/game/scenes/flux-core.scene.json` |
| 契约测试 | `apps/game/tests/` |
| 决策记录 | `docs/adr/057-game-content-layer.md` |
| 引擎反馈 | `docs/game/engine-feedback.md` |

## 回顾

- 做对了什么：先解门禁单场景假设，再写游戏代码；数值按文档先验值落地，不边写边调。
- 做错了什么：第一次跑门禁前没意识到 drill 的临时文件会残留（`__drill_violation.ts`），导致 depcruise 假红。
- 下次改进：跑 drill 前后都应检查 `__drill*` 残留；门禁失败先看"是不是环境/残留"，再看代码。
