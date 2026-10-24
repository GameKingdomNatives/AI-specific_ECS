# 引擎下一阶段规划：让 AI 产出自动合法化，同时保持引擎独立

- 版本：v1.0（规划稿，2026-10-24）
- 基线：HEAD `d198e38`（main），上次全量门禁 PASS（`20261022T125426Z`，58 个检查步骤）
- 性质：规划，不改引擎代码；先审计、后设计、再排期
- 关联：`docs/audits/engine-spec-audit-2026-10-22.md`、`docs/audits/scene-editor-acceptance.md`、ADR 034–041

## 0. 结论摘要

现有引擎已经具备“能跑、能回放、能编辑、有门禁”的基础，但距离“AI 产出自动合法化”还差三件事：

1. **行为验证不够硬**：覆盖率 84.7%，但主要靠作者/测试生成；没有变异测试（Mutation Testing，变异测试）、属性测试（Property-Based Testing，属性测试）和经批准的黄金夹具（Approved Fixtures，黄金夹具）；契约测试只有 4 个文件。高覆盖率不等于高断言质量。
2. **规则没有形成“指南—传感器—反例测试”的闭环**：门禁有 58 个检查，但并非每条规则都有“负例演练”；AI 不知道改动的完整影响面，也无法在写代码前查询能力/契约。
3. **引擎还不是一个可独立消费的产品**：`@itb/engine` 仍是 `private`，根导出只有 core/ports，`demo` 夹具在引擎包内，缺少 README/许可证/API 报告/`npm pack` 冒烟/最小嵌入 starter。

下一阶段的目标不是“再加几个检查”，而是建立一套 **Harness（约束系统）**：

> 每一次 AI 改动，在写之前拿到“允许改什么”的前馈指南（Feedforward Guides），写之后经过可解释的计算型传感器（Computational Sensors）和少量推理型传感器（Inferential Sensors），产出一份可验证的回执（Receipt）；只有回执为绿、且不触碰 HARD 契约，才算“自动合法”。

这借鉴了 Birgitta Böckeler 的 Harness Engineering 框架（来源：<https://martinfowler.com/articles/harness-engineering.html>）：前馈与反馈必须成对，计算型检查负责确定性结构，推理型检查只补充语义；人类负责“转向”（steering）规则本身，而不是逐行审 AI 代码。

## 1. 审计：引擎真实能力（基线 `d198e38`）

### 1.1 代码与测试规模（实测）

| 指标 | 当前值 | 说明 |
|---|---|---|
| 引擎源码 | 61 个 TS 文件 / 4,916 行 | `packages/engine/src` |
| 应用源码 | 50 个 TS/TSX 文件 / 2,452 行 | `apps/game/src` |
| 测试文件 | 41 个 | `packages/engine/tests/*.test.ts` |
| 测试声明 | 184 个 `test(...)` | 按源码计数；quality-log 记为 185，后续统一 |
| 引擎行覆盖率 | 84.7%（2,892/3,416 可执行行） | 阈值 70%，来自 `coverage.log` |
| 覆盖率最低文件 | `impl/overlap.ts` 20.9%；`demo/index.ts` 45.5%；`scene/meta.ts` 71.4% | 需要行为测试而非补行数 |
| 契约测试 | 4 个文件 | bridge/demo/hit/weapon；未覆盖全部 9 个系统 |
| 全量门禁 | 58 个检查步骤 PASS | 含 tsc、eslint、depcruise、registry、41 个测试文件、coverage、replay、bench、storybook、drill 等 |
| 技术夹具基准 | 0.688 ms/tick（3000 实体） | `tools/bench-baseline.json` |

### 1.2 已具备的硬能力

- **ECS 内核**：32 位代际实体、SparseSet + SoA、7 阶段调度、命令缓冲、读写声明、冲突校验、失败熔断、系统耗时环形统计。
- **10 个冻结端口**：IRenderer/IInput/IAudio/IPhysics/IEventBus/IClock/IRandom/ILogger/IStorage/IModHost，哈希门禁。
- **适配器**：Pixi 渲染、自研物理（圆/AABB/胶囊/凸多边形 SAT、射线/扫掠/锥）、WebAudio/Pixi Sound、localStorage、诊断/日志。
- **确定性**：60Hz 固定步长、暂停/单步/变速、命名 RNG、世界哈希、录制/回放、invalid 规则、configHash（ADR-041）。
- **数据驱动**：scene zod schema、实例化、调度构建、编辑原语、元数据表单、保存/预览/多 scene/轻量应用（ADR-034–038）。
- **工程护栏**：tsc 严格、ESLint、dependency-cruiser、注册表预算、覆盖率、replay、bench、Storybook、违规演练（5 类）。
- **文档**：规范、ADR、验收矩阵、9 张系统卡、新增系统 runbook、quality-log。

