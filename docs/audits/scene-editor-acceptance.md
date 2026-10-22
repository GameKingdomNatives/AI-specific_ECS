# 场景编辑器验收矩阵（S0–D4）

- 更新：2026-10-22（D 轮次收口）
- 结论：S0–S5b 的场景编辑器能力、D1–D4 的数据驱动运行时与元数据编辑能力全部有证据；仅剩已记录的接受偏离。

| # | 能力 | 证据 | 结论 |
|---|---|---|---|
| 1 | scene schema / 节点树 / 资源别名 / 系统清单 | `scene-schema.test.ts` 5 组：重复 id、父缺失、父子环、phase、after、非有限数字 | ✅ |
| 2 | 运行时实例化（节点→实体、组件、父子、资源） | `scene-instantiate.test.ts` 3 组；浏览器 4 作者节点 + spawner 64 = `entities 68` | ✅ |
| 3 | 调度数据化 | `scene-schedule.test.ts` 4 组；浏览器 `__itbScene.systems=9`、timings 列出 9 个系统 | ✅ |
| 4 | 场景树 / 检查器 / 资源浏览器 | S3 浏览器：节点 3→4、重命名、+Position、贴图；截图 `artifacts/panel/editor-s3.png` | ✅ |
| 5 | 调度图（阶段/after/启停/params） | S4 浏览器：5→6 系统、after=demo.player、已禁用；截图 `artifacts/panel/editor-schedule-s4.png` | ✅ |
| 6 | 保存 API 校验 + 路径守卫 + 原子写 | API：合法 200 / `../evil.scene.json` 400 / schemaVersion 2 400 | ✅ |
| 7 | 保存 → 磁盘 → 运行时重建（原地） | D3 浏览器：删除 player 保存 → 未刷新（marker 存活）、编辑器不关闭、`nodes=3/player=null/entities 67`；恢复文件 → 同页 player 恢复 | ✅ |
| 8 | 加载失败降级 | 移除 scene 文件 → HUD `scene fallback`、无 `__itbScene`、`entities 65`，游戏正常 | ✅ |
| 9 | 场景热加载 | watcher `itb:scene-changed` → 客户端 parse+rebuild（不再整页刷新） | ✅ |
| 10 | 作者节点 1:1 映射 | `__itbScene.entities={root:0,spawner:1,player:2,target:3}`；场景树显示 `E<id>` | ✅ |
| 11 | 玩家语义 | 删除 player 后不再补建；HUD `player missing`；`__itbScene.player=null`；系统以 -1 安全跳过 | ✅ |
| 12 | spawner 所有权 | `BoxSpawner` 节点生成 64 ambient，`spawned={"spawner":64}`；删除 spawner → ambient 全消失（entities 3） | ✅ |
| 13 | 组件元数据表单 | `scene-meta.test.ts` 3 组（默认值/夹取/步长/布尔）；检查器显示「位置 X/Y」「方块 尺寸/颜色」「环境生成器 数量/…」 | ✅ |
| 14 | Storybook 展示层 | `editor.stories.tsx` 4 个纯展示部件；Storybook 构建纳入全量门禁并 PASS | ✅ |
| 15 | 门禁 | 每阶段全量 PASS；测试基线 39；drill 5/5 | ✅ |
| 16 | 保存/编辑同步（D6） | 保存成功直接 apply（不依赖 watcher）；「实时」300ms 防抖预览；JSON 去重；浏览器：64→10 未保存生效、10→20 保存后文件/运行时均 20、marker 存活 | ✅ |
| 17 | 同 tick 操作一致（P0-1） | 文档/选中引用同步写；保存读 `getScene()`；浏览器同一 eval 内删除 target+保存 → 文件与运行时均 3 节点、树 3 | ✅（ADR-035） |
| 18 | 系统参数 schema（P0-2） | `ParamField/SystemMeta` + `validateSystemParams` + `coerceParamValue`；调度页显示「冷却 tick/弹速」；`cooldownTicks:999` 被拒绝，10 保存进文件；createSystems 消费 player/weapon 参数 | ✅（ADR-036） |
| 19 | 多 scene 文件（P0-3） | `/__scene/list` + `?scene=` + 编辑器下拉/另存；浏览器：另存 test.scene.json→同页加载，test count 8 保存后 demo 仍 64，切回 demo 恢复 64；测试文件已删 | ✅（ADR-037） |

## 相关审计

- 规范逐节对照与 P0/P1/P2 偏离清单：`docs/audits/engine-spec-audit-2026-10-22.md`
- 同步根因与决策：`docs/adr/034-editor-live-sync.md`

## 接受的偏离

- **spawner 实体没有节点**：ambient 箱子归属 spawner 节点（`spawned` 计数），不进入 `entities` 映射；这是两类所有权的明确设计。
- **原地重建 = 重开一局**：会重置 recorder/kills/物理端口与调度器；renderer/UI/编辑器保留。
- **系统 params 仍是通用 key/value**：没有逐系统参数 schema 与类型化表单；组件表单已元数据化。
- **Storybook 只覆盖展示部件**：完整 EditorPanel 依赖 fetch/hook，未做静态容器。
- **同事件循环连点**：删除+保存同一 tick 时，保存可能使用旧文档（实测）；真实用户点击是分开事件，D5 后可引入文档 reducer 彻底消除。
- **ambient 内容路径**：scene 可用时内容 JSON 的 boxes 不再生成，仅作为 scene 不可用的降级。

## 证据位置

- 单测：`packages/engine/tests/`（scene-*、spawner、meta 等）
- 浏览器截图：`artifacts/panel/editor-s3.png`、`editor-schedule-s4.png`、`editor-save-s5.png`
- 门禁报告：`artifacts/gate/<ts>/report.md`
