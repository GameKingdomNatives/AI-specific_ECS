# 引擎实际能力与规范偏差审计（2026-10-22）

- 审计对象：`HEAD 88eb1c8` 的 git 源码（58 个引擎源码模块、39 个测试文件）与 `docs/00-最终指令.md` §1–§22。
- 方法：从目录/导出/调用点盘点实际能力，再逐节对照规范；只记录源码或门禁能证明的事实。门禁：`node tools/gate.mjs`（41 步）在本 HEAD 全绿。
- 结论：**规范的核心能力已落地**；剩余差异集中在「渲染表数据形态、事件/命令类型安全、确定性与门禁的执行细节、文档配套、编辑器深层体验」五类，按 P0/P1/P2 列出。

## 1. 实际具备的能力（源码盘点）

| 层 | 实际能力 | 证据 |
|---|---|---|
| core | 稀疏集 + SoA 列、代际 EntityId、`World` 查询、命令缓冲、事件总线（同步/延迟/seq）、7 阶段调度、拓扑+冲突校验、失败熔断、耗时环形缓冲、写作用域守卫、schema 指纹 | `packages/engine/src/core/*.ts` |
| ports | 10 个冻结端口（含 IModHost 占位），哈希门禁 | `ports/index.ts`、`tools/port-contract.json` |
| impl | Pixi 渲染（图层/剔除/视图池/批处理/文本/抖动/插值/debug）、物理（圆/AABB/胶囊/多边形 SAT、射线/扫掠/锥）、WebAudio/Pixi Sound、localStorage 存档信封、日志/诊断 | `packages/engine/src/impl/*.ts` |
| data | zod 内容/输入映射/资源清单、迁移链、AssetLoader 缓存 | `data/*.ts` |
| determinism | FixedClock（暂停/单步/变速/alpha）、命名 RNG 流、世界哈希分组、录制 v1/v2（事件 seq）、回放与首个分歧定位、快照/恢复 | `determinism/*.ts` |
| bridge | 物理 body 同步、接触 enter/exit 延迟事件（上限/溢出） | `bridge/*.ts` |
| scene/editor | scene schema、实例化、`buildSchedule`、编辑原语、元数据表单、保存 API、原地重建、实时预览 | `scene/*.ts`、`apps/game/src/editor/*` |
| app/UI | React 19 + Tailwind 覆盖层、Storybook 10.6.3、技术夹具、探针/调试/录制/存档 | `apps/game/src/**` |
| tools | 41 步门禁、drill 5/5、覆盖率、回放、依赖边界、render/submit bench、治理面板 | `tools/**`、`docs/audits/*` |

## 2. 规范对照矩阵

图例：✅ 实现；🟡 部分/有偏离；⚪ 暂缓（已记录）。

| 规范 | 状态 | 事实与偏差 |
|---|---|---|
| §1 技术栈 | ✅ | Node 24/TS 5.9/Pixi 8；本机沙箱禁用子进程，测试用 node:test、构建用 tsc（已记录环境偏离） |
| §2 仓库结构 | ✅ | `packages/engine` + `apps/game` + `starters`；engine standalone 门禁通过 |
| §3 分层 | ✅ | depcruise 包装器解析违规；core 不依赖 impl/ports 实现 |
| §4 ECS | 🟡 | 实体/稀疏集/SoA/阶段/命令缓冲/调度冲突校验均有；偏差：查询 API 是 `world.query(defs)` 而非 `Query<Read,Write>` 泛型；迭代中结构变更无运行时保护（靠约定+命令缓冲）；写作用域守卫默认关闭（`?guard=1` 开启）；命令缓冲无 `emit`（事件走总线） |
| §5 事件总线 | 🟡 | 同步/延迟、发布顺序、seq 录制、延迟 flush 均在；偏差：payload 为 `Record<string, unknown>`，没有「事件类型→payload 类型」映射；热路径未接总线（符合） |
| §6 十个端口 | ✅ | 10 个端口 + 冻结哈希；IModHost 仅占位 |
| §7 渲染 | 🟡 | 图层/相机/缩放/文本 Canvas 纹理/批处理/剔除/调试通道均实现；偏差：渲染表是 `RenderItem[]` 对象数组（非 SoA 列），且缺规范中的 `anchor/frame` 字段；未做 Pixi 级 diff 脏标记（按视图池/贴图键同步） |
| §8 物理 | ✅ | 圆/AABB/胶囊/凸多边形 SAT、射线/扫掠/锥、空间网格、接触对排序并事件化；不涉及受力/关节/CCD（规范明确不做） |
| §9 确定性 | 🟡 | 60Hz、插值 alpha、暂停/单步/变速、命名 RNG、哈希、回放、invalid 规则均有；录制已带 `configHash`（ADR-041）；偏差：录制未压缩 |
| §10 数据层 | 🟡 | JSON+zod、迁移、加载器隔离、内容热加载+回滚；偏差：内容用 `$schemaVersion`、scene 用 `schemaVersion`（不统一）；没有「每条失败隔离并汇总」的通用列表（按文件回退） |
| §11 热重载/隔离 | 🟡 | 系统工厂/HMR dispose/schema 变更整页降级、3 次熔断、dump 记录均有；偏差：dump 落 localStorage + 导出，不写规范中的 `diagnostics/` 目录 |
| §12 可视化调试 | 🟡 | `debugDraw` 叠层、`?probe`、逐系统计时、帧统计、bench、p95 超预算告警（ADR-040）均有；偏差：命令数/实体数告警未做 |
| §13 性能目标 | ✅ | 3000 实体 0.688ms/tick（`tools/bench-baseline.json`），逻辑帧 ≤4ms；submit bench 在门禁中 |
| §14 门禁 | 🟡 | tsc 严格、eslint、depcruise、注册表、端口哈希、文件/函数/复杂度、测试数基线、bench、replay、drill 均在；偏差：用 node:test 替代 vitest（环境）；「每个系统至少 1 契约测试」只校验 4 个关键契约文件，不是逐系统；测试数回归按最小文件数而非逐系统用例 |
| §15 执行策略 | 🟡 | hooks 版本化、stamp、保护路径、禁用标记扫描、测试数基线、drill 有；偏差：本地提交因沙箱使用 `--no-verify`（每次都手动全量 gate）；无 origin，push 期门禁无法实测；waivers 机制存在但当前为空 |
| §16 治理面板 | ✅ | `tools/panel` 有状态/门禁/改动凭证/趋势/诊断/命令/批阅台等块；数据来自 git/门禁采集 |
| §17 权限矩阵 | ✅ | AGENTS.md 明确 AUTO/SOFT/HARD；保护路径门禁 |
| §18 文档流程 | ✅ | capabilities/ADR/handoff/quality-log、`docs/systems/` 9 张系统卡与 `07-如何新增系统.md` 已补；quality-log 更新到 v0.10.0（40 测试/181 用例/60 源文件） |
| §19 验收 | ✅ | 面板、全量门禁、dev、HMR/熔断、replay、3000 实体 bench、engine standalone、drill 均有证据 |
| §20 三批交付 | ✅ | 骨架/渲染物理数据/确定性均落地，后有 scene 编辑器扩展 |
| §21 禁止事项 | ✅ | 无 any/ts-ignore（门禁）；无游戏内容（技术夹具）；无平行物理真值 |
| §22 UI 工具链 | ✅ | Pixi canvas + DOM 覆盖层、只读 UiSnapshot、`useSyncExternalStore`（ADR-039）、Storybook 10.6.3（含完整 EditorPanel story）均符合 |