### 1.3 关键缺口（按对“AI 自动合法化”的威胁排序）

| # | 缺口 | 现状证据 | 后果 |
|---|---|---|---|
| G1 | 行为验证依赖作者/生成的测试 | 无变异测试、无属性测试、无黄金场景；契约测试仅 4 个 | 测试全绿仍可能没断言到关键不变量 |
| G2 | 规则没有全覆盖的负例演练 | drill 只覆盖 5 类；并非每条自定义检查都有“故意违规”测试 | 检查可能失效而无人发现 |
| G3 | 没有影响分析与分级执行 | 门禁全量或 `--fast`，AI 不知道改动影响哪些测试/规则 | 反馈慢、AI 倾向跳过检查 |
| G4 | 契约/能力不可查询 | 能力在 `docs/capabilities.md` 散文；无机器可读 registry | AI 重复实现、越界改公共面 |
| G5 | 系统级架构规则弱 | 读写声明有，但结构变更靠约定；写作用域守卫默认关；无“系统内禁止 spawn/despawn”检查 | AI 可绕命令缓冲 |
| G6 | 引擎独立性不足 | `@itb/engine` private；根导出仅 core/ports；`demo` 在引擎内；无 README/LICENSE/API 报告/pack 冒烟 | 其他项目难以只消费引擎 |
| G7 | 发布/API 兼容无门禁 | 只有端口哈希；无 `.d.ts` diff、无 pack/install 测试 | AI 改导出形状不易被发现 |
| G8 | 性能预算只在运行时告警 | ADR-040 每系统 p95 告警；bench 是全量夹具 | AI 引入慢系统可能过门禁 |
| G9 | 依赖/供应链检查缺失 | 无 `npm audit`、license、重复依赖检查 | 依赖面风险不可见 |
| G10 | 浏览器行为不可自动复现 | 编辑器验收多为浏览器手测；无 headless 场景动作/golden | UI/编辑行为回归依赖人 |
| G11 | HARD 例外可被环境绕过 | `ALLOW_PROTECTED=1`、本地 `--no-verify`；无 origin | 本地可产生未盖章提交 |
| G12 | 文档与代码耦合弱 | 系统卡/规范是 Markdown，无生成关系 | 文档漂移无法被门禁发现 |

> 说明：G1/G2/G3 与 Martin Fowler Harness 文章指出的“行为验证是房间里的大象”“AI 生成测试验证 AI 代码 = 同一双眼睛检查作业”一致；这不是本仓库独有，而是下一阶段最值得投入的部分。

## 2. 指导原则（从研究文档与实践中提炼）

1. **自举，而不是一次到位**（来源：`研究文档-副本/AI介入下的小团队开发可维护性解决方案/AI友好开发架构自举构建流.md`）：执法器先于守法者；元层（`tools/`、门禁、CLI）不追求被执法层的架构合规；每阶段只加 1–2 条可自动检查的规则。
2. **规范以禁止为主**：早期只强制可自动检查的禁止项（禁止直接 spawn、禁止跨层 import、禁止未登记契约），不写无法验证的“推荐”。
3. **契约测试是种子**：每个系统/端口先有契约测试，再有实现；契约变更走 HARD。
4. **唯一路径**（来源：`研究文档-副本/.../AI开发流程优化方案.md`）：系统只能经命令缓冲做结构变更，跨系统只走事件/命令，AI 没有第二种写法。
5. **能力注册表**：AI 实现前先查已有能力，避免重复造轮子；注册表必须可执行、可查询，不能只是散文。
6. **模型权威 + 工具原生**（来源：`研究文档-副本/JS技术/AI友好型JS游戏引擎Estella简述.md`）：场景 JSON 是 Source of Truth，运行时 World 是有损投影；编辑器/引擎应暴露 MCP（Model Context Protocol，模型上下文协议）工具，让 AI 能查询、校验、干跑，而不是只能改文件。
7. **前馈与反馈成对**（来源：Martin Fowler Harness Engineering）：每条指南配一个传感器；每个传感器配一个负例测试；人类只维护这套 Harness 和 HARD 决策。

## 3. 目标架构：四层 + 两个面

### 3.1 分层

