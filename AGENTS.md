# 项目宪法（AI 每轮必读）

本文件是**约束**，不是说明书。完整规格见 `docs/00-最终指令.md`，冲突以该文档为准。
每轮开工还必须读两份地图：**`工程文档/索引.md`**（工程事实在哪）与 **`docs/workflow/完整工作流.md`**（怎么操作）。

## 项目结构（2026-10-25 起）

**一个容器、两个平级项目**，另有一个测试替身：

| 单元 | 路径 | 性质 |
|---|---|---|
| 引擎 | `packages/engine` | 可被外部消费的库（npm `agent-specific_ecs`）；只导出运行时内核 |
| 游戏 | `apps/game` + `docs/game/` | 产品：场景、游戏系统、HUD、编辑器接线 |
| 夹具 | `packages/fixture` | 测试替身，不承载游戏内容 |
| 工程内核 | `tools/`、`contracts/`、`docs/workflow/` | 门禁、契约、流程 |
| 工程文档 | `工程文档/` | 顶层工程事实：项目身份 / 当前状态 / 边界 / 迭代记录 / 灵感池 / 系统维护 / 变更 / 校正 / 交接 |

- 历史：2026-10-20 ～ 10-24 的工作是**建立引擎框架**；现在进入**在框架上推进游戏，并以游戏的推进反哺引擎**的阶段。
- 游戏内容**不得进入引擎包体**（`contracts/export-policy.json` + `package-surface` 门禁）。
- 引擎契约变更仍走 ADR 与 HARD 审批；游戏暴露的缺口记 `docs/game/引擎反馈.md`。
- 迭代方式见 `docs/workflow/迭代流程.md`（证据分层、人的在场规则、收尾清单）。

### 开工首读顺序（不可跳）

1. `node tools/status.mjs`（HEAD / 分支 / 脏文件 / 上次门禁 / 环境）
2. `工程文档/当前状态.md`（一屏）
3. `docs/交接.md` 顶部（详细事实、待人裁定、环境结论）
4. `工程文档/项目身份/项目身份.md`（方向与支柱）
5. `docs/workflow/迭代流程.md`（本轮流程）
6. `工程文档/迭代记录/` 最后一个记录（上一轮停在哪）

## 工程文档与事实纪律

### 单一事实表（同一内容只写一处正文）

| 内容 | 唯一来源 |
|---|---|
| 方向 / 支柱 / 感觉词 / 非目标 | `工程文档/项目身份/项目身份.md` |
| 一屏状态摘要 | `工程文档/当前状态.md` |
| 可执行边界与权限 | `AGENTS.md`（`工程文档/边界约束.md` 只解释 why） |
| 详细状态 / 交接 | `docs/交接.md` |
| 迭代事实 | `工程文档/迭代记录/` |
| 未采纳想法 | `工程文档/灵感池/`（IDEA-NNN） |
| 维护规范 / 扩展入口 | `工程文档/系统维护/` |
| 月度变更 | `工程文档/变更记录/YYYY-MM.md` |
| 方向校正 / 回顾 | `工程文档/校正记录/` |
| 流程 / 操作手册 | `docs/workflow/` |
| 决策理由 | `docs/adr/` |
| 机器契约 | `contracts/` |
| 系统职责 | `docs/systems/` |

### 新知识落点（不要凭记忆找地方）

- 新想法 → `工程文档/灵感池/`：复制 `_模板.md` 建 `IDEA-NNN-<slug>.md`，更新 `索引.md`。**AI 不自行决定采纳/拒绝**，由人在立项时裁定。
- 开始一轮工作 → 复制 `工程文档/_模板/迭代.md` 到 `工程文档/迭代记录/迭代-NNN-<主题>.md`。
- 迭代结束 → 迭代记录补检查点/证据/回顾 + `当前状态.md` + `变更记录/YYYY-MM.md` + `docs/交接.md` + `docs/质量日志.md`。
- 新边界/权限 → `AGENTS.md`（并同步 `工程文档/边界约束.md` 的解释；HARD 需批准）。
- 方向变化 → 项目身份 + `工程文档/校正记录/`（用 `_模板/方向校正.md`）。
- 不构成决策的过程复盘 → `工程文档/校正记录/`；形成决策的 → `docs/adr/`。

