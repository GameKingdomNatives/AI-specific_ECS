# 质量术语速查：属性测试、黄金夹具、变异测试与 Harness

> 目的：用一页解释规划里出现的测试术语。它们不是本项目自创，而是软件工程里成熟的实践；对 AI 生成代码尤其重要，因为“测试全绿”不代表测试真的会抓错。

## 1. 四个核心概念

### 属性测试（Property-Based Testing）

不写“输入 A 应输出 B”，而是写**对所有合法输入都应成立的性质**，由工具生成成百上千个随机输入，失败时自动缩小到最小反例。

- 例：无论场景 JSON 怎样（合法范围内），`parseScene → serialize → parseScene` 都应等价；
- 例：命令缓冲按登记顺序执行后，世界哈希应与逐条执行一致；
- 例：物理 AABB 重叠判定应满足对称性 `overlaps(a,b) === overlaps(b,a)`。
- 工具：QuickCheck（Haskell 起源）、Hypothesis（Python）、`fast-check`（TypeScript/JavaScript）。

### 黄金夹具 / 批准测试（Golden Master / Approval Tests）

把“当前被认为正确”的完整输出（JSON、渲染表、场景快照、截图）存为**批准文件**；以后每次运行生成新输出，与批准文件逐字/逐像素比较，差异必须由人明确批准后才更新。

- 适合：scene JSON 实例化结果、编辑器操作序列后的节点树、渲染表列、Storybook 页面截图；
- 不适合：每次都有合理波动的随机数据（要先固定 seed/时间）。
- 关键：它保护“整体行为”，但批准文件本身要有人审核，不能 AI 自动改批准文件。

### 变异测试（Mutation Testing）

工具在源码里注入小错误（把 `+` 改 `-`、把 `>` 改 `>=`、删掉一行），然后跑测试；如果测试仍然全绿，说明测试没覆盖/没断言到这条逻辑，这个“变异体”存活。变异分数 = 被杀死的变异体 / 总数。

- 它衡量的是**测试强度**，不是代码覆盖率；
- 成本高，通常放夜间/批次，先覆盖 core 的纯逻辑；
- 与 AI 的关系：AI 很容易写出“只覆盖行、不做断言”的测试，变异测试是照妖镜。

### 契约测试（Contract Test）

针对接口/端口的行为约定写测试：输入、输出、错误、顺序、边界。实现可以换，契约不能悄悄变；契约变更走人工审批（HARD）。

- 例：`IPhysics.raycast` 在无命中时返回什么、排序规则是什么；
- 例：`buildSchedule` 遇到环必须报 issue，而不是静默按注册顺序。

## 2. Harness、指南与传感器

- **Harness（约束系统）**：Agent 之外、用来约束和验证 Agent 的一整套指南与传感器；不是某个库。
- **前馈指南（Feedforward Guides）**：写之前告诉 AI“只能这样写”的规范、模板、技能、类型、Lint 规则。
- **反馈传感器（Feedback Sensors）**：写之后检查结果的测试、静态分析、基准、截图对比。
- **计算型（Computational）**：确定、快、便宜（tsc、ESLint、单测、依赖图、变异测试）。
- **推理型（Inferential）**：语义判断、慢、有概率（LLM Review、架构评审），只做补充。
- **Receipt（回执）**：一次改动的可重跑证据包：tree hash、命中规则、测试/变异/性能结果、审批记录；没有回执视为未交付。

## 3. 在本引擎中的具体落点

| 术语 | 本引擎例子 |
|---|---|
| 属性测试 | ECS spawn/despawn 后旧 EntityId 必失效；命令缓冲顺序确定性；场景 schema 往返；回放同 seed 同 hash |
| 黄金夹具 | demo scene 的实例化节点/实体映射；编辑器“删除+保存”后的 scene JSON；渲染表快照 |
| 变异测试 | `World` 代际检查、`CommandBuffer` 顺序、`Scheduler` 冲突校验、`scene/meta` 收敛逻辑 |
| 契约测试 | 10 个端口、9 个系统、scene schema、replay 格式、configHash 往返 |
| Harness | AGENTS.md + 规则表 + `check --changed`/`gate`/`audit --deep` + Receipt |

## 4. 系统学习来源（简短）

### 免费/在线

- Martin Fowler, *Harness engineering for coding agent users*：<https://martinfowler.com/articles/harness-engineering.html>
- Google, *Software Engineering at Google*（免费在线）：<https://abseil.io/resources/swe-book>
- Robert Nystrom, *Game Programming Patterns*（免费在线）：<https://gameprogrammingpatterns.com/>
- Fred Hebert, *Property-Based Testing with PropEr, Erlang, and Elixir*：<https://propertesting.com/>
- `fast-check` 文档：<https://fast-check.dev/>；Hypothesis 文档：<https://hypothesis.readthedocs.io/>
- ApprovalTests：<https://approvaltests.com/>
- Google Testing Blog：<https://testing.googleblog.com/>

### 书（长期可维护/测试）

- Michael Feathers, *Working Effectively with Legacy Code*（如何给遗留代码补测试）
- Steve Freeman & Nat Pryce, *Growing Object-Oriented Software Guided by Tests*（测试驱动与契约）
- Kent Beck, *Test-Driven Development: By Example*
- Martin Fowler, *Refactoring: Improving the Design of Existing Code*
- John Ousterhout, *A Philosophy of Software Design*（复杂度与模块边界）
- Nicole Forsgren et al., *Accelerate*（持续交付与质量指标）
- Jason Gregory, *Game Engine Architecture*（引擎分层与运行时）
- Roy Osherove, *The Art of Unit Testing*

### 论文/综述

- John Hughes, *QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs*
- Yue Jia & Mark Harman, *An Analysis and Survey of the Development of Mutation Testing*

> 说明：这些是通用软件工程/游戏引擎知识，不是某个商业课程的“秘籍”。本项目的具体组合（Harness + Receipt + 规则闭环）是在本地研究文档、Docker/CI 实践与上述资料基础上的工程化设计，需要在本仓库里持续验证。

## 5. 使用边界

- 属性测试要写“真性质”，不要把实现抄一遍当性质；
- 黄金夹具的批准文件必须人审，不能让 AI 自动更新；
- 变异测试分数不是越高越好，先覆盖 core，再扩展；
- 契约测试不能替代集成/浏览器验收，只是边界行为的快速裁判。
