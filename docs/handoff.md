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
- 依赖现状（ADR-008）：React/ReactDOM 暂装仓库根（npm 工作区识别报 `no workspace folder present`，清理 pnpm 遗留 junction 后仍复现）；Tailwind、Storybook、Onlook 未接。
- 门禁：新增 `apps/game/src/ui/**` 不得依赖引擎/控制器的 depcruise 规则；eslint 忽略 `dist-ts/**`。
- 下一步：Tailwind 引入（依赖恢复后迁回 apps/game）→ Storybook 组件画布 → Onlook 自托管（用户终端）。

## 第三批剩余

- 输入快照接入 60Hz 时钟（`IInput` 实现 + 每 tick 采样，录制器接入主循环）。
- 无头回放运行器：`node tools/replay.mjs <录制文件>`，逐 tick 比对哈希并输出首个偏离点。
- 热重载：系统模块 HMR 边界、`dispose/init` 契约、单系统熔断、诊断 dump。
- 系统探针页：`?probe=<system>`，只跑该系统 + 最小世界。
- 性能基准：3000 实体场景与逻辑帧 ≤ 4ms 的读数进入 quality-log。

## 待人裁定

- 是否恢复 pnpm（若你会话在沙箱外跑），见 ADR-001；不影响源码结构。
- Onlook 自托管的具体启动方式与 Storybook 版本，接入时再定（ADR-002）。

## 已定决策（2026-10-20）

- UI 层：React + Tailwind 的 DOM 覆盖层；战场留在 Pixi canvas（ADR-002）。
- 可视化编辑：Onlook 自托管开源版，第二批之后接入；引入 Storybook。
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
