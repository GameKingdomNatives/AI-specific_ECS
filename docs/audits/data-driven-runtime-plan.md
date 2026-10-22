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

## D3 · 原地重建（已完成）
- main 运行时字段改 `let`；`rebuild(scene)` 新世界/调度器/物理/recorder，renderer/UI/editor 保持；`ControlsDeps` 改 getter；`render-table.ts` 抽出。
- Vite watcher 改发 `itb:scene-changed` 自定义事件，客户端 `__itbApplyScene` 路径解析后原地重建；失败保留旧世界。
- 浏览器：删除 player 保存 → marker 存活、编辑器不关闭、nodes 3/player null；恢复文件 → 同页 player 恢复（ADR-032）。

## D4 · 元数据驱动表单 + Storybook（已完成）
- 引擎 `scene/meta.ts`：ComponentMeta/MetaField + `defaultsFor`/`coerceFieldValue`（范围/步长/布尔收敛）+ 单测 3 组。
- 应用 `component-meta.ts` 登记 Position/Box/BoxSpawner；检查器与“添加组件”完全由元数据渲染；删除 `component-kinds.ts`。
- Storybook：`editor.stories.tsx` 展示 SceneTree/Inspector/ScheduleEditor/AssetBrowser（静态 props + noop 动作），glob 扩展；全量门禁 storybook 构建通过（ADR-033）。

## D5 · 收口（已完成）
- 更新 `docs/audits/scene-editor-acceptance.md`：补作者节点映射、玩家语义、spawner、原地重建、元数据/Storybook，15 项全有证据。
- 记录接受的偏离（spawner 无节点、重建=重开一局、系统参数无 schema、Storybook 仅展示部件、同 tick 连点）。
- 全量门禁 PASS，目标完成。

## D6 · 同步修复（已完成，ADR-034）
- 保存成功后直接 `__itbApplyScene(scene)`，不再依赖 watcher；`lastAppliedScene` JSON 去重。
- 编辑器「实时」开关：300ms 防抖预览；「应用」按钮手动应用；失败写 issue。
- 浏览器：实时开 count 64→10 即生效；实时关 10→20 保存后文件/运行时均 20，marker 存活；恢复文件回到 64。

## AI 质量护栏（每阶段）
- 契约优先：schema/类型/端口不变；新增行为先加测试或浏览器断言。
- 禁止 `any`、`@ts-ignore`、断言绕过；文件/函数预算与依赖边界保持。
- 每阶段独立提交，先文档后代码或同提交；失败先修根因。
- 人工只需评审数据语义与 UI 手感，不承担逐行实现。