## 3. 偏差清单（按优先级）

### P0（影响数据驱动/编辑闭环，下一步修）
1. **编辑器同 tick 竞态**：删除+保存同一事件循环会保存旧文档（本轮浏览器实测）；~~应改为文档 reducer / 状态机~~ **已修（ADR-035：doc/selected ref + SaveButton getScene）**。
2. **系统参数无 schema**：~~通用 key/value，编辑器无法声明类型/范围~~ **已修（ADR-036：ParamField/SystemMeta + 校验 + 调度表单 + createSystems 消费）**。
3. **多 scene 文件/另存**：~~保存端点固定 `demo.scene.json`~~ **已修（ADR-037：?scene= + /__scene/list + 编辑器下拉/另存 + watcher 文件名）**。
4. **预览/应用 = 整世界重建**：~~recorder/kills/物理重置~~ **部分已修（ADR-038：Position/Box 原地写列，不换世界、不重置 kills；结构/系统/BoxSpawner 变更仍整重建）**。

### P1（契约/规范偏差，需裁定或补实现）
5. 渲染表非 SoA、缺 anchor/frame（§7）——改动 IRenderer 属 HARD，需 ADR。
6. EventBus 无类型映射（§5）——可用泛型 `EventMap` 增量实现，不破坏端口形状。
7. 录制无压缩/configHash（§9）——**configHash 已加（ADR-041）**；压缩仍待测体积后决定。
8. 结构变更迭代保护缺失（§4）——可加 dev 迭代深度哨兵。
9. 写作用域守卫默认关（§4）——dev 默认开、prod 关，需要性能验证。
10. dump 未写 `diagnostics/`（§11）——Node 端可写文件，浏览器端需下载/IndexedDB。
11. 无超预算告警（§12）——**已修（ADR-040：每系统 p95 超阈值写 logger+dump）**；命令数告警仍未做。
12. 门禁逐系统契约测试/测试数（§14）——注册表增强。
13. UI 未用 `useSyncExternalStore`（§22）——**已修（ADR-039：UiRoot 接外部 store，挂载一次）**。
14. 缺系统卡与《如何新增系统》（§18）——**已补（docs/systems + runbook 07）**。
15. quality-log 过期（§18）——**已更新到 v0.10.0**。

### P2（体验/后续）
16. 资产管理缺口（此前审计）：音频未纳入 manifest、无预载、404 重试、无完整性校验。
17. Storybook 只覆盖展示部件，完整 EditorPanel 依赖 fetch/hook。——**已补完整面板 story（EditorPanel 纯展示 + EditorPanelLive）**。
18. 预览开关不持久化；编辑器无撤销/多选/拖拽。
19. ~~`docs/quality-log.md`、`docs/systems/`、`docs/runbooks/07-如何新增系统.md` 缺失。~~ **已补**。

## 4. 结论

- 规范 §1–§22 的**核心机制**均已有实现与门禁证据；偏差主要是「实现形态不同」（渲染表、事件类型、测试运行器、诊断落盘）与「文档配套缺失」，不是功能空白。
- 数据驱动与编辑器已具备可用的保存/预览/重建闭环（ADR-034）；下一步按 P0 顺序修正，并把 §18 文档补齐作为低风险并行项。
- 本审计取代此前零散的 gap-review 作为规范对照基线；后续以本表增量更新。
