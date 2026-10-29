# game.wingman · 僚机

- 阶段：ai
- 系统名：`game.wingman`
- 文件：`apps/game/src/game/systems/wingman.ts`（纯决策：`apps/game/src/game/wingman-model.ts`）

## 职责

友军单机僚机：没有敌机时跟到玩家侧后方；敌机进交战半径就去侧翼占位（不压玩家火线）；自身辐能越过换手线就先排散后撤。

**不接任何战中指令**：项目方向是「战中零指挥」，僚机怎么动只由世界状态（玩家位置、敌机位置、自身辐能）决定，玩家在战斗里不能命令它。

## 输入 / 输出
- 读：`Position`、`Mecha`、`Flux`、`Wingman`、`Vent`
- 写：`Position`、`Aim`、`Wingman`、`Vent`

## 不变量
- 决策是纯函数 `planWingman`，无随机：同一世界状态得到同一落点，回放可复现。
- 交战落点到「玩家 → 敌机」连线的距离 ≥ `WING_LANE`(90)：僚机不挡玩家火线。
- 辐能 ≥ `WING_HANDOFF_AT`(60) 一律先排散（`Vent.active=true`）；降到 `WING_RESUME_AT`(30) 以下才可重新交战。
- 位置被夹在 `margin`(24) 边界内，僚机不会飞出场地。
- 不发射、不写事件、不改别的实体：开火与火力分担留待后续检查点（还没给僚机武器槽语义）。

## 所有权
`owns: ['wingman']`

## 验证

- `apps/game/tests/wingman.contract.test.ts`：系统行为（跟随 / 交战 / 排散 / 边界 / 玩家缺失）。
- `apps/game/tests/wingman.test.ts`：纯决策（落点、火线距离、射程边界）。
