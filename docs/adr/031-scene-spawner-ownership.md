# ADR-031 场景 spawner 与 ambient 归属（D2）

- 状态：已接受（D2）
- 日期：2026-10-22
- 相关：ADR-030、`docs/audits/data-driven-runtime-plan.md`

## 背景

S5b 的 64 个 ambient 箱子由 `spawnSpec` 代码生成，不属于任何 scene 节点；编辑器删除/修改场景时无法解释或控制这批实体，节点与实体「看起来不是一一对应」。

## 决策

1. **新增 demo 组件 `BoxSpawner`**（`packages/engine/src/demo`）：`{count,minSize,maxSize,speed}`，数值字段，符合 ECS 列约束。
2. **生成系统 `scene.spawner`**：首个 tick 遍历带 `BoxSpawner` 的节点，通过 `CommandBuffer.spawn` 生成箱子（位置/速度公式与 `spawnBoxes` 一致），`count` 夹在 0..2000；只生成一次；`onSpawn(nodeEntity,count)` 供应用上报。
3. **归属映射**：应用把 `onSpawn` 的实体换算为节点 id（`__itbScene.entities` 反查），写入 `__itbScene.spawned[nodeId]`；spawned 实体不进入节点映射，编辑器可将 spawner 节点显示为「生成 N」。
4. **数据迁移**：示例 scene 增加 `spawner` 节点（BoxSpawner 64/8/14/1）与 `scene.spawner` 系统；scene 可用时不再执行 `spawnSpec`（内容 JSON 只作为 scene 不可用的降级路径）。
5. **编辑器**：`COMPONENT_KINDS` 增加 BoxSpawner 四字段，可在检查器编辑数量/尺寸/速度。
6. **确定性**：生成公式固定、按节点查询顺序生成；命令缓冲阶段末 flush；不依赖时间/随机。

## 验收

- 单测（引擎）：`spawner.test.ts` 2 组——生成数量 + onSpawn 上报；重复 update 不重复生成、count=5000 夹到 2000。
- 浏览器：scene 4 节点/9 系统；`entities={root:0,spawner:1,player:2,target:3}`、`spawned={"spawner":64}`、HUD `entities 68`；编辑器删除 spawner 节点 → 保存 → 重载 `nodes=3/entities 3/spawned {}`，ambient 全部消失。
- 全量门禁 PASS。

## 后果

- 正面：ambient 数量/尺寸/速度成为场景数据；两类所有权清晰；删除 spawner 即删除整批 ambient。
- 代价：内容 JSON 的 `boxes` 在 scene 模式下不再驱动箱子，仅降级；编辑器暂未显示「生成 N」徽标（`__itbScene.spawned` 已可读，D4 与元数据一起补 UI）。
- 回退：scene 不可用时 `spawnSpec` 仍按内容 JSON 生成。
