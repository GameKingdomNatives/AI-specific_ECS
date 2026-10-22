# 场景编辑器验收矩阵（S0–S5b）

| # | 能力 | 证据 | 结论 |
|---|---|---|---|
| 1 | scene schema / 节点树 / 资源别名 / 系统清单 | `scene-schema.test.ts` 5 组；`scene-schema` 校验重复 id、父缺失、环、phase、after、非有限数字 | ✅ |
| 2 | 运行时实例化（节点→实体、组件、父子、资源） | `scene-instantiate.test.ts` 3 组；浏览器 `entities 67`（64 ambient + root/player/target） | ✅ |
| 3 | 调度数据化 | `scene-schedule.test.ts` 4 组；浏览器 `__itbScene.systems=8`、timings 列出 8 个系统 | ✅ |
| 4 | 场景树 / 检查器 / 资源浏览器 | S3 浏览器：节点 3→4、重命名、+Position、贴图标记；截图 `artifacts/panel/editor-s3.png` | ✅ |
| 5 | 调度图（阶段/after/启停/params） | S4 浏览器：5→6 系统、after=demo.player、已禁用；截图 `artifacts/panel/editor-schedule-s4.png` | ✅ |
| 6 | 保存 API 校验 + 路径守卫 + 原子写 | API：合法 200 / `../evil.scene.json` 400 / schemaVersion 2 400 | ✅ |
| 7 | 保存 → 磁盘 → 运行时重建 | 编辑器加节点保存（文件 4）→ 整页重载 → `__itbScene.nodes=4`、`entities 68` | ✅ |
| 8 | 加载失败降级 | 临时移除 scene 文件重载 → HUD `scene fallback`、无 `__itbScene`、`entities 65`，游戏正常 | ✅ |
| 9 | 场景热加载 | Vite watcher 监听 `scenes/*.scene.json` → `full-reload`（保存后自动重载） | ✅（整页重载） |
| 10 | 门禁 | 每阶段 `node tools/gate.mjs` 全量 PASS；测试基线 37 | ✅ |

## 接受的偏离

- ambient boxes 仍由内容 JSON + `spawnSpec` 生成；scene 负责 player/root/target 与系统顺序（后续 spawner 组件替代）。
- 热加载是整页重载，不是世界内热替换。
- 编辑器同事件循环连点两动作可能后写覆盖前写（React 闭包）；真实点击分事件。
- 参数无逐系统 schema；after 是文本框而非连线画布。
