# ADR-037 多 scene 文件与另存（P0-3）

- 状态：已接受
- 日期：2026-10-22
- 相关：ADR-034/035/036、`docs/audits/引擎实际能力与规范偏差审计.md` P0-3

## 背景

保存端点与运行时加载都硬编码 `demo.scene.json`；编辑器无法打开/另存其他 scene，watcher 事件也不带文件名。

## 决策

1. **文件解析**（`apps/game/src/scene-file.ts`）：
   - `?scene=<name>.scene.json` 选择文件，非法回退 `demo.scene.json`；
   - 文件名白名单 `[A-Za-z0-9._-]+.scene.json`，无路径分隔符；
   - `currentSceneFile()`：编辑器/全局 `__itbSceneFile` 优先，否则 URL；运行时与保存共用。
2. **后端**：
   - `/__scene/save` 已支持任意合法文件名（原有路径守卫保留）；
   - 新增 `GET /__scene/list` 返回 scenes 目录下合法文件；
   - watcher 事件携带 `{file}`，客户端只对当前文件 reload。
3. **编辑器**：头部下方 `SceneFileBar`：下拉打开（URL 导航，运行时与编辑器同源加载）、输入文件名「另存为」（写盘后导航）。
4. **保存**：`SaveButton` 从 `currentSceneFile()` 取文件名，保存成功仍直接 `__itbApplyScene`。
5. **运行时**：`loadSceneRuntime` 与 watcher reload 使用 `currentSceneUrl()`；`?scene=` 可冷启动指定文件。

## 验收

- 浏览器：`/__scene/list` 返回 `["demo.scene.json"]`；编辑器中另存为 `test.scene.json` → 文件生成 4 节点，URL 变 `?scene=test.scene.json`，运行时同页加载。
- 在 test 把 spawner count 改为 8 保存 → `test=8`、`demo=64`（保存隔离）。
- 下拉切回 demo → URL `?scene=demo.scene.json`、运行时 4 节点/`spawned=64`；测试文件已删除。
- 全量门禁 PASS。

## 边界

- 打开/另存用整页导航（dev 工具可接受）；后续可改为无刷新 openFile + 文档状态切换。
- 文件列表只扫 `apps/game/scenes`；不含子目录/嵌套 scene（暂缓）。
- `?scene=` 仅开发入口；生产打包仍按默认文件。