### 文档纪律（违反即视为缺陷）

- **不得复制正文制造平行真相**；允许"摘要 + 指针"，指针必须指向唯一来源。
- 文档与代码同提交；功能完成立即更新系统卡 / 当前状态 / 变更记录。
- 时间敏感结论（发布、冻结、环境）必须写"核验命令 + 结论时间"，不许只写结论。
- 术语首次出现给全称与来源路径（见 `工程文档/系统维护/文档与记忆规范.md`）。
- 记忆只记"新事实 / 人的纠正 / 稳定环境事实"；跨会话结论落仓库文档，不依赖记忆。

## 边界（违反即拒绝）

1. `packages/engine/src/core` 不得 import `ports`／`impl`／`data`／`demo`／`apps`。
2. `packages/engine/src/ports` 只能有纯类型，不得 import 任何实现或第三方库。
3. 引擎不得 import `apps/`；应用可依赖引擎。
4. 系统之间不得直接引用或调用；跨系统只走事件总线（冷逻辑）或命令缓冲。
5. 系统内不得做结构性变更（增删实体／组件），一律走 `CommandBuffer`，阶段末统一 flush。
6. 热路径（每帧上千次）不得走事件总线。
7. 不得新增任何「平行真相」（例如物理库自己维护位置；文档层同样适用）。
8. 不得用 `any`、`@ts-ignore`、类型断言绕过契约。
9. 游戏内容不得进入引擎包体或引擎源码；引擎不得 import `apps/`。
10. 文档不得复制事实正文；只允许摘要与指针。

## 门禁

```bash
node tools/gate.mjs        # 全量：tsc + eslint + 自定义校验 + 测试 + git 事实 + 依赖边界
node tools/gate.mjs --fast # 快速：不含依赖边界与 git 事实
node tools/status.mjs      # 开工先看状态
node tools/panel/collect.mjs  # 刷新治理面板数据
```

- 通过 = 退出码 0；**没有「警告通过」**。
- **退出码 ≠ 检查通过**：解析型检查（depcruise、eslint JSON、registry findings）必须解析结果本身；命令没产出可解析结果时判失败，不许当通过。depcruise 的 JSON 模式有违规也退出 0，必须走 `tools/checks/depcruise.mjs` 包装器（ADR-007）。
- 门禁失败时不许提交、不许推送、不许声称完成。
- 没跑过门禁就说「完成」，视为未交付。
- 每次会话结束：跑全量门禁，把 `artifacts/gate/<run>/report.md` 摘要贴进回复，并更新 `docs/交接.md` 与 `工程文档/当前状态.md`。

## 权限

- AUTO：`src/core` 内部实现、`impl`、`demo`、`apps`、测试、工程文档（不改变事实的编辑）。
- SOFT：新增系统、新增端口方法、新增 schema 字段、依赖增删（提交信息注明）。
- HARD：改 `ports` 已冻结签名、改确定性算法、改分层方向、改门禁阈值、改保护路径（`tools/`、`.githooks/`、`tsconfig*`、`eslint.config.mjs`、`package.json`）。必须人工批准并同步更新 `tools/port-contract.json` 与 ADR。
- 人不在场时，**可逆** HARD 可先做后报并在 ADR/交接标"待追认"；**不可逆**动作（发布、推送、删数据、改冻结契约、改仓库历史）一律停等。

## 保护路径

