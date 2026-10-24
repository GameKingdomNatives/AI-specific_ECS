# 阶段 0 落地规划：本地优先的 AI 质量护栏

- 版本：v1.0（执行计划，2026-10-24）
- 上位规划：`docs/proposals/004-engine-ai-quality-next-stage.md`（v1.2）
- 本阶段目标：**先把本地保护跑稳，不急着上 CI、不公开、不发 npm**
- 当前仓库：私有 `GameKingdomNatives/AI-specific_ECS`（main 已推送，SSH remote）
- 当前基线：HEAD `d198e38` 后新增计划文档；最近全量门禁 PASS `20261024T081052Z`

## 0. 总目标与边界

### 0.1 程序目标（长期）

| ID | 目标 | 判定 |
|---|---|---|
| P1 | 外部简单：调用者不理解 ECS 也能用引擎 | starter 快速上手 ≤10 行；公共 API 报告；无内部类型泄漏 |
| P2 | AI 产出自动合法 | 规则表 + 两级门禁 + Receipt；AUTO 改动无需逐行人工 Review |
| P3 | 引擎独立 | 内核零应用依赖；本地 pack + starter 冒烟；可被其他项目消费 |
| P4 | 质量可解释 | 每条规则有 guide/sensor/negativeTest；失败能定位到规则 |

### 0.2 阶段 0 目标（本计划）

| ID | 目标 | 判定 |
|---|---|---|
| G0.1 | 本地分支护栏 | 直接 push main 被 hook 拒绝；feature 分支 push 必须过全量 gate + tree stamp |
| G0.2 | 深检节奏 | 每 5 次提交要求深检回执；20:00 夜间审计报告落盘 |
| G0.3 | 规则/CLI/回执 | 10 条规则闭环；`itb check --changed` ≤20s；每次 gate 产出 Receipt |
| G0.4 | 基线收口 | 文档/ADR/记忆更新；阶段 0 验收全绿；无引擎行为改动 |

**不做**：GitHub Actions 强制 required checks（等本地稳定/Pro）、npm 发布、引擎包拆分、属性/变异/黄金测试的完整实现（阶段 1–3）。

## 1. 本地分支保护：先诚实定义“保护”

Git 本身没有本地 branch protection；hooks 可以被 `--no-verify` 绕过。因此本阶段的“本地保护”是**护栏（guardrail）**，不是安全边界：

- 提高误操作成本；
- 每次 push 自动跑全量 gate；
- 用 tree stamp 证明“这个提交树过过门禁”；
- 直接 push main 默认拒绝；
- 夜间审计扫描“没有 stamp 的提交”，把绕过暴露出来；
- 真正的强制（required checks、禁止 force push）等 GitHub Pro 或公开仓库。

### 1.1 目标文件

| 文件 | 作用 |
|---|---|
| `.githooks/pre-commit` | 快速门禁（已有）；改为调用 `tools/hooks/pre-commit.mjs`，跨平台 |
| `.githooks/pre-push` | 全量门禁 + tree stamp + main 直推拦截 + 深检节奏（改为 Node hook） |
| `.githooks/commit-msg` | 轻量提醒：Conventional Commits；代码提交缺少 `Evidence:` 时警告（不硬拦，先降低摩擦） |
| `tools/hooks/pre-push.mjs` | 读取 stdin refs；拒绝 `refs/heads/main` 直推（除非 `ALLOW_MAIN_PUSH=1` 且来自 safe-merge） |
| `tools/hooks/pre-commit.mjs` | 调 `tools/gate.mjs --fast` |
| `tools/verify-stamp.mjs` | 校验 `.gate/stamps/<tree>.json` 存在且 tree 匹配 |
| `tools/safe-merge.mjs` | feature → main 的唯一推荐路径：全量 gate → ff-only merge → 带 `ALLOW_MAIN_PUSH=1` push |
| `tools/hooks/test.mjs` | 负例演练：旧 tree push、直推 main、第 5 次提交无深检，全部必须被拒 |
| `tools/install-hooks.mjs` | 设置 `core.hooksPath=.githooks`，校验 GitBash/Node 可用 |

### 1.2 pre-push 顺序（必须固定）

1. 读 stdin 的 `localRef localSha remoteRef remoteSha`。
2. 若 `remoteRef == refs/heads/main` 且 `ALLOW_MAIN_PUSH != 1`：拒绝，提示用 `npm run merge`。
3. 跑 `node tools/gate.mjs`（全量）；失败即拒。
4. 计算 `localSha^{tree}`，确认 `.gate/stamps/<tree>.json` 存在。
5. 若 `.gate/deep-stamp` 存在，计算 `git rev-list --count <deepSha>..localSha`；≥5 且当前树无深检 stamp：拒绝。
6. 通过才允许 push；记录 `artifacts/push/<tree>.json`（可选）。

