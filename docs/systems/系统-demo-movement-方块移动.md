# demo.movement

- 职责：环境箱子按 Velocity 移动，边界反弹。
- 输入：`Position`/`Velocity`/`Box`；世界宽高。
- 输出：写 `Position`/`Velocity`。
- 不变量：不增删实体；位置夹在边界内并反向速度。
- 所有权：无（纯数据系统）。
- 验证：`packages/engine/tests/demo.contract.test.ts`；浏览器箱子持续运动。
