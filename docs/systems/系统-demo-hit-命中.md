# demo.hit

- 职责：子弹与箱子/玩家重叠判定，命中后发 `demo.hit` 事件并回收子弹。
- 输入：IPhysics 查询、player、Bullet/Box。
- 输出：命中事件（冷却/反馈）、CommandBuffer 销毁子弹。
- 不变量：每颗子弹只结算一次；player 缺失安全跳过。
- 所有权：无。
- 验证：`packages/engine/tests/hit.contract.test.ts`；浏览器击杀数增长。
