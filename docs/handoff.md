# 交接清单

> 每轮收尾更新。新会话先读本节，再读 `docs/00-最终指令.md`。

## 当前状态（2026-10-20 · 第二批进行中）

- 第一批已完成并提交：ECS 内核、九端口、事件总线、门禁（含诊断定位）、治理面板、AGENTS.md。
- 第二批已落地：Pixi 渲染后端（`IRenderer` 实现，渲染表 diff、七图层、相机、逻辑分辨率 1920×1080）、浏览器入口（ESM + Vite）、固定步长循环（60Hz + 累加器）、HUD。
- 实测证据：`?capture=1` 下 `extract` 读出 1016 个亮像素，HUD `tick 110 · entities 64`；导出图 `artifacts/panel/fixture-opaque.png`。
- 门禁新增 `build` 步骤（Vite 构建），全量 14 项 PASS。
- 第二批续：物理查询内核（圆／盒子／凸多边形／射线＋均匀网格哈希）与数据层（Zod 校验、失败隔离、运行时加载）已落地，测试 6 个文件 28 个用例。
- 应用已接数据：HUD 显示 `data ok`，内容来自 `apps/game/public/content/demo.boxes.json`。
- **物理端口 v2 已落地**（HARD，人已批准）：圆／盒／胶囊／凸多边形、层过滤、射线命中点法线、扫掠防穿透、扇形与最近查询、contacts、debugShapes、stats、帧批量同步。契约见 `docs/proposals/002-physics-port-v2.md`，决策见 `docs/adr/003-physics-port-v2.md`。
- 相机修正：世界默认居中（`setCamera(WIDTH/2, HEIGHT/2)`），此前画面只铺满右下四分之一。
- 批阅流程：`review.mjs` 支持 `--tag`；面板新增「批阅台」，参数可写并生成 PowerShell／CMD 脚本（复制或下载，不执行）；说明见 `docs/runbooks/02-提交审核流程.md`。
- 第三批起步：确定性原语已落地——`Random`（按流名派生，与调用次数无关）、`worldHash`（实体升序 + 字段位级哈希）、`Recorder` 与录制文件序列化。测试 8 个文件 38 例，其中「同输入重跑逐 tick 哈希一致」「改一个输入即改最终哈希」已是可执行的回归。
- 第三批续：`FixedClock`（固定步长、单帧上限、暂停/变速/单步）已接进应用主循环；`replay()` + `tools/replay.mjs` 打通无头回放（`--self-test`、`--write`、`--expect`）。回放自测输出 `final 5a66a27c / 重演一致 PASS`，写录制后重放同哈希。用法见 `docs/runbooks/03-回放与偏离定位.md`。
- 第三批续：真实输入已接入主循环——`createBrowserInput` 每 tick 采样（键排序、指针换算到世界坐标），`Recorder` 同步录制；页面 HUD 显示 `tick · entities · keys · rec · hash`，`window.__itb` 可导出录制与哈希。实测：指针移到 (102.4, 66.8)，玩家实体移动到 (101.7, 66.4) 并停住，`rec 570` 与 tick 同步。
- 单系统崩溃隔离：`Scheduler` 支持连续失败阈值（默认 3）熔断、`disabledSystems` 与 `onSystemError` 回调，其余系统照跑；集成测试覆盖 60Hz 与 30Hz 帧率下 tick 序列一致、录制重演哈希一致。
- 探针与热替换：`?probe=<system>` 只跑单系统（8 个方块 + 玩家），HUD 显示 `probe <name>`；`system-registry.ts` 走 Vite HMR accept，实测 tick 从 510 连续跑到 1400、系统列表不变、URL 未变——**替换系统而世界状态保留**。崩溃 dump 落在内存，`__itb.dumps()` 可取。
- 基准：`npm run bench`（3000 实体／200 tick）实测 **0.703 ms/帧**，预算 4ms，PASS。
- 内容热加载：`apps/game/src/data/demo.boxes.json` 为唯一内容源；改 count 64→20，页面无需刷新，实体数变 21 且 HUD 显示 `data ok (hot)`；校验失败不应用新值。
- 端到端闭环：浏览器 `__itb.recording()` 导出的 403 tick 录制，用 `node tools/replay.mjs --app … --expect-hash …` 无头重演，最终哈希 `b5ef9765` 一致。
- 基准已入门禁：`bench` 步骤（3000 实体／200 tick，预算 4ms），实测 0.64–0.70ms。
- 已知边界：跨内容热加载的录制不可重演（热加载会重建实体），不应参与哈希回归。
- 基准升级：`bench` 现在同时判「绝对预算 4ms」与「历史基线 ×1.25」；基线在 `tools/bench-baseline.json`（当前 0.625ms），重录用 `node tools/bench.mjs --update`。
- 干净开局校验：录制带 `startHash`，重演前比对；实测干净录制 `43a686dd` 重演哈希 `54677965` 一致，篡改 startHash 后 CLI 明确报「不匹配」并以 1 退出。
- 数据迁移：`applyMigrations` 逐版迁移、缺链/跳版/版本过高都明确失败，已进测试。
- 第四批起步：存储与存档已落地——`createMemoryStorage` / `createLocalStorage` / `createSaveStore`；存档信封带 `$schemaVersion`，旧档逐版迁移、新档拒绝、损坏档搬到 `<key>:quarantine:<时间戳>` 后返回问题（不抛异常）。迁移已接进内容路径（`parseContentMigrated`）。
- 存档接进画面：`npm run dev` 页面左上角有 存档／读档／清除／导出录制 四个按钮与状态行（含隔离档计数）。实测：移动到 (515,269) 存档 → 移到 (1790,1001) → 读档精确回到 (515.47,269.03)，状态显示 `已读档 @ tick 638 · 隔离 0`。
- 资源加载：`createAssetLoader`（成功缓存、失败返回问题、clear）已进引擎 data 导出。
- 面板：趋势卡新增「逻辑帧 / 基线 / 容差」一行，数据来自 bench.log 与 baseline。
- 素材改代码生成：`tools/gen-assets.mjs` 用 `zlib` + 手写 CRC32 编码 PNG（无图像库），生成 `player/box/bullet` 三张到 `apps/game/public/assets/` 与 manifest；门禁新增 `assets` 步骤校验签名与尺寸。
- 贴图接入：端口 `RenderItem.texture?`（ADR-004，HARD 附加变更），渲染层按 URL 缓存 Texture 用 Sprite，失败退回几何图形；实测页面 65 个实体全部为 `Sprite`。
- 临时鼠标交互：按住左键朝指针连射（冷却 6 tick、速度 14），子弹用 `bullet.png`；实测按住 0.9s 场上 4 发、松开 1.8s 后归零。
- 顺手修的真问题：子弹原来走的是「会反弹」的方块移动系统，永远不出界也不回收；已拆成 `demo.bulletMovement`（直线、出界即 despawn），方块移动改用 `query(Position, Velocity, Box)`。
- 命中检测走物理端口：`demo.bodySync`（collision 阶段把 ECS 位置同步为圆形刚体）＋`demo.hit`（damage 阶段 `queryCircle`，命中即销毁子弹与目标并发 `demo.hit` 事件），页面 HUD 显示 kills／bodies。
- 抓到的第二个真问题：`worldHash([Position, Box, Bullet])` 语义是「同时拥有三者」，而方块与子弹互斥 → 哈希恒为 FNV 基值 `811c9dc5`，确定性校验形同虚设。已新增 `worldHashGroups`（ADR-005，既有算法不变），浏览器与 CLI 统一为 `[[Position, Box], [Position, Bullet]]`。
- 验证：浏览器录制 386 tick（含射击与命中，kills 1）→ `node tools/replay.mjs --app … --expect-hash e6e4938c` 得到同一哈希；而上一版录制被 startHash 正确拒绝（跨版本/非干净开局）。
- 范围说明：`demo.*` 是**技术夹具**，用于验证系统排序、命令缓冲、刚体同步、事件与确定性；机甲／辐能／僚机／关卡仍不在范围内。
- 规格修正：端口冻结数改为 **10**（ADR-006，`IModHost` 保留占位）；`docs/00-最终指令.md` §6 与 `AGENTS.md` 已同步。
- 物理桥上移：`packages/engine/src/bridge/physics.ts` 的 `createPhysicsBridge(physics, {position, box})`，组件由调用方注入，桥不再依赖 demo；`demo.bodySync` 删除。
- 音频端口：`createNullAudio`（默认静音、计数、音量 0..1 夹取），已接进主循环（系统出错时 `play('system-error')`），真实解码/播放仍未做。
- 故障 dump 落盘：`createDumpSink`（环形 20 条、localStorage 持久化、`导出诊断` 下载 JSON），系统错误时自动 record+persist。
- 确定性：门禁新增 `replay` 步骤（`--self-test --repeat 3`，三次全哈希序列比对）。
- 违规演练：`tools/drill.mjs` 制造「core→impl 越界 import」「312 行超预算文件」两种现场，确认门禁都会红；清理在 finally。
- **门禁自身的洞（已修）**：depcruise 用 `--output-type json` 时即使有违规也退出 0，且无参数运行只打印 Usage——之前 `depcruise PASS` 是空转。改为 `tools/checks/depcruise.mjs` 解析 `summary.violations`，解析失败即失败；现在 237 模块 0 违规是真检查出来的。
- UI 层骨架：`apps/game/src/ui/{snapshot.ts,App.tsx,mount.tsx}` + `controls.ts`；React 19 覆盖层替换原生 DOM 按钮，`UiSnapshot` 10Hz 只读推送，意图走 `UiIntents`。实测点击「存档」→ `已存档 @ tick 113 · 隔离 0`，快照行 `tick 390 · 实体 65 · 刚体 65`。
- 依赖归位：React/ReactDOM/Tailwind/Storybook 的声明在 `apps/game/package.json`，`npm install` 在根可复现（清理 pnpm 遗留 junction 后，changed 150 packages, exit 0）；物理位置由 npm 正常提升到根 `node_modules`。
- 门禁：新增 `apps/game/src/ui/**` 不得依赖引擎/控制器的 depcruise 规则；eslint 忽略 `dist-ts/**`。
- Tailwind 已接入（4.3.3，`@tailwindcss/vite`）：`apps/game/vite.config.ts` 注册插件，`src/ui/app.css` 引 `@import "tailwindcss"`，按钮与快照行改用工具类。实测计算样式 `border-radius: 6px`、`bg: oklch(0.216 …)`、`cursor: pointer`、等宽字体——不是「类名写了但没生效」。
- 注意：改 `vite.config.ts` 后**必须重启 dev server**（旧进程不会重载配置），否则页面仍是旧样式。
- 日志端口：`createMemoryLogger`（环形 100、可选 sink），系统出错时先 `logger.error` 再写 dump；`__itb.logs()` 可读。
- 桥的解耦证据：`bridge.contract.test.ts` 用**自定义组件**（`BridgeProbePosition/BridgeProbeBox`）验证同步，不 import demo——桥确实只认注入的组件形状。
- Storybook 已接入并进全量门禁：`storybook 10.6.3 + @storybook/react-vite`（peer 明确支持 `vite ^8`，无需降级）；`npm run storybook`（6006）、`npm run storybook:build`（artifacts/storybook-static）；示例故事 `src/ui/App.stories.tsx` 三个状态。
- 依赖归位完成：react/react-dom/tailwind/storybook 声明已移入 `apps/game/package.json`；清理 pnpm 遗留后 `npm install` 在根可复现（实测 changed 150 packages, exit 0）。
- Onlook 依赖链已查清：仓库 `packageManager: bun@1.3.1`（带 `bun.lock`/`bunfig.toml`），官方本地步骤来自 `docs/content/docs/developers/running-locally.mdx`（`bun install` → `bun backend:start` → `bun run setup:env` → `bun db:push` → `bun db:seed` → `bun dev`）。Docker compose 路线也仍需 Bun。
- Bun 已在本机装好：`npm install -g bun --ignore-scripts=false` → 1.4.3，`where.exe bun` 命中 `%APPDATA%\npm\bun.cmd`；bun.sh 在沙箱内超时，故走 npm 方式。步骤与排错写入 runbook 04。
- Onlook 依赖链继续补齐：`supabase` CLI 已装（npm 全局 2.121.0）；`supabase start` 还需要 Docker Desktop——本机 `docker` 未安装，runbook 04 给了两条路（装 Docker / 用云端 Supabase 跳过 backend:start）。
- `stripe-webhook` 已绕过（日志 `Skipped serving Function`）；随后迁移 `0008_preview-img-storage.sql` 直删 `storage.objects` 被新版 Storage 拒绝（SQLSTATE 42501）。仓库 `bun.lock` 钉 supabase **2.53.6**，本机全局 2.121.0；且 2.53.6 拒绝全局安装、npm 局部安装的 postinstall 下载二进制时 ECONNRESET。完整评估与修法见 `docs/lessons/2026-10-ui-tooling.md`（Onlook 已排除，不再维护安装链）。
- Onlook 与 Figma Dev Mode 均已排除（ADR-009，第二次修订）：设计评审改为 **Storybook 本地唯一路径**。背景：本项目是个人项目，设计协作尚未常态；本轮是为**未来可能的合作**探索工具链，要求本地、免费、可复制。Onlook 自托管链不可复现、桌面版能力未验证；Figma Dev Mode 云端+付费+产物不可直接用。
- 最终 UI 方案：`docs/ui-final-plan.md`；独立落地方案：`docs/runbooks/06-UI工程落地.md`；教训：`docs/lessons/2026-10-ui-tooling.md`；UI 模块说明：`apps/game/src/ui/README.md`。
- 设计评审形态：Storybook 本地画布（`npm run storybook`，6006）+ 静态包（`storybook:build` → `storybook:serve`，7007）；token 唯一事实源 `apps/game/src/ui/tokens.ts` + `设计 token/总览` 故事；操作细节见 runbook 04。
- 引擎教训：`docs/lessons/2026-10-engine.md`（12 条，含哈希空集、子弹反弹、门禁空转、ESM JSON、基准抖动等）。
- 进度对照：`docs/audits/engine-diff-and-progress.md`（46 提交 / 208 文件 / 21 测试文件 / 34 门禁步骤；引擎整体约 82%），刷新方法见 `docs/audits/README.md`。
- 交付型 starter：`starters/ui-storybook-kit/`（可独立复制）——React 19 + Tailwind 4 + Storybook 10；组件已中性化（按钮/状态文字/信息行）共 9 个故事 + 颜色尺寸总览。README 以 Storybook 为**唯一事实源**重写，含 30 秒理解、术语表、四步新增组件、交付方式与 FAQ；四篇 docs 去掉了具体项目假设。已实测复制到仓库外 `npm install` + `build` 均 exit 0。
- 本轮（R4 + M2 + 音效）：**R4 完成**——覆盖率门禁 `coverage`（NODE_V8_COVERAGE + 最内层区间，阈值 70%，实测 81.7%，ADR-013）、physics 多对 contacts / debugShapes 圆形测试、drill 新增 as-any 第三类（3/3 拦截）。**M2 完成**——`ControlBar/Button/StatusText/InfoRow` + 18 个故事（6 组标题）。**音效**——Kenney CC0 六条临时资源，`createWebAudio.sources` 映射，浏览器实测 decoded/started=1，来源见 `apps/game/public/audio/CREDITS.md`。门禁 38 步 PASS。
- R5a/R5b 已完成：`RenderStats` 增 `submitMs/submitAvgMs/submitP95Ms`，HUD 显示 `sub x.xxms`；`?stress=3000` 夹具 + `tools/submit-bench.mjs`（基线 0.432ms，进门禁）；浏览器实测 3001 项 avg 0.95ms / p95 1.4ms（ADR-014）。R5c 合批验证完成：3000 Sprite 1.2ms vs 3000 Particle 0.2ms（约 6 倍，ADR-015）；R6a 完成：drill 扩到 5 类（含删测试/改阈值，全部命中预期）、registry 增测试基线（修复原先空转的契约检查）、门禁增 `engine-standalone`；41 步 PASS（ADR-016）。R6b 完成：`SystemDef.dispose?()` + `Scheduler.dispose()`（逆序、异常不阻断）、HMR 重建前先 dispose；`Scheduler.invalid` + `RunState` 脏局失效停录制（`__itb.valid`），3 个新单测。
黄金样例（2026-10-24）：`world-golden.test.ts` 2 组锁定 World 快照形状与 restore 往返；测试基线 45；ADR-050。引擎包面/starter（2026-10-24）：`packages/engine` files 收紧为 dist/src + README；`package-surface` gate 校验 npm pack 不含 src/tests/tsconfig、必需入口存在；`pack-smoke` 真实 npm pack→解包→独立进程 import createEngine；`starter-smoke` 通过 `@itb/engine` 包入口跑；`删发布入口` drill PASS；ADR-049。属性测试（2026-10-24）：fast-check 4.10.2 安装成功（`--workspaces=false --package-lock=false` 绕 npm Invalid Version），`engine-properties.test.ts` 用 fc.property 6 组 PASS（advance/step/World/CommandBuffer/Scheduler/EventBus）；package-lock 空壳条目已删、fast-check 已入 lock，`npm ci --dry-run` 通过；ADR-048 记录。Phase 1 createEngine（2026-10-24）：新增 `packages/engine/src/engine.ts` 单一门面（world/events/commands/scheduler/clock + step/advance/start/stop/dispose），`engine-facade.test.ts` 3 组 PASS；`capabilities.test.ts` 2 组 PASS；测试基线 43；API surface 快照已更新；应用尚未迁移（ADR-047）。Phase 1 能力一致性（2026-10-24）：新增 `tools/checks/capabilities.mjs`，scene systems 与 contracts/capabilities.json 按 id/phase 双向校验；每个系统补 spec.inputs/outputs/owns；修正 demo.weapon→damage、physics.bodySync→collision（scene 为运行时真值）；`删能力条目`/`删系统Spec` drill PASS；gate step `capabilities`；验收 `docs/audits/phase1-capabilities.md`。阶段0验收（2026-10-24）：`docs/audits/phase0-acceptance.md` 判定 **部分完成**——0.1/0.3 完成，0.2 DSH 每日 prompt 尚未改只读，0.4 收口文档已写；不可宣称阶段 0 全绿。Batch 0.3 完成（2026-10-24）：contracts/harness.json 10 条（10 implemented/0 planned），capabilities 9 系统；harness 校验已入门禁；ARCH-001 system-structure、ARCH-002 hot-path、QUAL-001、SCENE-001、PERF-001、API-001（声明哈希快照）已闭环；itb inspect/impact/check/gate/receipt 与 receipt 生成可用；check --changed 已改为 tools/check-changed.mjs，实测 2.0s；pre-push 已校验 receipt；`itb gate` 在未设 ALLOW_PROTECTED 时正确拒绝保护路径。验收 `docs/audits/phase0-batch-0.3.md`。门禁 fail-open 修复（2026-10-24，用户批准）：G1 gitfacts 改 origin/main + 失败即红 + 跳过当前 HEAD 自证 stamp；G2 findings 解析失败/缺输入/warning 均非零，depcruise JSON 分离到 depcruise.json；G4 drill 三态；全量 PASS 094129Z，负例坏 depcruise JSON 正确变红。G3 已修；G5 文档澄清；G6–G9 待。Batch 0.2 DSH 实测（2026-10-24）：原生 schedule 投递成功，专用会话写出 `engineering/audits/2026-10-24/dsh-review.md`；但会话内 nightly 因沙箱 EPERM 失败，且审计发现 G1/G2 fail-open、G3 警告仍绿等 9 项规则缺口（详见报告）。DSH 口径=专用会话可投递，但非每轮新会话、非 OS 只读。下一步：把每日提醒改为只读消费报告、删除测试 schedule；G1–G4 需批准改 tools/ 后修。Batch 0.2 部分完成（2026-10-24）：deep-audit、每 5 次提交拦截、20:00 计划任务（手动触发 Last Result 0）可用；DSH 原生 schedule 已验证：专用会话 session-4a936cd6 的 20:00 任务与 150s 测试提醒已投递（turn #2），但会话内跑 nightly 受沙箱/子进程限制，尚未写 dsh-review。正确分工=Windows 任务产出报告、DSH 只读消费；旧 prompt 需更新/重建。验收 `docs/audits/phase0-batch-0.2.md`。Batch 0.1 完成（2026-10-24）：本地护栏 pre-push/stamp/main 直推拦截/safe-merge 已落地；`npm run hooks:test` 5 组 PASS，feature push 全量 gate PASS，真实 main 直推（本地 bare remote）被拒，safe-merge 合并并推送 main `ddc95f1`。验收记录 `docs/audits/phase0-batch-0.1.md`；深检阈值逻辑已实现但待 Batch 0.2 产生 deep stamp。阶段0落地计划（2026-10-24）：`docs/proposals/005-phase0-local-quality-implementation.md` —— 本地优先：pre-push/stamp/safe-merge、main 直推拦截、每5次提交深检、20:00 本地夜检+DSH 只读会话、规则表/CLI/Receipt；GitHub CI/公开/npm 后置。经验教训落 `docs/guides/harness-lessons.md`；记忆空间「深入战火引擎质量工程」已建。下一阶段规划（2026-10-24，v1.2）：`docs/proposals/004-engine-ai-quality-next-stage.md` + `docs/guides/quality-primer.md`。已建私有库 `GameKingdomNatives/AI-specific_ECS` 并推送 main（SSH remote；HTTPS 到 github.com 不稳）；GitHub Free 私有库 branch protection 返回 403，待选 Pro/公开/本地+CI 软保护。已确认阶段0、本地私有包、fast-check/api-extractor/publint、每5次提交深检+20:00 DSH 独立会话、GitHub 托管、HARD 原则同意；外部 API 原则“复杂隐于内部，外部简单易懂”写入规划。P1 录制 configHash 已加（ADR-041）：Recording/Recorder 支持可选 configHash，serialize/deserialize 往返；应用 `configHashFor(scene)` 按 scene 名/资源/系统/节点结构生成 FNV 短哈希，整重建与轻量应用都传入。压缩仍未做。下一步：录制体积测量/压缩、dump diagnostics/、逐系统契约测试。P1 超预算告警已加（ADR-040）：`findBudgetBreach` 按每系统 p95（默认 2ms）判定，updateHud 每 60 tick 写 logger+dump；`?budget=` 可覆盖。浏览器：`?budget=0.001` 下 err/诊断增长到 11；清 localStorage 后正常阈值 790 tick 仍 err 0。下一步：录制压缩/configHash、dump diagnostics/、逐系统契约测试。P1 UI store 已改 useSyncExternalStore（ADR-039）：`UiRoot` 订阅 store，mountUi 只 render 一次；浏览器 tick 700→1810 更新，点清除显示「已清除存档 · 隔离 0」后 HUD 继续。审计 §22 转 ✅。下一步：录制压缩/configHash、超预算告警、dump 落盘、逐系统契约测试。P1 文档配套（2026-10-22）：补 `docs/systems/` 9 张系统卡与 `docs/runbooks/07-如何新增系统.md`；quality-log 更新到 v0.10.0（40 测试/181 用例/4 契约/60 源文件）；EditorPanel 拆成纯展示 + `EditorPanelLive`，Storybook 增加「完整编辑器面板」story。下一步：UI store 改 `useSyncExternalStore` 或 P1 其余偏差裁定。P0-4 组件级轻量应用已做（ADR-038）：Position/Box 改值原地写列，不换世界、不重置 kills；结构/系统/BoxSpawner 变更仍整重建；Recorder 在轻量应用后重置。浏览器：target X→1500 时 tick 780→2210、entities 不变、spawned=64；spawner count→10 整重建 spawned=10。下一步 P1 文档配套/契约增强。P0-3 多 scene 文件已修（ADR-037）：`?scene=` 解析、`/__scene/list`、watcher 事件带文件名、编辑器下拉打开/另存为；保存按当前文件。浏览器：另存 test.scene.json 同页加载，test count 8 保存后 demo 仍 64，切回 demo 恢复 64，测试文件已删。下一步 P0-4 轻量应用/冻结模拟。P0-2 系统参数 schema 已修（ADR-036）：引擎 ParamField/SystemMeta + validateSystemParams/coerceParamValue（3 组单测）；应用登记 demo.player/demo.weapon，调度页渲染 schema 字段；编辑器与 applySceneDocument 共用校验；createSystems 消费 player.speed/weapon.cooldownTicks/speed。浏览器：999 被拒（超出 1..120）、冷却改 10 保存进文件。测试基线 40。下一步 P0-3 多 scene 文件。P0-1 同 tick 竞态已修（ADR-035）：编辑器改用 `doc/selectedRef` 同步写，动作与 `SaveButton getScene()` 都读最新引用；浏览器同一 eval 删除 target+保存后文件/运行时均 3 节点、树 3。下一步 P0-2 系统参数 schema。源码审计（2026-10-22）：`docs/audits/engine-spec-audit-2026-10-22.md` 对照 §1–§22 给出能力矩阵与 P0/P1/P2 偏离：核心机制齐全；P0 为同 tick 编辑竞态、系统参数 schema、多 scene 文件、预览整世界重建；P1 含渲染表非 SoA/缺 anchor-frame、事件无类型映射、录制无压缩/configHash、dump 未落 diagnostics/、无超预算告警、逐系统契约测试、UI 未用 useSyncExternalStore、缺系统卡/新增指南、quality-log 过期；P2 为资产管理缺口与编辑器体验。同步修复见 ADR-034。新目标（goal-b1f1…）继续按优先级修正。同步修复（ADR-034）：保存成功后直接调用 `__itbApplyScene(scene)`，不再依赖 watcher；`lastAppliedScene` JSON 去重；编辑器新增「实时」开关（300ms 防抖预览）与「应用」按钮。浏览器验证：实时开启 count 64→10 未保存即生效；实时关闭 10→20 保存后文件与运行时均 20、marker 存活；恢复文件回到 64。全量门禁 PASS。下一步：从 git 源码审计引擎实际能力与《00-最终指令》偏差并修正其余偏离。新目标（2026-10-22）：节点-场景式资源与调度编辑（scene JSON 唯一数据源 + 内置浏览器编辑器 + Vite 写盘）。D5 完成（收口）：验收矩阵 `docs/audits/scene-editor-acceptance.md` 更新为 15 项（S0–S5b + D1–D4），全部有单测/浏览器/门禁证据；接受偏离已记录（spawner 实体无节点、原地重建=重开一局、系统参数无 schema、Storybook 仅展示部件、同 tick 连点）。**目标收口**。D4 完成（ADR-033）：引擎 scene/meta（ComponentMeta/defaultsFor/coerceFieldValue + 3 组单测）；应用 component-meta 登记 Position/Box/BoxSpawner，检查器与新增组件由元数据渲染；删除 component-kinds；editor.stories 展示 4 个纯展示部件，Storybook glob 扩展并纳入全量门禁。浏览器：检查器显示「位置·X/Y」「方块·尺寸/颜色」「环境生成器·数量/…」。下一步 D5 验收矩阵收口。D3 完成（ADR-032）：`rebuild(scene)` 原地重建世界/调度器/物理/recorder，renderer 与编辑器保持；watcher 改发 `itb:scene-changed`，客户端解析后 apply；ControlsDeps 改 getter；render-table 抽出。浏览器：删除 player 保存后 marker 存活、编辑器不关闭、nodes 3/player null；恢复文件同页 player 恢复。下一步 D4 元数据表单 + Storybook。D2 完成（ADR-031）：demo 新增 `BoxSpawner` 组件 + `scene.spawner` 系统（首 tick CommandBuffer 生成、count 夹取、onSpawn 上报）；示例 scene 4 节点/9 系统，`spawned={"spawner":64}`、entities 68；删除 spawner 节点保存后 entities 3、ambient 全消失；scene 可用时不再走 spawnSpec（内容 JSON 仅降级）。下一步 D3 原地重建。D0/D1 完成（ADR-030）：数据驱动运行时计划（D0–D5）；作者节点 1:1 实体映射暴露到 `__itbScene.entities`、场景树显示 `E<id>`；player 缺失不再静默重建（HUD `player missing`、相关系统以 -1 安全跳过），仅 scene 不可用时走旧补建。浏览器验证删除 player→保存→重载 nodes=2/player=null/entities 66，恢复后 player ok。下一步 D2 scene spawner（ambient 箱子迁入 scene）。新目标（goal-f0aa…）已立项。S5b 完成（ADR-029）：运行时读 scene（`loadSceneRuntime` 实例化、`pickSystems` 按 scene.systems 重排、玩家/贴图走 scene）；scene 缺失/非法时 HUD `scene fallback` 且游戏可玩；Vite watcher 监听 scenes/*.scene.json 触发整页重载。验收矩阵 `docs/audits/scene-editor-acceptance.md` 10 项全有证据（初始 3 节点/8 系统、保存→重载 4 节点、降级 65 实体、热重载 marker 清除）。**目标收口**。S5a 完成（ADR-028）：Vite 插件 `POST /__scene/save`（1MB、文件名/路径守卫、parseScene、tmp+rename 原子写）；SaveButton 保存后从磁盘重载。API：合法 200 / 越界 400 / 非法 schema 400；浏览器：加节点→保存→文件 3→4、面板「已保存」并重载为 4。S5b 待做：应用运行时读 scene 实例化 + buildSchedule 重建世界，最后出验收矩阵。S4 完成（ADR-027）：调度编辑器（阶段分组泳道/系统卡片/新增/删除/phase/enabled/after/params），引擎 `schedule-edit.ts` 纯函数 + parse 复验；浏览器验证 5→6 系统、after=demo.player、禁用标记。下一步 S5 Vite 保存闭环。S3 完成（ADR-026）：`?editor=1` 场景编辑器面板（场景树/检查器/资源浏览器），读 `apps/game/scenes/demo.scene.json`，编辑走 `scene/edit.ts` 纯函数并每次 parse 复验；浏览器验证 +子节点/重命名/+Position/贴图标记；保存留 S5。下一步 S4 调度图。S2 完成（ADR-025）：`buildSchedule` 把 scene 系统清单转成 `SystemDef[]`（phase 覆盖、after 合并、enabled=false 跳过、params 透传）；未注册/改名/after 环进 issues；构造结果直接交给 Scheduler 执行已单测。下一步 S3 编辑器面板。S1 完成（ADR-024 补充）：`instantiateScene` 节点→实体、组件写入、SceneParent 父子、assets 别名→manifest 资源名；未知组件/字段、字符串、缺失别名进 issues 不中断；3 组单测。下一步 S2 调度数据化。S0 完成（ADR-024）：`packages/engine/src/scene` zod schema/`parseScene`（重复 id、父缺失、父子环、phase、after 引用、非有限数字）+ 5 组单测 + `./scene` 子路径；计划见 `docs/audits/scene-editor-plan.md`。下一步 S1 运行时实例化。B5 完成（ADR-023）：`bridge/contacts.ts` 接触 enter/exit 延迟事件（每 tick 上限 64、溢出计数、stats），真实 PhysicsWorld 单测覆盖进入/离开/上限；浏览器 8 系统（含 `physics.contacts`）无错。**parity 收口**：`docs/audits/engine-parity-matrix-2026-10-22.md` 结论 PG-01…PG-11 全部实现，剩余仅已接受偏离/门槛暂缓项。B4 完成（ADR-022）：manifest zod 校验（版本/尺寸/重复名）+ 应用 `loadTextureUrls` 走清单（浏览器 manifest 200、3 资源），失败回退；`World.schemaFingerprint()` + HMR `createSchemaGuard` 变化即打印原因并整页 reload。B3 完成（ADR-021）：逐系统耗时（`system-stats` + `TimingBook` + `Scheduler.systemTimings()`，实测 7 系统 count 60、bodySync avg≈0.16ms）与 debug 命令集（line/circle/rect + 颜色，夹具圆环+十字，截图确认）。R5c 合批已默认开启（真实场景验收：合批/非合批都能射击命中，画面无缺失；?batch=0 回退）。差距复核（2026-10-22）：见 docs/audits/gap-review-2026-10-22.md；主干能力已齐，剩余 P1：文本渲染、相机抖动、接触事件化、schema 降级、invalid 入档、图集（门槛未到）、GPU 读数。B2 完成（ADR-019/020）：相机抖动（`shakeOffset` + `PixiRenderer.shake`，命中触发，浏览器逐帧读数确认衰减）、渲染插值（`interpolate.ts` + `FixedClock.alpha` + `capturePoses`）与文本渲染（`RenderItem.text/font/fontSize`，HARD，port-contract 已更新；OCR 验证 KILLS 0→29）。
B1 完成（ADR-018）：写入守卫（?guard=1）、Recording.invalid + replay 拒收、事件 seq 入档与比对、§6 端口表修正；测试 + 全量门禁 PASS。
新目标（2026-10-22 设定）：按 docs/audits/engine-parity-plan.md 收口 PG-01…PG-11（写入守卫/invalid 入档/事件序号/文本/抖动/插值/逐系统计时/debug 命令集/manifest/schema 指纹/接触事件），最终 parity 矩阵只留已接受偏离与门槛暂缓项。R7a debugView 完成：SystemDef.debugDraw + collectDebug + ?debug=1/F3，玩家十字可见（ADR-017）。合批实测 3000 项 avg 0.49ms / p95 0.80ms（未合批 1.16/1.80，batched=3001）。
- **下一步方案（2026-10-22 判定）**：见 `docs/audits/next-direction-r5.md`。P0 先修文档漂移（00 §22 Onlook、capabilities 旧说法）；随后 R5 渲染收尾（submitMs + 3000 项提交基准 + 合批决策）、R6 验收补齐（删测试/改阈值演练、engine 独立构建、HMR dispose、脏局 invalid）。待人裁定：`clear/ontology/` 外来目录去留。

