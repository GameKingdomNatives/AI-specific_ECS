# Harness 经验教训：十条可执行规则

> 来源：Birgitta Böckeler《Harness engineering for coding agent users》（<https://martinfowler.com/articles/harness-engineering.html>）、本仓库研究文档、以及当前门禁实践。不是理论摘抄，每条都要落到本仓库的“指南/传感器/负例测试”。

1. **前馈与反馈必须成对**。只写 AGENTS.md 不写检查，AI 会反复犯同一错；只写检查不写指南，AI 不知道为什么错。每条规则至少有一个 guide 和一个 sensor。
2. **计算型优先**。类型、Lint、依赖图、单测、变异测试先做；LLM Review 只补语义，不承担“唯一裁判”。
3. **AI 生成的测试不能自证**。AI 写实现又写测试，等于同一双眼睛检查作业；用独立契约、属性、黄金夹具和变异测试做外部裁判。
4. **反馈要左移**。快速检查在写代码/提交前跑（≤20 秒）；全量门禁在提交/交付跑；变异测试、视觉、依赖审计放夜间/每 5 次提交。
5. **回执是交付物**。没有 receipt 的“我跑过门禁”不算证据；receipt 要含 tree hash、命中规则、测试/变异/性能结果、审批。
6. **每条规则都要有反例**。检查脚本必须能被一个“故意违规”的样本弄红；否则无法区分“代码很干净”和“检查没生效”。
7. **架构只留一条路**。系统结构变更只能走命令缓冲，跨系统只能走事件/命令；AI 没有第二种写法，审查才是模式匹配。
8. **公共面越小越好**。外部 API 用单门面/单配置/明确生命周期；内部复杂度隐藏，调试全局不进公共面。这是“外部简单、内部复杂”的工程化定义。
9. **本地钩子是护栏，不是安全边界**。`--no-verify` 永远可以绕过；本地阶段用 hook + stamp + 夜间审计提高成本，真正的强制等 GitHub Pro/public 的 required checks。
10. **人类的工作是转向 Harness**。同一个问题出现两次，就补一条指南/传感器/负例；不要只修这一次代码。

## 本仓库对应关系

| 经验 | 当前落点 | 下一阶段 |
|---|---|---|
| 1 前馈+反馈 | AGENTS.md、docs/systems、gate | `contracts/harness.json` 规则表 |
| 2 计算型优先 | tsc/eslint/depcruise/replay/bench | 属性/变异/API/pack |
| 3 测试自证 | 4 个契约测试 | 9/9 系统契约 + 独立黄金/属性 |
| 4 左移 | `gate --fast` | `check --changed` ≤20s |
| 5 回执 | gate report/stamp | receipt + 深检回执 |
| 6 反例 | drill 5 类 | 每条自定义规则一个负例 |
| 7 唯一路径 | 命令缓冲/调度 | 系统结构 AST 规则 |
| 8 公共面 | core/ports 根导出 | `createEngine` 门面 + API 报告 |
| 9 本地护栏 | pre-commit/pre-push | 本地 branch guard/stamp/deep |
| 10 转向 | handoff/ADR | 失败归因 → 新规则 |

> 记住：Harness 的目标不是“零人工”，而是把人的注意力从逐行 Review 移到 Spec/契约、HARD 决策和规则演进上。

## 2026-10-25 追加：发布与文档

11. **发布状态必须可核验**：`staged`、`published`、`recovery hold` 是三种不同状态；不要用“已上传”概括。核验 `npm view` / `npm stage list`。
12. **恢复码不是发布因子**：使用 recovery code 会触发 72h 安全冻结；日常发布用 TOTP，长期用 OIDC trusted publishing。
13. **passkey 与 OTP 是两条通道**：`npm stage approve` 只支持 `--otp`；WebAuthn/passkey 只在交互式 `npm publish` 的浏览器仪式里使用。
14. **编码是门禁的一部分**：PowerShell 批量替换可能破坏 UTF-8/BOM；JSON 带 BOM 会让 Vite/PostCSS 解析失败。批量编辑必须保留编码，或用编辑工具。
15. **文档也是产物**：公开包需要生命周期、代码地图、前后端边界、Agent 手册、维护/废弃说明；只写 API 列表不算可维护。
16. **一次只加一个动作**：`git add -A` 会把生成物/敏感产物带进提交；显式列出路径。
17. **先证明网络层**：npm registry TCP 超时与 token 401 是不同故障；先 `npm ping`，再谈认证。
18. **包重命名要全链路**：package.json、imports、tsconfig、lock、pack-smoke 解包路径、starter 都必须同步，否则单测绿但交付包坏。
