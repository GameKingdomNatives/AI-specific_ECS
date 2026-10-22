# scene.spawner

- 职责：首个 tick 根据节点 `BoxSpawner` 组件生成 ambient 箱子，并上报 `spawned` 计数。
- 输入：`BoxSpawner` 组件（count/minSize/maxSize/speed）、世界尺寸。
- 输出：新实体（Position/Box/Velocity，走 CommandBuffer）；`__itbScene.spawned` 计数。
- 不变量：只生成一次；count 夹取 0..2000；实体归属 spawner 节点，不进入 `entities` 1:1 映射。
- 所有权：spawner 节点；删除节点后不再生成，已有实体随重建消失。
- 验证：`packages/engine/tests/spawner.test.ts`；浏览器 `spawned={"spawner":64}`，改 count 后整重建。