```text
┌─────────────────────────────────────────────────────┐
│ AI / 人：CLI + MCP + 编辑器（薄层）                   │
├─────────────────────────────────────────────────────┤
│ 工具面：@itb/devtools（gate/CLI/MCP/impact/receipt） │
├─────────────────────────────────────────────────────┤
│ 内容面：@itb/fixture（demo 场景/技术夹具）            │
├─────────────────────────────────────────────────────┤
│ 适配器：@itb/engine-pixi / physics / storage / audio │
├─────────────────────────────────────────────────────┤
│ 契约：@itb/contracts（端口/事件/场景/能力 JSON）      │
├─────────────────────────────────────────────────────┤
│ 内核：@itb/engine（ECS/调度/命令/确定性，零应用依赖） │
└─────────────────────────────────────────────────────┘
```

原则：

- **内核零依赖**：`@itb/engine` 不依赖 Pixi/zod/React；适配器通过端口注入。
- **契约唯一事实源**：端口、事件映射、场景 schema、能力注册表都在 `@itb/contracts`（可由 zod/JSON Schema 生成 TS 类型与文档）。
- **夹具独立**：`demo` 系统和场景移到 `@itb/fixture`，引擎包不再包含技术夹具；`apps/game` 只做集成。
- **工具面独立**：`tools/`/devtools 是元层，允许粗糙，但必须能执法；不被引擎运行时依赖。
- **应用不反向污染引擎**：`__itbScene`/`__itbApplyScene` 等调试全局留在应用/devtools，引擎只暴露稳定 API。

### 3.2 引擎独立消费面

- `@itb/engine`：只导出稳定内核 API；`exports` 完整、`files` 白名单、`sideEffects:false`、`peerDependencies` 仅适配器需要。
- `@itb/engine-pixi` 等适配器：可选安装；不装 Pixi 也能跑 headless。
- `starters/engine-headless`、`starters/engine-pixi`：最小可运行示例；CI 里 `npm pack` 后安装到 starter 跑通。
- `README.md` + `LICENSE`（许可证待用户裁定）+ `CHANGELOG.md` + `docs/embedding.md`（如何嵌入其他项目）。
- API 稳定性：`api-extractor` 报告 `.d.ts` 差异；semver 策略；端口哈希之外增加公共 API 哈希。
- 场景 schema 版本迁移：`schemaVersion` + 迁移函数 + 旧版本夹具测试。

## 4. “AI 产出自动合法化”的判定标准（Definition of Legal）

一次改动只有同时满足以下 8 条，才可自动合入（AUTO）：

1. **有归属**：对应一个已登记的 Spec/能力 ID；或明确标注为内部重构且不改公共面。
2. **不越界**：未修改冻结端口/公共 API/场景 schema/门禁阈值/保护路径；涉及则必须 HARD 审批。
3. **唯一路径**：系统内结构变更走 `CommandBuffer`；跨系统只走事件/命令；读写声明与所有权一致。
4. **快速传感器绿**：受影响测试、类型检查、Lint、依赖边界、架构规则、预算检查通过（目标 ≤20 秒）。
5. **行为证据**：变更行为有契约/属性/黄金测试；核心模块有变异测试抽检；不靠“覆盖率数字”自证。
6. **全量回执绿**：干净工作区全量门禁 PASS；回执含 tree hash、变更文件、命中规则、测试/变异/属性/性能结果。
7. **可复现**：回执可重跑；失败能定位到规则/测试；没有跳过测试或未命名豁免。
8. **人类只审 HARD**：Spec/契约/权限变更由人审批；AUTO 改动不进入人工逐行 Review。

> 关键：**Receipt 是交付物**，不是“我跑过门禁”的口头声明。没有 receipt 的改动视为未交付。

## 5. 目标质控架构：Harness 规则表 + 两级门禁 + 回执

### 5.1 规则表（machine-readable）

新增 `contracts/harness.json`（或 `harness/rules.json`），每条规则必须有：

```json
{
  "id": "ARCH-001",
  "title": "系统不得直接 spawn/despawn",
  "guide": "docs/guides/systems.md#commands",
  "sensor": "tools/checks/system-structure.mjs",
  "negativeTest": "tools/drill/cases/ARCH-001.mjs",
  "severity": "error",
  "approval": "AUTO",
  "scope": ["packages/engine/src/**"]
}
```

门禁检查：

