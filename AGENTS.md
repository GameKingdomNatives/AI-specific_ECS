# 项目宪法（AI 每轮必读）

本文件是**约束**，不是说明书。完整规格见 `docs/00-最终指令.md`，冲突以该文档为准。

## 项目结构（2026-10-25 起）

**一个容器、两个平级项目**，另有一个测试替身：

| 单元 | 路径 | 性质 |
|---|---|---|
| 引擎 | `packages/engine` | 可被外部消费的库（npm `agent-specific_ecs`）；只导出运行时内核 |
| 游戏 | `apps/game` + `docs/game/` | 产品：场景、游戏系统、HUD、编辑器接线 |
| 夹具 | `packages/fixture` | 测试替身，不承载游戏内容 |
| 工程内核 | `tools/`、`contracts/`、`docs/workflow/` | 门禁、契约、流程 |

- 历史：2026-10-20 ～ 10-24 的工作是**建立引擎框架**；现在进入**在框架上推进游戏，并以游戏的推进反哺引擎**的阶段。
- 游戏内容**不得进入引擎包体**（`contracts/export-policy.json` + `package-surface` 门禁）。
- 引擎契约变更仍走 ADR 与 HARD 审批；游戏暴露的缺口记 `docs/game/engine-feedback.md`。
- 迭代方式见 `docs/workflow/iteration-workflow.md`（证据分层、人的在场规则、收尾清单）。

## 边界（违反即拒绝）

1. `packages/engine/src/core` 不得 import `ports`／`impl`／`data`／`demo`／`apps`。
2. `packages/engine/src/ports` 只能有纯类型，不得 import 任何实现或第三方库。
3. 引擎不得 import `apps/`；应用可依赖引擎。
4. 系统之间不得直接引用或调用；跨系统只走事件总线（冷逻辑）或命令缓冲。
5. 系统内不得做结构性变更（增删实体／组件），一律走 `CommandBuffer`，阶段末统一 flush。
6. 热路径（每帧上千次）不得走事件总线。
7. 不得新增任何「平行真相」（例如物理库自己维护位置）。
8. 不得用 `any`、`@ts-ignore`、类型断言绕过契约。
9. 游戏内容不得进入引擎包体或引擎源码；引擎不得 import `apps/`。

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
- 每次会话结束：跑全量门禁，把 `artifacts/gate/<run>/report.md` 摘要贴进回复，并更新 `docs/handoff.md`。

## 权限

- AUTO：`src/core` 内部实现、`impl`、`demo`、`apps`、测试。
- SOFT：新增系统、新增端口方法、新增 schema 字段、依赖增删（提交信息注明）。
- HARD：改 `ports` 已冻结签名、改确定性算法、改分层方向、改门禁阈值、改保护路径（`tools/`、`.githooks/`、`tsconfig*`、`eslint.config.mjs`、`package.json`）。必须人工批准并同步更新 `tools/port-contract.json` 与 ADR。

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

## 会话仪式

1. 开始：`node tools/status.mjs` + 读 `docs/handoff.md` 顶部 + 读 `docs/workflow/iteration-workflow.md`。
2. 立项：选 1–2 个目标，写迭代记录（`docs/workflow/iterations/iter-NNN-*.md`），过边界检查。
3. 中途：改完一个模块就 `node tools/gate.mjs --fast`，别攒到最后。
4. 结束：`node tools/gate.mjs` + 贴报告摘要 + 更新 `docs/handoff.md` 与 `docs/quality-log.md` + 必要时 `node tools/panel/collect.mjs`。
5. 交付：`node tools/flow.mjs ship`（自动门禁/receipt/深检/合并/推送/清理）；推送通道失败见 `docs/runbooks/04-推送与网络策略.md`，分支清理见 `docs/runbooks/05-分支生命周期.md`。
6. 基础工作交工具：状态检查、门禁、报告、回执、分支生命周期全部自动化；工具坏了修工具，不写"注意事项"绕过。
