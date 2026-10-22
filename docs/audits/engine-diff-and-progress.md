# 引擎差异与进度对照表

- 更新：2026-10-21（每次收尾或里程碑后刷新）
- 位置：`docs/audits/`（与 lessons/adr/runbooks 分开，避免与操作手册混在一起）
- 口径：按规格章节逐条勾对；数字全部用命令从 git/门禁读取，不凭印象

## 0. 事实基线（git 读取）

| 项 | 数值 |
|---|---|
| 提交数 | 70 |
| 受版本管理文件 | 257 |
| 引擎源码 | 41 文件 |
| 引擎测试 | 24 文件 |
| 应用代码 | 28 文件 |
| 独立 starter | 21 文件 |
| 工具链 | 29 文件 |
| 文档 | 38 文件 |
| 门禁步骤 | 41 |
| 逻辑帧 | 最近 0.73ms（基线 0.688，容差 1.5，预算 4ms） |

## 1. 逐层对照

| 规格 | 目标 | 现状 | 差异 | 证据 |
|---|---|---|---|---|
| §2/§3 仓库与分层 | core 不外依赖、engine 不依赖 apps | 已达成，depcruise 真检查 | 无 | `checks/depcruise.mjs`，237 模块 0 违规 |
| §4 ECS 内核 | World/scheduler/commands/events | sparse-set+SoA、七阶段、冲突拒绝、阶段末 flush | 无阻塞缺口 | `tests/world|scheduler|commands` |
| §5 事件总线 | 同步/延迟/记录 | 三模式齐全 | 无 | `core/events.ts` |
| §6 端口（10 个） | 冻结形状 + 实现 | 渲染/输入/物理/时钟/随机/存储/事件/日志/**音频 WebAudio**/ModHost 形状 | ModHost 无加载器（规格占位）；鼠标按键重映射需端口变更 | `ports/index.ts`、`impl/audio.ts`、`data/input-map.ts` |
| §7 渲染 | Pixi 渲染表、七层、相机 | 已达成；贴图 Sprite + 失败回退几何；**相机剔除 + 渲染统计 + 视图池化（R1a/R1b）+ 提交计时（R5a）** | 合批待 R5c 验证；图集暂缓（ADR-010） | `pixi-renderer.ts`、`render-cull.ts`、`view-pool.ts`、`pixi-views.ts`、`frame-stats.ts` |
| §8 物理 | 查询层（非求解器） | 形状/射线/sweep/contacts/debug/stats/网格 | contacts 与 debugShapes 无独立测试 | `impl/physics.ts`、`tests/physics` |
| §9 确定性 | 哈希、录制、重演、三次一致 | 全部具备；分组哈希；startHash 守卫；**事件级重演 + 世界快照/恢复（R2a/R2b）** | RNG 流状态需调用方显式快照 | `determinism/*`、`core/world-state.ts`、`replay --repeat 3` |
| §10 数据层 | schema、加载、迁移、资源 | Zod + fallback + 迁移管线 + 资产加载器 + 内容热加载 | 资产清单/图集未做 | `data/*`、`tests/data|migrate` |
| §11 热重载/隔离 | HMR、熔断、dump | 系统 HMR、内容 HMR、单系统熔断、dump 持久化 | 无系统级 dispose 契约文档 | `main.ts`、`impl/diagnostics.ts` |
| §12 调试 | 探针、debugDraw、stats | 探针页、调试绘制、HUD | 无运行时开关面板 | `?probe=`、`__itb` |
| §13 性能 | 3000 实体 ≤4ms；提交 ≤1ms | 逻辑 0.97ms；剔除基准 10000 项 0.45ms；提交 3000 项浏览器 avg 0.95ms / p95 1.4ms，Node 簿记 0.432ms | 提交 p95 超 1ms；无 GPU 侧读数 | `bench`、`render-bench`、`submit-bench` 步骤 |
| §14/15 门禁 | 解析型检查、印章、演练 | 36 步：tsc/eslint/registry/tests(25)/coverage/replay/gitfacts/depcruise/drill(3 类)/findings/build/storybook/starter/assets/bench/render-bench | 覆盖率近似（dist 行号） | `gate.mjs`、`coverage.mjs`、`drill.mjs` |
| §16 面板 | 六块 + 诊断明细 | 8 块（含文件:行:规则:片段:规则源） | 无基准趋势曲线 | `tools/panel` |
| §18 文档 | 流程、ADR、runbook | 27 文件；ADR 2/4/5/6/7/8/9；runbook 1–6；audits 独立目录 | 无独立 API 参考 | `docs/` |
| §19 验收 | 面板/门禁/回放/基准 | 全部可复跑 | 违规演练仅两类 | gate 报告 |
| §22 UI 层 | React + Tailwind + 可视化编辑 | React 19 + Tailwind 4 + Storybook + token 故事 + 静态交付 + 独立 starter（9 故事） | 组件未拆（M2）；无可视化写回（已排除） | `src/ui/**`、`starters/ui-storybook-kit`、`storybook`/`starter` 步骤 |

## 2. 进度判断

| 层 | 估计完成度 | 说明 |
|---|---|---|
| 内核 / 事件 / 调度 | 95% | 规格条目全有测试 |
| 端口 | 85% | 形状 10/10；音频占位、ModHost 未实现 |
| 渲染 | 75% | 功能齐；性能与批处理未做 |
| 物理 | 90% | 查询层完整；两类接口缺独立测试 |
| 确定性 | 90% | 输入级闭环保真；事件级未接 |
| 数据 / 存储 | 85% | 迁移、存档、资产加载齐；图集缺 |
| 门禁 / 治理 | 92% | 34 步（含 drill/storybook/starter）；覆盖率与更多演练待补 |
| UI | 75% | 契约/覆盖层/Storybook/starter 齐；拆组件与状态待做 |
| **引擎整体（不含游戏内容）** | **≈ 82%** | 上述加权 |

## 3. 剩余差异（按风险排序）

1. `IAudio` 真实播放后端缺失（只有静音占位）。
2. `IModHost` 只有形状，无加载器/沙箱。
3. 渲染无批处理/剔除/图集，渲染性能无基准。
4. 无覆盖率阈值；违规演练只覆盖 import 越界与文件预算。
5. UI 组件未拆（ControlBar/StatusText/InfoRow），状态故事不全。
6. 事件记录未参与重演；`contacts`/`debugShapes` 缺独立测试。
7. 输入重映射（键位配置走数据）未做。

## 4. 与理论架构的偏差（已接受）

- 端口 10 个而非原规格 9 个（ADR-006）。
- 物理桥位于 `engine/bridge`（原在 demo，已上移）。
- `demo.*` 为技术夹具，不是游戏内容。
- 设计工具链：Storybook 本地评审；Onlook 与 Figma Dev Mode 均排除（ADR-009）。

## 5. 复现命令

```powershell
node tools/status.mjs
node tools/gate.mjs
npm run storybook:build
npm run storybook:serve
node tools/bench.mjs --entities 3000 --ticks 200 --baseline tools/bench-baseline.json
```
