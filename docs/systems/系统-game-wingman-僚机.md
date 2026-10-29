# game.wingman · 僚机

- 阶段：ai
- 系统名：`game.wingman`
- 文件：`apps/game/src/game/systems/wingman.ts`（纯决策：`apps/game/src/game/wingman-model.ts`）

## 职责

友军单机僚机：没有敌机时跟到玩家侧后方；敌机进交战半径就去侧翼占位（不压玩家火线）并自主开火；自身辐能越过换手线就先排散后撤。被击落后由玩家身上的 `WingSlot` 倒计时补位——一局里僚机不会永久缺席。

**不接任何战中指令**：项目方向是「战中零指挥」，僚机怎么动只由世界状态（玩家位置、敌机位置、自身辐能）决定，玩家在战斗里不能命令它。

## 输入 / 输出
- 读：`Position`、`Mecha`、`Flux`、`Wingman`、`Vent`、`WingSlot`
- 写：`Position`、`Aim`、`Wingman`、`Vent`、`Flux`、`WingSlot`
- 跨系统：补位机用 `CommandBuffer.spawn` 生成（阶段末统一 flush），不直接改别的实体

## 不变量
- 决策是纯函数 `planWingman`，无随机：同一世界状态得到同一落点，回放可复现。
- 交战落点到「玩家 → 敌机」连线的距离 ≥ `WING_LANE`(90)：僚机不挡玩家火线。
- 辐能 ≥ `WING_HANDOFF_AT`(60) 一律先排散（`Vent.active=true`）；降到 `WING_RESUME_AT`(30) 以下才可重新交战。
- 位置被夹在 `margin`(24) 边界内，僚机不会飞出场地。
- 位移平滑：落点距离 ≤ `WING_DEADZONE`(12) 时不动；靠近落点按 `distance / WING_SLOW_RADIUS`(70) 减速（不低于 0.35 倍航速）；单 tick 位移不超过 `WING_SPEED`(7)。
- 状态滞回：交战进 `WING_RANGE`(620)、出 `WING_RANGE_EXIT`(700)；排散保持到辐能降到 `WING_RESUME_AT`(30) 以下。
- 侧翼固定：侧翼方向由实体编号奇偶决定，同一架僚机不来回换边。
- 开火只在交战态：装填（`Wingman.timer`）、过载、排散任一成立都不开火；弹丸走玩家同一套 `spawnShot`（阵营 0、槽 3），并累加软辐能。
- 补位：场上没有僚机时把 `WingSlot.respawnTicks` 置 300 并递减，到点 spawn 一架同规格僚机（hull 80、护盾半径 40），`losses` 加一；僚机在场时倒计时清零。
- 不改别的实体、不写事件：僚机的伤害只通过弹丸走战斗系统。

## 所有权
`owns: ['wingman']`

## 验证

- `apps/game/tests/wingman.contract.test.ts`：系统行为（跟随 / 交战 / 开火 / 辐能 / 死区 / 排散 / 边界 / 玩家缺失）。
- `apps/game/tests/wingman.test.ts`：纯决策（落点、火线距离、射程滞回、侧翼固定、死区小于减速半径）。
- `apps/game/tests/wingman.scene.test.ts`：真 `flux-core.scene.json` 跑 900 tick，验证交战开火、辐能上升、位移上限、被击落与自动补位。
- `apps/game/tests/enemy.contract.test.ts`：僚机更近时敌机改打僚机。
- `apps/game/tests/render-table.hud.test.ts`：徽标带辐能读数。

