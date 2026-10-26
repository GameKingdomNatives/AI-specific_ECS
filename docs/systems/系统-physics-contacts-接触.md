# physics.contacts

- 职责：把物理接触对转为 `physics.contact` enter/exit 延迟事件，限制每 tick 上限。
- 输入：IPhysics 接触对；过滤/去重。
- 输出：事件总线延迟事件；不直接改实体。
- 不变量：同一对不重复 enter；退出必须成对；溢出计数可观测。
- 所有权：bridge。
- 验证：`packages/engine/tests/contacts.test.ts`；浏览器接触事件/诊断。