- 每条规则都有 guide/sensor/negativeTest；缺一即失败。
- 每个 sensor 至少有一个“故意违规”反例，且反例必须让 sensor 变红。
- 统计 **Harness 覆盖率** = 已闭环规则数 / 总规则数；目标 100%。

### 5.2 两级门禁 + 夜间深检

| 级别 | 触发 | 内容 | 目标时间 |
|---|---|---|---|
| `check --changed` | AI 每次编辑/提交前 | 受影响文件 → 受影响测试/规则；类型、Lint、边界、契约、属性冒烟 | ≤20s |
| `gate` | 提交/交付 | 全量 58+ 检查、coverage、replay、bench、storybook、drill、receipt | ≤10min |
| `audit --deep` | 夜间/批次 | 变异测试、全量属性测试、黄金场景、视觉回归、API diff、`npm pack` 安装、依赖审计 | 可较长 |

### 5.3 影响分析

- 用 TypeScript 编译器 API/现有依赖图建立“文件/符号 → 测试/规则”映射；不依赖子进程。
- `itb impact --changed` 输出：受影响生产文件、测试、规则、建议门禁级别、预计耗时。
- 目标：受影响测试召回率 ≥90%，误报可接受；未命中时降级全量并记录。

### 5.4 回执格式（草案）

```json
{
  "version": 1,
  "treeHash": "...",
  "base": "d198e38",
  "changed": ["packages/engine/src/core/world.ts"],
  "rules": [{ "id": "ARCH-001", "status": "pass" }],
  "tests": { "selected": 12, "passed": 12, "coverage": 0.851 },
  "mutation": { "score": 0.63, "scope": "core" },
  "bench": { "msPerTick": 0.69, "limit": 4 },
  "verdict": "pass",
  "approvals": [],
  "generatedAt": "..."
}
```

写入 `artifacts/receipts/<tree>.json`，并在提交信息/PR 中引用；无 receipt 不允许 AUTO 合入。

## 6. 传感器清单：现有 → 新增

### 6.1 保留并强化的现有传感器

- `tsc -b`：严格档；新增公共 API `.d.ts` 哈希。
- ESLint：新增自定义规则（系统结构、热路径、所有权）。
- dependency-cruiser：分层 + 包边界；新增“引擎 core 零第三方依赖”。
- registry：文件/函数/复杂度预算；测试基线；端口哈希；新增能力/规则登记。
- coverage：全局 70% 下限；新增 `core ≥95%`、关键模块分支覆盖。
- replay：自回放 + configHash 校验；新增跨 seed/属性回放。
- bench：3000 实体 ≤4ms；新增每系统 p95 阈值写入规则。
- Storybook/build：UI 与打包；新增 `npm pack` 与 starter 安装冒烟。
- drill：扩为“每条规则一个负例”的规则级演练。

### 6.2 新增传感器

| 传感器 | 目的 | 实现建议 | 频率 |
|---|---|---|---|
| 变异测试 | 测试是否真的能发现错误 | 自研轻量变异器（TypeScript AST，进程内跑纯函数/选测）+ 逐模块阈值；避开沙箱禁止的管道子进程 | 夜间/批次（核心模块） |
| 属性测试 | 不变量而非样例 | `fast-check`（纯 JS，无子进程）生成实体/命令/场景；断言 ECS/命令顺序/物理对称/回放一致 | 快速门禁冒烟 + 夜间全量 |
| 黄金场景 | 场景/编辑行为可比较 | 固定 scene JSON + 操作序列 + 期望 hash/快照；headless 运行 | 每次相关改动 |
| 架构规则测试 | 结构约束可执行 | 自定义 ESLint/AST 检查：系统内禁止 spawn/despawn、热路径禁事件、读写声明匹配 | 每次 |
| API 兼容 | 导出形状不漂移 | `api-extractor`/`.d.ts` 规范化 diff；`publint`、`npm pack` 安装到 starter | 全量/夜间 |
| 性能预算 | 每系统不退化 | `systemTimings` p95 写入规则；bench 对比基线；ADR-040 告警接入门禁报告 | 全量 |
| 依赖/许可证 | 供应链可见 | `npm audit --omit=dev`（离线数据库）、license 清单；网络不可用时明确失败而非跳过 | 夜间 |
| 视觉回归（可选） | UI/渲染不漂移 | 截图对比；先只覆盖 Storybook 关键 story，避免浏览器依赖阻塞快速门禁 | 夜间 |
| 文档一致性 | 文档不漂移 | 从契约/规则生成能力表/系统卡索引；检查生成物与提交一致 | 全量 |

