# ADR-034 编辑器同步修复：直接应用 + 实时预览 + 去重

- 状态：已接受
- 日期：2026-10-22
- 相关：ADR-032、`apps/game/src/editor/`

## 背景

用户反馈：保存后的场景编辑结果不生效，编辑时场景也不同步。排查结论：

1. `SaveButton` 只把 scene POST 到 `/__scene/save` 并重载编辑器文档；运行时重建完全依赖 Vite watcher 的自定义事件 `itb:scene-changed`。事件未送达（HMR 断线、旧插件、非 dev 入口）时，磁盘已更新但世界没变。
2. 编辑器修改只更新本地文档，没有实时预览；用户必须先保存并等 watcher。
3. 保存与 watcher 可能各重建一次，重复重置运行时。

## 决策

1. **保存后直接应用**：POST 成功后立即调用 `__itbApplyScene(scene)`；不依赖 watcher。应用失败把原因显示在保存按钮上（`保存失败 + issues`），不再假报成功。
2. **JSON 去重**：`applySceneDocument` 记录 `lastAppliedScene`（`JSON.stringify`）；保存后的 watcher 事件/重复预览命中同一文档时直接返回，不重复 rebuild。
3. **实时预览（可开关）**：`usePreview` 在每次用户编辑（`apply` 成功后）防抖 300ms 调用 `__itbApplyScene`；头部「实时」复选框控制；关闭时清掉待执行计时器。
4. **手动应用**：头部「应用」按钮立即应用当前文档；失败写入编辑器 issue。
5. **降级**：`__itbApplyScene` 不存在时（纯静态/旧运行环境）返回 `运行时未就绪`，保存仍成功但按钮提示应用失败，watcher 仍可作为兜底。

## 验收（浏览器）

- 实时开启：选中 spawner，把 count 64→10，未保存；~300ms 后 `__itbScene.spawned.spawner=10`，编辑器保持打开。
- 实时关闭：count 10→20，等待后运行时仍 10；点保存 → 文件写入 count=20、运行时 `spawned.spawner=20`、页面 marker 存活、保存按钮「已保存」。
- 恢复 scene 文件（count 64）→ watcher 去重/应用后 `spawned.spawner=64`，marker 仍存活。
- 全量门禁 PASS。

## 代价与已知限制

- 每次预览/应用仍是重建世界（recorder/kills/物理重置），连续拖动数值会按防抖节奏重开；后续可做「只更新差异」的轻量应用。
- 「实时」开关不持久化（刷新后默认开）。
- watcher 仍保留作为外部改文件的兜底；与直接应用由 JSON 去重协调。
