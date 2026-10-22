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

### S1 · 运行时场景加载
- `instantiateScene(world, scene, registry)`：节点→实体；组件值→组件写入；父关系→`Parent` 组件（或场景变换层）。
- 资源引用：node 的 `texture`/`audio` 等字段经 manifest 名字解析；缺失→占位并记录 issue。
- 失败降级：schema 错误 → 保留旧场景并展示问题清单；加载失败不阻塞主循环。
- 单测：实体数量、组件值、父子关系、资源缺失降级。

### S2 · 调度数据化
- 系统清单驱动 `Scheduler`：id→工厂注册表、phase、enabled、after、params。
- 校验：未知系统 id、phase 非法、after 成环、参数 schema（每个系统自带 zod 参数校验）。
- 与现有 `system-registry.ts` 兼容：先双轨（代码注册 + scene 覆盖顺序/启用），再切默认。
- 单测：顺序、禁用、参数传递、错误报告。

### S3 · 编辑器：场景树 + 检查器 + 资源浏览器
- 面板布局：左场景树（增删/重命名/拖拽父子）、中节点检查器（组件字段编辑）、右资源浏览器（manifest 资源拖入节点）。
- 运行时数据流：编辑器读写 scene 文档（内存），不直接改世界；「应用」才重建场景。
- 资源校验：引用不存在时红标；保存前阻断。

### S4 · 编辑器：调度图
- 系统列表/画布：阶段泳道、after 连线、启用开关、参数表单；非法环即时提示。
- 保存时写回 `systems`。

### S5 · 保存闭环与验收
- Vite 插件：`POST /__scene/save`（校验→临时文件→rename 原子写），路径限定 `apps/game/scenes/`。
- 浏览器 E2E：改节点→保存→重载场景→断言组件/资源生效；截图。
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
