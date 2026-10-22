# demo.weapon

- 职责：按住指针时按冷却生成子弹。
- 输入：玩家 `Position`、输入快照、参数 `cooldownTicks`（默认 6）/`speed`（默认 14）。
- 输出：新子弹实体（CommandBuffer）。
- 不变量：冷却按 tick；player 失效时跳过；参数经 SystemMeta 校验/收敛。
- 所有权：玩家。
- 验证：`packages/engine/tests/weapon.contract.test.ts`；浏览器射击、击杀计数。