## 当前缺口（2026-10-21 核对）

- `IAudio`：只有静音占位，无解码/播放后端。
- `IModHost`：只有形状，无加载器（按规格本轮不实现）。
- 渲染：无批处理/剔除/图集，渲染侧性能未度量。
- 门禁：无覆盖率阈值；违规演练只覆盖 import 越界与文件预算两类。
- UI：Storybook/Tailwind/starter 已接；主应用控制条尚未拆细，状态故事不全。

## 待人裁定

- 是否开始 M2：把主应用控制条拆成 `ControlBar`/`StatusText`/`InfoRow`，与 starter 命名对齐。
- 是否引入 `@storybook/addon-a11y`（可访问性面板）与 `@storybook/test`（交互测试）。
- 是否恢复 pnpm（若你会话在沙箱外跑），见 ADR-001；不影响源码结构。

## 已定决策

- UI 层：React + Tailwind 的 DOM 覆盖层；战场留在 Pixi canvas（ADR-002）。
- 可视化编辑：Onlook 与 Figma Dev Mode 均排除；评审用 Storybook 本地静态包（ADR-009）。
- 排障诊断：必须给到 文件:行:列 + 规则 + 代码片段 + 规则定义位置（`findings.json`，面板「诊断明细」卡）。
- 工具链：Vite 8 可用（rolldown，无子进程）；vitest 不可用（esbuild 子进程）——ADR-001。

## 常用命令

```bash
node tools/status.mjs                     # 状态
node tools/gate.mjs                       # 全量门禁（含 tsc/eslint/测试/边界/构建）
node tools/gate.mjs --fast                # 快速门禁
node tools/panel/collect.mjs              # 刷新面板数据
npm run dev                               # 应用开发服务器（http://localhost:5173）
npm run preview                           # 预览构建产物（http://localhost:4173）
node tools/review.mjs accept --note "<理由>"
```

## 会话级注意事项

- 沙箱内 `git commit` 会因 sh 无法启动而失败：用 `git commit --no-verify`，随后手动 `node tools/gate.mjs` 补跑；正常终端无需此操作。
- 首次提交属脚手架，需 `ALLOW_PROTECTED=1` 才能过保护路径检查。
- 本机禁管道子进程：任何新脚本都不要用 `execSync` 捕获输出，改用 `spawnSync` + 文件描述符重定向。