> 实现约束：本机沙箱禁止管道子进程（Node `spawn` EPERM），因此优先**进程内 Node API**、纯 JS 库、TypeScript Compiler API；变异测试/视觉工具若必须子进程，放到允许的 CI/夜间路径，并保留“不可用即失败”而不是静默跳过。

## 7. 引擎独立化路线（分阶段，不一次拆完）

### 阶段 A：可发布的最小内核（不破坏现有路径）

- 保持 `packages/engine` 单包，但：
  - 根 `index.ts` 增加稳定的 `contracts` 导出（scene schema 类型、事件映射、能力类型）；
  - 把 `demo` 移到 `packages/fixture`（或 `apps/game/src/fixture`），引擎不再含技术夹具；
  - 补 `README.md`、`LICENSE`（待定）、`CHANGELOG.md`、`docs/embedding.md`；
  - `package.json` 增加 `files`、`sideEffects`、`engines`、`peerDependencies`（Pixi 只在适配器）；
  - `npm pack --dry-run` + 安装到 `starters/engine-headless` 冒烟纳入全量。
- 风险：移动 `demo` 会改 import 路径（SOFT），需要一次性 codemod + 全量门禁。

### 阶段 B：可选适配器包

- `@itb/engine-pixi`（Pixi 渲染适配器）、`@itb/engine-physics`（自研物理）、`@itb/engine-storage` 等按需拆；内核只依赖 ports。
- 每个适配器有独立契约测试 + pack 冒烟；应用按需安装。
- 不追求微服务/多仓库；保持 monorepo、模块化单体的“包级边界”。

### 阶段 C：嵌入式 starter 与文档

- `starters/engine-headless`：无渲染、跑固定步长 + scene + replay 的最小示例。
- `starters/engine-pixi`：渲染 + 输入 + 场景的最小示例。
- `docs/embedding.md`：初始化、端口注入、scene 加载、销毁、版本兼容。
- 许可证与发布范围由用户裁定后，再决定是否 `private:false` 与 npm scope。

## 8. 路线图（建议按阶段执行）

### 阶段 0：基线、规则表、回执（约 1 周）

- 固化本审计指标；建 `contracts/harness.json` 规则清单（先 10–15 条）。
- 实现 `tools/itb.mjs` CLI 骨架：`inspect`、`impact --changed`、`check --changed`、`gate`、`receipt`。
- 每个现有自定义检查补一个负例（从 drill 5 个扩到规则级）。
- 产出：`gate` 写 receipt；快速门禁 ≤20s；全量仍是 58 步。
- 退出标准：任一改动能生成 receipt；10 条规则有 guide+sensor+negative test；无行为改动。

### 阶段 1：契约/能力/行为传感器（约 2–3 周）

- `@itb/contracts` 初版：端口类型、事件映射（typed EventMap）、scene schema、能力 registry JSON。
- 9 个系统 Spec（输入/输出/不变量/所有权/测试 ID）；补足每系统契约测试；失败/边界用例。
- 属性测试：ECS/命令/回放/场景 schema 四组；接入快速门禁冒烟。
- 黄金场景：demo + 编辑器操作序列的 headless 断言。
- 退出标准：9/9 系统有 Spec+契约测试；属性测试 4 组；规则闭环 30+ 条；快速门禁不变慢。

### 阶段 2：引擎独立化（约 2–3 周）

- `demo` 外迁；引擎根 API 收紧；README/LICENSE/CHANGELOG；`npm pack` + headless starter 冒烟。
- API 报告（`.d.ts` diff）、公共 API 哈希、pack 安装测试。
- 适配器包拆分 PoC（先 Pixi/physics 二者之一）。
- 退出标准：`npm pack` 产物在空目录可安装并跑通 starter；引擎无 `apps`/fixture 依赖；包体/导出清单审核通过。

### 阶段 3：深检与行为门禁（约 3–4 周）

- 变异测试（核心模块，夜间）；属性测试全量；黄金/视觉（可选）。
- 性能预算表：每系统 p95 阈值 + bench 回归；依赖/许可证检查。
- Harness 覆盖率指标：规则闭环/负例覆盖；门禁自检报告。
- 退出标准：core 变异分数 ≥60%；属性测试全绿；性能/许可证检查可重复；Harness 覆盖率 ≥90%。

### 阶段 4：AI 原生闭环（约 4–6 周）