### 1.3 本地分支策略

- `main`：只接受 `npm run merge`（ff-only）或显式 `ALLOW_MAIN_PUSH=1` 的紧急操作；直推被 hook 拒。
- `feat/<batch>-<topic>`、`fix/<topic>`、`chore/<topic>`：一分支一主题。
- 合并前：全量 gate PASS；合并后立即 push main，触发再次全量 gate（push hook）。
- 不引入 Git Flow 复杂度；小团队用短分支。

### 1.4 验收（Batch 0.1）

- [ ] `node tools/hooks/test.mjs` 3 个负例全部被拒，1 个正例通过。
- [ ] 在 feature 分支直接 `git push origin main` 被拒，提示 safe-merge。
- [ ] 旧 tree（未盖章）push 被拒。
- [ ] 连续第 5 个提交（无深检）push 被拒。
- [ ] 正常 feature push 全量 gate PASS 后允许。
- [ ] 文档明确写“hooks 可被 --no-verify 绕过，夜间审计补漏”。

## 2. 深检与夜间审计（本地）

### 2.1 深检内容（分阶段增量）

`tools/deep-audit.mjs` 输出 `artifacts/deep/<run>/report.md/json`，阶段 0 先做：

- 全量 `gate`（复用）；
- `coverage`（已有）；
- `replay --repeat 3`（已有）；
- `bench`/`render-bench`/`submit-bench`（已有）；
- 检查 `.gate/stamps` 与最近提交的缺失；
- 生成“未盖章提交/规则缺口/待办”摘要。

阶段 1–3 再增：属性测试、黄金夹具、变异测试、API diff、pack 安装、依赖/许可证。

### 2.2 每 5 次提交

- `.gate/deep-stamp` JSON：`{ sha, tree, run, at, verdict }`。
- `pre-push` 计算自上次深检后的提交数；≥5 时要求 HEAD 有深检 stamp。
- 深检失败：写入 `.gate/deep-pending`，提示“先修复再推送”；不自动跳过。
- `npm run deep`：本地手动跑深检；`npm run deep:status`：显示计数。

### 2.3 每晚 20:00（Asia/Shanghai）

本地优先方案：

1. `tools/nightly.mjs`：跑 `gate` + `deep-audit`，输出到 `engineering/audits/<YYYY-MM-DD>/`（`report.md`、`gate.log`、`deep.log`、`summary.json`）。
2. `tools/nightly.cmd`：Windows 计划任务入口，调用 GitBash/Node（路径由 `DSH_*`/`GIT_BASH` 或默认路径探测）。
3. `schtasks` 注册：`AI-specific_ECS-Nightly`，每天 20:00；失败重试一次；工作日/周末都跑。
4. DSH 独立会话：
   - 先验证 DSH 是否支持“定时启动独立会话”；不支持则在 Batch 0.2 用 `dev_scaffold_plugin` 做最小 daemon-loop 插件（timer 20:00 → 独立只读会话），或 Windows 计划任务跑审计 + DSH 会话只消费报告。
   - 会话边界：当前工作区/账户；只读仓库；只允许创建 `engineering/audits/`、`engineering/source/`；不得自动改代码、门禁、批准文件；结论写报告/issue 草稿。
5. 报告保留：`engineering/audits/` 入仓（Markdown/JSON 小文件）；原始日志/覆盖率大文件进 `.gitignore`，只留摘要。

### 2.4 验收（Batch 0.2）

- [ ] `node tools/deep-audit.mjs --dry-run` 可生成报告，不写源码。
- [ ] 手动跑一次夜间任务，`engineering/audits/<date>/report.md` 存在。
- [ ] 第 5 次提交无深检时 push 被拒；深检后恢复。
- [ ] 20:00 计划任务在测试日触发一次（可用临时 2 分钟后触发验证）。
- [ ] DSH 独立会话方案有结论：原生支持 / 插件 / 计划任务降级；不得口头声称“已完成”。

## 3. Harness 规则表、CLI、Receipt（Batch 0.3）

### 3.1 规则表

`contracts/harness.json` 每条：

