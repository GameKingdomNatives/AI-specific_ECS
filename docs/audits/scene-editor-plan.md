# 场景编辑器计划（节点-场景式资源与调度）

- 日期：2026-10-22
- 目标：把「资源管理 + 调度」从纯代码编辑升级为**节点-场景式数据与内置编辑器**；scene JSON 是唯一数据源，运行时实例化为 ECS 实体与调度器。
- 依据：`docs/00-最终指令.md` §6（场景描述即数据）、§9（热重载）、§11（数据驱动）；既有 `docs/audits/engine-parity-matrix-2026-10-22.md`。
- 约束：不破坏 10 端口冻结契约、确定性与全量门禁；场景只描述数据，不改变核心层边界。

## 1. 形态（已确认）

| 维度 | 决定 |
|---|---|
| 编辑界面 | 内置浏览器编辑器（React 面板，复用现有 UI 技术栈） |
| 场景内容 | 一份 scene JSON 同时包含**节点树、资源引用、系统清单/阶段/顺序** |
| 保存方式 | Vite 开发插件提供校验 + 原子写回 `apps/game/scenes/*.json` |
| 运行时 | scene 经 zod 校验 → 实例化为 ECS 实体（节点=实体，组件映射为引擎组件）与调度器（系统清单=调度顺序） |

## 2. 分阶段

### S0 · 设计与数据契约（本轮）
- 本计划 + ADR-024。
- `scene` 模块：zod schema、`parseScene`（重复 id、父节点缺失、父子环、系统阶段、`after` 引用、重复系统）。
- 单测；`packages/engine` 增加 `./scene` 子路径（保护路径，记录 ADR）。

### S1 · 运行时场景加载（已完成）
- `instantiateScene(world, scene, {lookup, parent?})`：节点→实体；组件值→组件写入；父关系→`SceneParent` 组件（可覆盖）；`node.assets` 别名→manifest 资源名。
- 失败降级：未知组件/字段、字符串写 ECS、缺失别名进 `issues`，不中断其它节点。
- 单测：实体数量、组件值、父子关系、资源解析、issue 不阻断、可替换父组件。

### S2 · 调度数据化（已完成）
- `buildSchedule(scene, build)`：系统清单→`SystemDef[]`；phase 以 scene 为准、after 合并、enabled=false 保留但不入调度、params 透传给工厂。
- 校验：未注册 id、工厂 name 不一致、scene 内 after 环进 issues；环存在时不返回半套调度。
- 单测：phase/after/disabled/params、错误报告、构造结果可直接交给 `Scheduler` 执行（ADR-025）。
- 应用接入保持双轨：现有 `system-registry.ts` 仍为默认路径，S5 接场景默认关卡。

### S3 · 编辑器：场景树 + 检查器 + 资源浏览器（已完成）
- `?editor=1` 动态挂载独立 React 面板；读 `apps/game/scenes/demo.scene.json`，内存编辑、每次 apply 复验。
- 场景树（选中/+子节点/删除并接管子节点）、检查器（名称/父节点/资源下拉/Position/Box 字段）、资源浏览器（manifest → 贴到选中，自动建别名）。
- 浏览器验收：节点 3→4、重命名 root→enemy、+Position、贴图标记出现；ADR-026。

### S4 · 编辑器：调度图（已完成）
- `ScheduleEditor`：按 `PHASES` 分组的阶段泳道、系统卡片（id/phase/after/禁用标记）；新增系统、删除、改阶段、启停、after（逗号、失焦提交）、params key/value 增删。
- 引擎 `schedule-edit.ts` 纯函数 + `parseScene` 复验；浏览器验证 5→6 系统、after=demo.player、禁用标记；ADR-027。

### S5 · 保存闭环与验收
- Vite 插件：`POST /__scene/save`（校验→临时文件→rename 原子写），路径限定 `apps/game/scenes/`。
- 浏览器 E2E：改节点/系统→保存→重载场景→断言组件/资源/顺序生效；截图。
- 验收矩阵：资源引用、场景树、检查器、调度图、保存、失败降级、热加载逐项证据。

## 3. 数据模型（S0 定稿）

```json
{
  "schemaVersion": 1,
  "name": "demo",
  "resources": { "player": "player", "enemy": "box" },
  "nodes": [
    { "id": "root", "name": "root" },
    { "id": "player", "name": "player", "parentId": "root",
      "components": { "Position": { "x": 960, "y": 540 }, "Box": { "size": 24 } } }
  ],
  "systems": [
    { "id": "demo.movement", "phase": "movement", "enabled": true, "after": [] },
    { "id": "demo.weapon", "phase": "damage", "params": { "cooldown": 8 } }
  ]
}
```

- `nodes[].components`：组件名→扁平字段（number/boolean/string），运行时按注册表解析；禁止嵌套对象，保证 SoA 可写。
- `resources`：别名→manifest 资源名；节点只引用别名，资源真值仍在 manifest。
- `systems`：id 必须存在于系统注册表；`phase` 来自 `PHASES`；`after` 引用同场景系统 id；`params` 为该系统的参数对象。
- 校验是唯一入口：非法 scene 返回问题清单（路径 + message），不抛异常。

## 4. 验收（总）

1. S0–S5 全部有单测或浏览器证据；全量门禁 PASS。
2. 场景编辑器可完成「新建节点→挂资源→改组件→调系统顺序→保存→重载生效」闭环。
3. 失败路径（schema 错、资源缺失、保存失败、系统环）都有可读提示与降级。
4. 架构不倒退：core 不依赖 scene/editor；scene 只依赖 core/data；编辑器只通过 scene 文档与保存 API 操作。