- MCP（Model Context Protocol）服务器：`capabilities`、`spec_get`、`impact`、`scene_validate`、`headless_run`、`replay`、`gate_status`、`test_skeleton`。
- CLI 与 MCP 共用同一 service 层；AI 先查询再改；HARD 审批令牌。
- 垂直切片试点：一个系统从 Spec → 生成 → 契约/属性/变异 → receipt，全程无需人改 AUTO 代码。
- 退出标准：一个切片端到端自动合法；人工只处理 HARD；receipt 可审计。

## 9. 指标（基线 → 目标）

| 指标 | 当前 | 阶段 2 目标 | 阶段 4 目标 |
|---|---|---|---|
| 引擎行覆盖率 | 84.7% | ≥88% | ≥90% |
| core 覆盖率 | 未单列 | ≥95% | ≥95% |
| 每系统契约测试 | 4 个文件覆盖部分系统 | 9/9 | 新系统 100% |
| 变异分数（core） | 未测 | ≥50% | ≥70% |
| 属性测试组 | 0 | 4 组 | 覆盖 core/scene/physics |
| 规则闭环率 | 5 个 drill | ≥70% | ≥95% |
| 快速门禁耗时 | 未测量 | ≤20s | ≤15s |
| 全量门禁耗时 | 约 2–4 分钟 | 不显著变慢 | ≤10 分钟 |
| `npm pack` 安装冒烟 | 无 | 有 | 每次全量 |
| 未盖章交付 | 可能（本地） | 0 | 0 |
| 引擎外部项目可用性 | 未验证 | headless starter 通过 | 两个 starter + 文档 |

> 目标不是追求 100% 覆盖率，而是“关键不变量有测试、测试能杀死变异、规则有反例”。覆盖率只做下限。

## 10. 需要你裁定/操作的事项（简短）

1. **批准本规划与阶段 0 启动**（只加 CLI/规则表/回执，不改行为）。
2. **许可证**：`@itb/engine` 计划开源给其他项目用；选 Apache-2.0（含专利授权）或 MIT，并给 npm scope 名称。未定前保持 `private:true`，只做本地 starter。
3. **HARD 项**：是否批准/暂缓——
   - 渲染表改 SoA + `anchor/frame`（会改冻结 `IRenderer`，需 ADR）；
   - EventBus 类型映射（§5）；
   - `demo` 外迁/包拆分（SOFT，但会改 import 路径）。
4. **依赖安装许可**：阶段 1/3 需要 `fast-check`（属性测试）、`api-extractor`/`publint`（API/pack 检查）；变异测试优先自研进程内方案。若不允许新依赖，请明确，我会改用零依赖实现（能力会受限）。
5. **深检时间预算**：变异测试放夜间/批次是否可接受（每次提交跑会明显变慢）。
6. **MCP 优先级**：是否把 MCP 服务器作为阶段 4 的第一优先（Estella 的实践表明它对 AI 原生开发收益最大）。
7. **远端/CI**：当前无 origin，门禁在本机；阶段 2 后是否接入远端 CI（否则“自动合法”只能靠本地 receipt + 人工抽查）。

## 11. 风险与不做

- **不一次性拆微服务/多仓库**：保持 monorepo 与包级边界，避免运维成本。
- **不让 AI 生成测试自证**：AI 可生成测试骨架，但契约/黄金/属性测试需人审或由独立模型交叉验证；测试质量用变异分数兜底。
- **不追求“零人工”**：HARD 决策、Spec/契约、许可证、架构演进仍由人定；目标是减少逐行 Review。
- **不以覆盖率替代行为验证**：84.7% 是基线，不是安全证明。
- **不跳过自举阶段**：先规则表/负例/回执，再上深检与 MCP；否则工具会先压垮开发节奏（研究文档明确警告）。

---

## 附录：参考来源

- `研究文档-副本/AI介入下的小团队开发可维护性解决方案/AI友好开发架构自举构建流.md`
- `研究文档-副本/AI介入下的小团队开发可维护性解决方案/AI开发流程优化方案.md`
- `研究文档-副本/AI介入下的小团队开发可维护性解决方案/常规游戏架构解耦方式.md`
- `研究文档-副本/JS技术/AI友好型JS游戏引擎Estella简述.md`
- `通用资源-副本/代码质量维护/最低成本AI代码优化方案/ECS架构一步方案示范模板.md`
- Birgitta Böckeler, *Harness engineering for coding agent users*, Martin Fowler, 2026-04-02：<https://martinfowler.com/articles/harness-engineering.html>
- 本仓库基线审计：`docs/audits/engine-spec-audit-2026-10-22.md`
