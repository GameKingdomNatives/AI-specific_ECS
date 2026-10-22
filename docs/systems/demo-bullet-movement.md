# demo.bulletMovement

- 职责：子弹按速度/方向移动，超界由 cleanup 处理。
- 输入：`Position`/`Bullet`（或速度字段）；世界宽高。
- 输出：写 `Position`。
- 不变量：不增删实体；出界只标记由 cleanup 回收。
- 所有权：无。
- 验证：`packages/engine/tests/demo.contract.test.ts`；浏览器射击后弹道移动。
