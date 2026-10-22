# 引擎 parity 矩阵（2026-10-22）

对照 `docs/00-最终指令.md` §4–§22 与 `docs/audits/engine-parity-plan.md`，逐条给出实现、证据与残余偏离。结论：**PG-01…PG-11 全部实现，无未解释的功能缺口**；剩余项均为已接受偏离或门槛暂缓项。

## 1. 功能矩阵

| 编号 | 要求（规格） | 实现 | 证据 | 结论 |
|---|---|---|---|---|
| PG-01 | §4 系统只写声明组件 | `World.beginWriteScope/endWriteScope` + `SchedulerOptions.enforceWrites` | 单测（合法放行/非法抛错）；`?guard=1` 930 tick err 0（ADR-018） | 实现 |
| PG-02 | §5 非法 tick 录制入档 | `Recording.invalid` + `Recorder.markInvalid()` + replay 拒收 | 单测；`tools/replay.mjs` 对 invalid 退出码 2（ADR-018） | 实现 |
| PG-03 | §5 事件序号确定性 | `SerializedEvent.seq` + `sameEvent` 比对 + CLI 事件差异定位 | 单测（seq 入档/比对）；回放事件 first divergence | 实现 |
| §6 | 端口表与文档一致 | 10 端口文档修正、`port-contract.json` 门禁 | registry 端口哈希校验 | 实现 |
| PG-04 | §7 文本渲染 | `RenderItem.text/font/fontSize` + Pixi Text 池化（HARD） | 单测 text-style；OCR KILLS 0→29（ADR-020） | 实现 |
| PG-05 | §7 相机抖动 | `shakeOffset` + `PixiRenderer.shake` + 命中触发 | 单测；浏览器逐帧 x 9.21→28.29→…→−26.65（ADR-019） | 实现 |
| PG-06 | §9 渲染插值 | `interpolate.ts` + `FixedClock.alpha` + `capturePoses` | 单测；HUD alpha 逐帧变化（ADR-019） | 实现 |
| PG-07 | §12 逐系统 tick 计时 | `SystemStats` 环形窗口 + `Scheduler.systemTimings()` | 单测；浏览器 8 系统 count=60，bodySync avg≈0.16ms（ADR-021） | 实现 |
| PG-08 | §12 debug 形状/颜色命令 | `impl/debug-commands`（line/circle/rect + 颜色）+ 渲染器消费 | 单测；截图红色圆环+双色十字（ADR-021） | 实现 |
| PG-09 | §10 资源清单 | `assets-manifest` zod + `loadTextureUrls` + 应用走清单 | 单测；浏览器 manifest 200/version 1/3 资源（ADR-022） | 实现 |
| PG-10 | §11 schema 指纹降级 | `schemaFingerprint` + `World.schemaFingerprint()` + HMR `schemaGuard` | 单测（顺序/组件/字段/类型）；HMR 路径记录（ADR-022） | 实现 |
| PG-11 | §8 接触事件回灌 | `bridge/contacts.ts`（enter/exit + 上限 + stats），`physics.contacts` 系统 | 单测（真实 PhysicsWorld：enter/exit/上限）；浏览器 8 系统无错（ADR-023） | 实现 |

## 2. 已接受偏离 / 门槛暂缓项

| 项 | 规格位置 | 状态 | 原因与去向 |
|---|---|---|---|
| 图集（TexturePacker） | §10 | 门槛未到 | 当前资源数量与 draw call 未触及；合批已默认开启（ADR-015）。达到阈值再评估，不阻塞 parity |
| 鼠标映射策略 | §11（HARD 待裁定） | 暂缓 | 属输入语义决策，需要用户裁定；不影响引擎功能面 |
| 录制压缩 | §5 | 暂缓 | 先测体积（已有 5 分钟录制基准），未到阈值 |
| GPU 精确计时 | §12 | 观测限制 | WebGL timer query 不可用/不可读；以 CPU 侧 submitMs/avg/p95 替代（已记录） |
| 面板趋势图 | §12 | 门槛未到 | 现有治理面板已含关键读数，趋势属展示层增强 |
| 文本高频更新 | §7 | 设计约束 | 文本视图按内容重建纹理，适合低频数字/标签；高频文字应走位图字体（未来项） |

## 3. 验证与维护

- 全量门禁：`node tools/gate.mjs`（41 步，含 tsc/eslint/registry/测试/覆盖率/回放/依赖边界/构建/基准）。
- 单测基线：32 个测试文件（`tools/test-baseline.json`），drill 5/5。
- 本矩阵取代 `gap-review-2026-10-22.md` 的 P1 清单作为 parity 结论；后续若规格变动，先改矩阵再开新批次。
