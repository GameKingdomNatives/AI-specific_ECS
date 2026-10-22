# ADR-029 运行时场景接线与验收（S5b）

- 状态：已接受（S5b）
- 日期：2026-10-22
- 相关：`docs/audits/scene-editor-plan.md` S5、ADR-024/026/027/028

## 背景

S5a 已能保存 scene 文件，但应用运行时仍用代码创建玩家与系统。S5b 把 scene 接进运行时，让「保存 → 重载 → 世界重建」成立，并补齐失败降级与热加载。

## 决策

1. **启动顺序**：`main.ts` 在创建 `World` 后先 `loadSceneRuntime(world, lookup)`（ftech `/scenes/demo.scene.json` → `parseScene` → `instantiateScene`）；`Position/Box` 由组件注册表解析，节点 assets 保留在 `LoadedScene.assets`。
2. **玩家来源**：`resolvePlayer` 优先取 scene 的 `player` 节点实体；scene 不可用/缺节点时按旧路径补建（位置居中、Box 22），保证降级可玩。
3. **调度来源**：系统定义仍由代码注册表构造（`createSystems(deps)`），但顺序/阶段由 `pickSystems` → `buildSceneSchedule` 按 scene.systems 重排；未知 id、after 环等 issues 存在时退回代码顺序，不带着半套调度启动。
4. **资源**：渲染时 `textureFor(entity)` 优先使用 `scene.assets[entity].texture` 解析 manifest URL；否则沿用玩家/箱子默认贴图。
5. **失败降级**：scene 拉取/校验/实例化失败 → `loaded=null`，HUD 显示 `scene fallback`，其余系统照常运行；全局 `__itbScene` 只在成功时写入。
6. **热加载**：Vite 插件监听 `apps/game/scenes/*.scene.json` 的 change，通过 `server.ws.send({type:'full-reload'})` 触发整页重载；保存即重启场景（当前 scene 视为关卡，不做运行中热替换）。
7. **验收矩阵**：`docs/audits/scene-editor-acceptance.md` 记录每项能力、证据与残余偏离。

## 验收

- 正常：`__itbScene = {name:'demo', nodes:3, systems:8, issues:0}`；HUD `entities 67`、`scene demo`；timings 列出 8 个系统。
- 保存生效：编辑器加子节点保存（文件 4 节点）→ 整页重载 → `__itbScene.nodes=4`、`entities 68`。
- 降级：临时移除 scene 文件重载 → HUD `scene fallback`、`__itbScene` 未定义、`entities 65`，游戏继续运行。
- 全量门禁 PASS。

## 偏离与后续

- **ambient boxes**：内容 JSON 的 64 个箱子仍由 `spawnSpec` 代码生成（scene 只负责 player/root/target 与系统顺序）。这是本轮接受的混合模式；后续给 scene 增加 spawner 组件/系统后再完全取代。
- 热加载是整页 reload，不是运行中世界热替换；保存时编辑器文档也会 reload（ADR-026/028）。
- 运行时若 scene 节点组件未知，`instantiateScene` 的 issues 只在 `__itbScene.issues` 计数，未显示在 HUD 详情；后续可在编辑器/诊断面板展开。
