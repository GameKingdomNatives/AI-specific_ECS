# 007 · 一条命令把质控方案装进别人的仓库

- 状态：规划（npm 首包后随 v0.2.0 落地）
- 日期：2026-10-25
- 关联：`docs/workflow/iteration-workflow.md`、`docs/adr/042-local-branch-guards.md`、`docs/adr/043-deep-audit-nightly.md`

## 0. 要解决的问题

本仓库的质控不是"再读一遍代码"，而是**可执行的策略**：门禁、回执、stamp 链、保护路径、负例演练、迭代记录。但这些现在只服务于这个仓库。别人想用，只能照文档手抄——这违反了"基础工作交工具"的约定。

目标：**一条 npm 命令**，把同一套策略装进任意仓库，并让被装进去的仓库自己会跑。

## 1. 命令面

```bash
# 安装（写入 .githooks/ 与 quality/，设置 core.hooksPath）
npx agent-specific_ecs-quality init

# 只预览将写入哪些文件
npx agent-specific_ecs-quality init --dry-run

# 只装报告与门禁，不接管 git hooks
npx agent-specific_ecs-quality init --no-hooks

# 升级已有策略（保留本地 quality.config.json）
npx agent-specific_ecs-quality update
```

包内入口：`bin: { "agent-specific_ecs-quality": "./dist/src/cli/quality.js" }`。

## 2. 装什么

| 目标路径 | 内容 | 说明 |
|---|---|---|
| `quality/gate.mjs` | 通用门禁：tsc → eslint → 自定义检查 → 测试 → 报告 | 由 `quality.config.json` 驱动，不写死本仓库路径 |
| `quality/checks/` | 受保护路径、禁用标记、测试基线、依赖边界 | 与本仓库同源，路径来自配置 |
| `quality/receipt.mjs` | 回执：HEAD / tree / 命中规则 / 结果 | 交付证据 |
| `quality/stamp.mjs` | 成功门禁 → 写 `.gate/stamps/<tree>.json` | pre-push 校验的目标 |
| `.githooks/pre-commit` | 跑 `quality/gate.mjs --fast` | 目标 ≤20s |
| `.githooks/pre-push` | 全量门禁 + stamp 链校验 | **本地分支保护** |
| `quality.config.json` | 项目自己的路径与阈值 | 唯一需要用户改的文件 |
| `docs/quality/README.md` | 装了什么、怎么改、怎么绕过会怎样 | 文件索引 |

**不装**：引擎源码、游戏内容、任何 `apps/`；也不改用户的业务代码。

## 3. 本地分支保护怎么体现

- `pre-push` 对每个待推送提交检查 **tree 是否有成功 stamp**；缺失即拒绝。
- 保护路径（`quality/`、`.githooks/`、`tsconfig*`、`package.json`）被改动且未带 `ALLOW_PROTECTED=1` → 拒绝。
- 禁用标记（`@ts-ignore`、`test.skip`、`.only`）扫描；测试文件数只增不减。
- 允许 `--no-verify` 吗？允许——但推送时 stamp 链会拦住。**检测 + 拒绝交付，不假装物理禁止。**

## 4. README 索引（安装后生成）

`docs/quality/README.md` 固定包含：

1. 一页纸：这套策略防什么、不防什么；
2. 文件表：每个文件负责哪一环；
3. 改配置：`quality.config.json` 字段说明与示例；
4. 日常命令：`node quality/gate.mjs`、`--fast`、`receipt`；
5. 失败排查：环境受限 vs 违规（L3 不计 PASS）；
6. 卸载：删除哪些路径、如何恢复 `core.hooksPath`。

## 5. 与引擎包的关系

- 策略包与运行时代码**同包不同目录**：`policy/` 随 npm 包发布，但从不被 `agent-specific_ecs` 的入口 import。
- 需要同步修改 `contracts/export-policy.json` 与 `package-surface` 检查（把 `policy/` 加入 allowlist，仍禁止 `apps/` 与游戏内容）。
- 版本节奏：首包只发引擎；`policy/` 与 CLI 作为 v0.2.0 的独立特性，带自己的 README 与演练。

## 6. 验收

- 在一个空仓库里 `npx … init` → `node quality/gate.mjs` 可跑、失败会红；
- 故意改保护路径 → pre-push 拒绝；
- 故意删测试 → 数量回归拦截；
- `--dry-run` 不写任何文件；
- 卸载后 `core.hooksPath` 恢复原值。
