# physics.bodySync

- 职责：把 ECS 的 `Position`/`Box` 同步到物理查询层，tick 末写回物理结果走命令缓冲。
- 输入：`Position`/`Box`、IPhysics。
- 输出：物理 body 位置/形状；接触候选。
- 不变量：物理不持有实体真值；不直接改 ECS；结构增删走命令。
- 所有权：physics 端口实例。
- 验证：`packages/engine/tests/physics.test.ts`、`bridge.contract.test.ts`；浏览器刚体数。