`tools/`、`.githooks/`、`eslint.config.mjs`、`tsconfig*.json`、`.dependency-cruiser.cjs`、`package.json`、`.npmrc`。
改动时门禁会拦；确需改动：`ALLOW_PROTECTED=1 node tools/gate.mjs` 并在 `docs/adr/` 补记录。

## 环境事实（2026-10-25 实测）

- **受限会话**（当前 DSH 沙箱）：禁止管道子进程 → esbuild/vite 内部 spawn 失败，`build`／`storybook`／`starter` 无法执行；这是 **L3 环境受限**，不是代码违规，但**不得计为 PASS**。
- 本会话 `node` 为 v26.12.1，`npm` 解析到需要 Node 22 的 shim；跑 npm 相关步骤前先确认解析到的可执行文件。
- **vitest／vite 测试不可用**：测试用 `node:test`；构建用 `tsc` 验证类型。完整会话（人的终端）可跑 Vite/Storybook。
- **pnpm 不可用**：用 npm workspaces；npm 缓存必须落工作区内（`.npmrc` 已设 `cache=.npm-cache`）。
- 检查脚本一律用 `tools/checks/spawn-capture.mjs`（文件描述符重定向），**不要用 `spawnSync(..., { encoding })` 管道捕获**。
- 门禁报告会记录环境指纹（node／平台／管道可用性）；L3 步骤必须点名列出。
- 推送通道：`~/.ssh/config` 可能把 `github.com` 改写到 `ssh.github.com:443`（会被网络重置）；判定与切换见 `docs/runbooks/04-推送与网络策略.md`。
- 受限会话里 `.githooks` 的 sh 脚本无法启动（`couldn't create signal pipe, Win32 error 5`），pre-commit 不会执行。**仅在这种情况下**：先手动跑全量 `node tools/gate.mjs`，再 `git commit -n`，并在提交信息里写明门禁 run id 与 L3 项；能用 sh 时不得用 `-n`。

## 会话仪式

1. 开始：按上面"开工首读顺序"读齐；`node tools/status.mjs` 为第一步。
2. 立项：选 1–2 个目标，写迭代记录（`工程文档/迭代记录/迭代-NNN-*.md`，模板 `工程文档/_模板/迭代.md`），过边界检查；需要新想法先进灵感池。
3. 中途：改完一个模块就 `node tools/gate.mjs --fast`，别攒到最后。
4. 结束：`node tools/gate.mjs` + 贴报告摘要 + 更新 `docs/交接.md`、`docs/质量日志.md`、`工程文档/当前状态.md`、`工程文档/变更记录/` 与迭代记录；必要时 `node tools/panel/collect.mjs`。
5. 交付：`node tools/flow.mjs ship`（自动门禁/receipt/深检/合并/推送/清理）；通道问题见 `docs/runbooks/04`，分支见 `docs/runbooks/05`。推送前先 `node tools/push.mjs` 体检。
6. 交接：新会话前更新 `工程文档/交接/交接清单.md`（首读顺序）与 `docs/交接.md`（详细事实）；不要在别处复制交接正文。
7. 基础工作交工具：状态检查、门禁、报告、回执、分支生命周期全部自动化；工具坏了修工具，不写"注意事项"绕过。

## 高频错误（历史教训，写进来防复发）

- 用 `spawnSync(..., { encoding })` 捕获子进程输出 → 受限沙箱 EPERM；一律用 `tools/checks/spawn-capture.mjs`。
- 用 `git add -A` → 会带入 `.archify/` 等生成物；按路径显式 add。
- 把 `annotated tag` 当分支 tip 校验 stamp → tag 对象永远无 stamp；只校验解引用后的提交可达性。
- 在受限会话里把 build/storybook/starter 的 L3 失败当成代码违规，或反过来当成 PASS。
- 为省事把同一段事实复制到第二份文档；下次只改一处，另一处立刻变成假情报。
- 手工记分支/推送命令；应交给 `node tools/flow.mjs` 与 `node tools/push.mjs`。
