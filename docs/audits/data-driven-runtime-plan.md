# 数据驱动运行时计划（D0–D5）

- 日期：2026-10-22
- 起点：S0–S5b 已完成（scene 契约、实例化、调度、编辑器、保存、运行时接线、降级、热重载）。
- 核心问题：作者节点与运行时实体所有权未区分；玩家删除被静默补建；保存同步依赖整页 reload；编辑器字段硬编码；UI 不能独立于 fetch/hook 展示（不利于 Storybook/Figma 协作）。
- 总原则：**scene 是作者数据的唯一来源；AI 负责持续生成，质量由契约/测试/门禁兜底；可视化编辑器是数据之上的薄层，不引入第二套真相。**

## D0 · 语义与文档（已完成）
- ADR-030：两类所有权、玩家语义、运行时快照、AI 质量护栏。
- 本计划。

## D1 · 玩家语义 + 节点/实体映射（已完成）
- `resolvePlayer`：scene 成功加载时缺 player 不再补建；只有 scene 不可用的降级路径才补。
- `__itbScene` 增加 `entities/player/spawned`；HUD 显示 `player missing`；场景树显示 `E<id>`。
- 浏览器证据：player 节点存在时 `entities={root:0,player:1,target:2}`；编辑器删除 player 并保存 → 重载后 `nodes=2、player=null、entities 66`、HUD `player missing`；恢复文件后 `player ok`。

## D2 · spawner 组件与 ambient 迁移（已完成）
- 引擎 demo 新增 `BoxSpawner` + `scene.spawner` 系统：首 tick 经 CommandBuffer 生成、count 夹 0..2000、onSpawn 上报；单测 2 组。
- 示例 scene 增加 spawner 节点（64/8/14/1）与系统；scene 可用时不再走 `spawnSpec`，内容 JSON 仅降级。
- 浏览器：`spawned={"spawner":64}`、entities 68；删除 spawner 节点保存后 entities 3、spawned {}（ADR-031）。

## D3 · 原地重建（保留编辑器状态）
- 把运行时装配抽成 `createGameRuntime()`，暴露 `rebuild(scene)`：清空世界/调度器、重新实例化/调度、保持 renderer/UI/输入；编辑器「应用」调用它而不是整页 reload。
- 失败保留旧世界并显示 issues；watcher 外部改动仍可整页 reload。
- 验收：编辑器不关闭、删除玩家后立即消失、系统顺序即时生效。

## D4 · 元数据驱动表单 + Storybook
- 组件元数据注册表（字段、类型、默认值、min/max）替代硬编码 `COMPONENT_KINDS`；检查器/调度参数表单由元数据生成。
- 拆出纯展示组件（SceneTree/Inspector/ScheduleEditor/AssetBrowser 接收 props），补 Storybook stories；为 Figma 式 UI 协作提供稳定 props 契约。
- 测试：元数据 → 表单字段快照；Storybook 构建通过。

## D5 · 收口
- 更新 `docs/audits/scene-editor-acceptance.md`（新增所有权/玩家/spawner/原地重建/元数据/Storybook 项）。
- 全量门禁 PASS、handoff、目标完成。

## AI 质量护栏（每阶段）
- 契约优先：schema/类型/端口不变；新增行为先加测试或浏览器断言。
- 禁止 `any`、`@ts-ignore`、断言绕过；文件/函数预算与依赖边界保持。
- 每阶段独立提交，先文档后代码或同提交；失败先修根因。
- 人工只需评审数据语义与 UI 手感，不承担逐行实现。
