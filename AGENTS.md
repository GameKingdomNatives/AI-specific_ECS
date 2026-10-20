# 项目宪法（AI 每轮必读）

本文件是**约束**，不是说明书。完整规格见 `docs/00-最终指令.md`，冲突以该文档为准。

## 本轮范围

只做引擎与技术基础：ECS 内核、十个端口、事件总线、渲染与物理查询、数据层、确定性、热重载、治理面板。
**不做**：机甲／辐能／弹幕／僚机／关卡等任何游戏内容。

## 边界（违反即拒绝）

1. `packages/engine/src/core` 不得 import `ports`／`impl`／`data`／`demo`／`apps`。
2. `packages/engine/src/ports` 只能有纯类型，不得 import 任何实现或第三方库。
3. 引擎不得 import `apps/`；应用可依赖引擎。
4. 系统之间不得直接引用或调用；跨系统只走事件总线（冷逻辑）或命令缓冲。
5. 系统内不得做结构性变更（增删实体／组件），一律走 `CommandBuffer`，阶段末统一 flush。
6. 热路径（每帧上千次）不得走事件总线。
7. 不得新增任何「平行真相」（例如物理库自己维护位置）。
8. 不得用 `any`、`@ts-ignore`、类型断言绕过契约。

## 门禁

```bash
node tools/gate.mjs        # 全量：tsc + eslint + 自定义校验 + 测试 + git 事实 + 依赖边界
node tools/gate.mjs --fast # 快速：不含依赖边界与 git 事实
node tools/status.mjs      # 开工先看状态
node tools/panel/collect.mjs  # 刷新治理面板数据
```

- 通过 = 退出码 0；**没有「警告通过」**。
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

## 环境事实（2026-10-20 实测）

- Node 24.14、npm 11.9、TypeScript 5.9、ESLint 9.39、dependency-cruiser 18.7。
- **vitest／vite 不可用**：二者依赖 esbuild 子进程，本机沙箱禁止管道子进程。测试用 `node:test`，构建用 `tsc`。
- **pnpm 不可用**：生命周期脚本 spawn 被拒，隔离链接在本机也不完整。用 npm workspaces。
- **Git Bash 在本沙箱内起不来**（MSYS 需要信号管道）。钩子依据 `.githooks/` 已配好，在你自己的终端里生效；沙箱内提交需 `git commit --no-verify`，并用 `node tools/gate.mjs` 手动补跑。
- npm 缓存必须落工作区内：`.npmrc` 已设 `cache=.npm-cache`。

## 会话仪式

1. 开始：`node tools/status.mjs`，确认 HEAD、脏文件、上次门禁。
2. 中途：改完一个模块就 `node tools/gate.mjs --fast`，别攒到最后。
3. 结束：`node tools/gate.mjs` + 贴报告摘要 + 更新 `docs/handoff.md` + 必要时 `node tools/panel/collect.mjs`。