```json
{
  "id": "ARCH-001",
  "title": "系统不得直接 spawn/despawn",
  "guide": "docs/guides/systems.md",
  "sensor": "tools/checks/system-structure.mjs",
  "negativeTest": "tools/drill/cases/ARCH-001.mjs",
  "severity": "error",
  "approval": "AUTO",
  "scope": ["packages/engine/src/**"]
}
```

首批 10 条：

1. ARCH-001 系统内禁止 `world.spawn/despawn/add/remove`，只走命令缓冲；
2. ARCH-002 热路径禁止事件总线；
3. ARCH-003 core 不依赖 ports/impl/data/apps 或第三方；
4. ARCH-004 ports 纯类型；
5. ARCH-005 engine 不依赖 apps；
6. ARCH-006 每个系统有 Spec + 契约测试；
7. QUAL-001 每条自定义规则有 negativeTest；
8. QUAL-002 禁用 `test.skip/.only/@ts-ignore` 等（已有）；
9. PERF-001 每系统 p95 预算（复用 `findBudgetBreach`）；
10. API-001 公共导出有 `.d.ts` 报告/quickstart 冒烟（阶段 2 启用）。

### 3.2 CLI

`tools/itb.mjs`：

- `itb inspect`：列出规则/能力/Spec；
- `itb impact --changed [base]`：变更文件 → 受影响测试/规则；
- `itb check --changed`：只跑受影响检查（≤20s）；
- `itb gate [--deep]`：全量/深检；
- `itb receipt`：生成/校验回执。

实现约束：Node + TypeScript Compiler API；不依赖管道子进程；Windows/GitBash 均可。

### 3.3 Receipt

`tools/receipt.mjs` 写 `artifacts/receipts/<tree>.json`：

```json
{
  "version": 1,
  "tree": "...",
  "base": "...",
  "changed": ["..."],
  "rules": [{"id":"ARCH-001","status":"pass"}],
  "tests": {"selected": 12, "passed": 12, "coverage": 0.847},
  "deep": {"level":"gate","at":"..."},
  "verdict": "pass",
  "approvals": []
}
```

`gate` 末尾自动生成；`pre-push` 校验 receipt；没有 receipt 不得作为交付证据。

### 3.4 验收（Batch 0.3）

- [ ] 10 条规则都有 guide/sensor/negativeTest，且负例能让 sensor 变红。
- [ ] `itb check --changed` 在最近一次小改动上 ≤20s。
- [ ] `itb gate` 生成 receipt，pre-push 能校验。
- [ ] `itb impact` 对至少 3 类改动（core/scene/app）给出合理测试集。
- [ ] 现有 58 个门禁检查不被删除或弱化。

## 4. 阶段 0 批次与时间

| 批次 | 时间 | 交付 | 退出标准 |
|---|---|---|---|
| 0.1 本地护栏 | 3 天 | hooks、stamp 校验、main 直推拦截、safe-merge、负例测试 | **已完成（2026-10-24，见 `docs/audits/phase0-batch-0.1.md`）** |
| 0.2 深检/夜间 | 3 天 | deep-audit、deep-stamp、20:00 任务、engineering/audits、DSH 结论 | **部分完成（2026-10-24）：深检/5 次拦截/计划任务已验收；DSH 原生 schedule 已验证独立投递，执行侧需改为只读消费报告；见 `docs/audits/phase0-batch-0.2.md`）** |
| 0.3 规则/CLI/回执 | 4 天 | harness.json、10 条规则、itb、impact、receipt | **进行中（2026-10-24）：规则表/harness gate/itb/receipt 已落地，4/10 implemented；check 21.2s 未达 20s，见 `docs/audits/phase0-batch-0.3.md`）** |
| 0.4 收口 | 1 天 | ADR/指南/记忆/验收记录 | 阶段 0 全绿；无引擎行为改动 |

## 5. 后续阶段（详细批次）

### 阶段 1：契约/能力/行为（约 2–3 周）

- **1.1**（4d）`@itb/contracts` 初版：端口类型、typed EventMap、scene schema、能力 registry JSON；不改变冻结端口形状（只生成类型/文档）。
- **1.2**（5d）9 个系统 Spec + 每系统契约测试；失败/边界用例；`ARCH-006` 生效。
- **1.3**（4d）属性测试 4 组：ECS 代际、命令顺序、scene roundtrip、replay；`fast-check`，快速门禁冒烟。
- **1.4**（4d）黄金场景/headless 编辑操作：demo 场景、删除+保存、系统开关；批准文件人审。
- 退出：9/9 系统契约；4 组属性；黄金场景；规则闭环 30+。

### 阶段 2：引擎独立化（约 2–3 周）

- **2.1**（5d）`demo` 外迁到 fixture；`createEngine` 单门面（scene/renderer/physics 可选，headless 默认）；公共导出审查。
- **2.2**（4d）README/CHANGELOG/embedding；`api-extractor` 报告；`npm pack` 本地 tarball + starter 安装。
- **2.3**（5d）适配器包 PoC（Pixi 或 physics 先选一个）；peerDependencies；pack 冒烟。
- 退出：starter ≤10 行；空目录安装跑通；无 apps/fixture 依赖；API 报告稳定。

### 阶段 3：深检与行为门禁（约 3–4 周）

- **3.1**（5d）变异测试（core 优先，自研进程内；夜间/每 5 次提交）。
- **3.2**（3d）深检纳入属性全量、黄金、API、pack、依赖/许可证；Harness 覆盖率指标。
- **3.3**（3d）性能预算表（每系统 p95 + bench 回归）；视觉/Storybook 可选。
- 退出：core 变异 ≥60%；Harness 闭环 ≥90%；深检可重复。

### 阶段 4：AI 原生闭环（约 4–6 周）

- **4.1**（5d）CLI/MCP（Model Context Protocol）服务：inspect/spec/impact/scene_validate/headless_run/replay/gate_status/test_skeleton；只读 + 干跑优先。
- **4.2**（5d）Spec → 测试骨架 → 实现 → 契约/属性/变异 → receipt 的生成工作流。
- **4.3**（5d）一个垂直切片试点，AUTO 改动无人逐行 Review；HARD 仍需审批。
- **4.4**（持续）规则演进、Harness 覆盖率、发布准备（公开/npm 由人定）。

## 6. 指标与目标

| 指标 | 当前 | 阶段 0 后 | 阶段 2 | 阶段 4 |
|---|---|---|---|---|
| 本地 main 直推 | 允许 | 被 hook 拒 | 被 hook 拒 | 远端 required checks |
| 全量 gate 覆盖 | 58 检查 | 58+（不弱化） | 58+ API/pack | 58+ 深检 |
| 深检节奏 | 无 | 每 5 次 + 20:00 | 同左 | 同左 |
| 规则闭环 | 5 类 drill | 10 条 | 30+ | ≥95% |
| Receipt | 无 | 每次 gate | 含 API/pack | 含变异/属性 |
| 覆盖率 | 84.7% | 不降 | core ≥95% | ≥90% 全局 |
| 变异分数 | 未测 | 未测 | 启动 | core ≥60% |
| 公共 API | core/ports | 不变 | `createEngine` + 报告 | 稳定 |
| 外部 starter | 无 | 无 | headless ≤10 行 | 两个 starter |

## 7. 风险与应对

| 风险 | 应对 |
|---|---|
| hooks 被 `--no-verify` 绕过 | 夜间审计扫描未盖章提交；本地阶段明确“护栏非安全”；Pro/public 后 required checks |
| GitBash/Windows 路径差异 | hook 统一 Node 入口；`tools/hooks/test.mjs` 在 GitBash + PowerShell 各跑一次 |
| DSH 无原生定时独立会话 | Batch 0.2 先验证；不支持则 daemon-loop 插件或计划任务降级；不口头声称完成 |
| 深检过慢 | 先 core；夜间/每 5 次；可配置预算；失败不跳 |
| 规则误报/摩擦 | 每条规则先 warning 后 error；负例先跑；收集一周数据再收紧 |
| demo 外迁破坏 import | 分阶段 codemod + 全量 gate；保持旧子路径临时兼容 |
| AI 生成测试自证 | 独立契约/黄金/属性/变异；批准文件人审 |

## 8. 本轮之后立即执行（Batch 0.1）

1. 写 `.githooks/pre-push`（Node 入口）、`tools/hooks/pre-push.mjs`、`verify-stamp.mjs`、`safe-merge.mjs`、`hooks/test.mjs`。
2. `npm run hooks:install`；在 GitBash 跑负例。
3. 更新 `AGENTS.md` 的本地分支策略（HARD，审批已获）。
4. 写 ADR-042（本地保护）与 `docs/guides/local-branch-protection.md`。
5. 全量 gate；合并到 main 后 push（用 safe-merge 验证自身）。
6. 观察一周；稳定后再进入 0.2。

## 9. 需要你操作的（很少）

- 无需改 GitHub 设置；分支保护等本地稳定后再定 Pro/public。
- 若 DSH 原生定时会话不可用，我会在 Batch 0.2 给出“插件/计划任务”二选一的操作清单。
- 许可证/npm 上传继续后置。
