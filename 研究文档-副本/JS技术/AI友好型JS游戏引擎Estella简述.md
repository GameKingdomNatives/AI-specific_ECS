以下是关于 Estella 引擎技术与许可信息的综述。

---

## Estella 引擎综述：许可、架构与可视化能力

### 许可模式：引擎开源，编辑器闭源

Estella 的许可策略在 2026 年经历了一次关键调整。引擎核心（运行时、TypeScript SDK、资源管线、构建 CLI、项目模板及插件 API）全部采用 Apache-2.0 许可证，可免费用于任何用途，包括商业游戏和商业产品，无版税、无席位费、无收入门槛。项目方选择 Apache-2.0 而非 MIT，是为了增加明确的专利授权和商标边界，同时保持完全宽松和商业友好。

需要特别留意的是，可视化编辑器自 v0.55.0 版本起不再是开源产品，改为在私有仓库中开发的独立闭源应用。编辑器仍可免费下载使用，但其源代码不再公开。此外，Estella 捆绑的 Spine Runtimes 并非开源，若在游戏中集成 Spine 动画，需自行从 Esoteric Software 获取许可证。

这一许可格局意味着：你的游戏逻辑和运行时完全建立在开源引擎之上，享有充分的法律保障；而可视化编辑工作流依赖于免费但闭源的官方工具。

### 架构：数据导向 ECS + C++WASM 双执行模型

Estella 的核心是一个数据导向的 Entity-Component-System (ECS) 架构，设计目标是为可扩展的游戏逻辑提供基础。其架构最显著的特征是 JSWASM 双执行模型：性能敏感的任务（变换层级、精灵批处理、物理模拟、渲染管线）在编译为 WebAssembly 的原生 C++ 核心中执行，而游戏逻辑、场景定义和响应式系统行为则完全驻留在 TypeScript 中。

TypeScript SDK 通过 Embind 绑定层与 C++ 注册表同步，形成了一个 JavaScript `World` 与原生 C++ 注册表协同工作的桥接架构。SDK 提供了 `defineComponent`、`defineSystem`、`Query`、`Commands` 等类型安全的 API，System 是纯函数，通过 `Query` 筛选出拥有特定 Component 组合的 Entity 进行处理。

C++ 核心的 ECS 注册表专为缓存友好的数据访问而构建，支持高达 4,194,304 个实体的创建、销毁和回收。系统按 `Schedule` 阶段（如 `Update`、`FixedUpdate`、`PostUpdate`）组织，支持基于依赖关系的拓扑排序执行。

### 可视化编辑器：模型权威架构

Estella 的可视化编辑器是一个基于 Electron + React 的桌面应用（WindowsmacOS），提供场景层级（Outliner）、属性检查器（Inspector）、资源浏览器（Asset Browser）和 WebGL 视口（Viewport） 等核心视图。

编辑器的关键架构特征是模型权威（Model-Authoritative） 设计：编辑器 UI 操作的是一个无损的 JSON 场景模型（Source of Truth），而运行时引擎的 `World` 是这个模型的一个“有损投影”。这意味着所有编辑操作都是可追踪、可撤销的，也使得 AI 和人工可以基于同一模型进行协同工作。

### 核心内置的可视化与调试能力

即使不依赖编辑器，Estella 的开源核心也内置了可供自行调用的可视化能力。物理模块提供了 `Physics2DDebugDraw` 类，可在运行时可视化 2D 物理形状的线框、轴对齐包围盒、动态 AABB 树以及接触流形，直接绘制到任何画布上。渲染管线中的 `ImmediateDraw` 工具提供了高性能的调试图元绘制能力（线段、矩形、圆形），无需手动管理缓冲区，支持在世界空间或屏幕空间中绘制。

### AI 协作：MCP 服务器与 Agent 原生设计

Estella 在 AI 辅助开发方面的设计是其突出特点。编辑器本身就是一个 MCP（Model Context Protocol）服务器，内置 65 个工具，允许 AI Agent（如 Claude、Cursor）直接驱动编辑器进行场景编辑和资源管理。官方同时提供了独立的 `estella-mcp-server` npm 包，可脱离编辑器单独运行，方便集成到自定义的 AI 工作流中。

编辑器还自带一个内置 Agent，它使用的正是与 MCP 服务器相同的那套工具集，形成“AI 生成 → 编辑器中人工微调”的流畅闭环。

### 跨平台发布

Estella 支持一次开发、多端发布：Web 浏览器、桌面、微信小游戏、可玩广告（Playable Ads）以及原生 AndroidiOS 应用。原生移动端通过嵌入式 Dawn（MetalVulkan）渲染，而非 WebView。

### 总结

Estella 的定位可以概括为：引擎开源、编辑器闭源、核心可视化就绪、AI 原生设计。Apache-2.0 的引擎许可为商业使用提供了充分的法律确定性；数据导向 ECS 加 C++WASM 双执行模型为高性能和可扩展性提供了架构基础；MCP 集成则为 AI 深度参与开发流程开辟了通道。对于需要“可视化编辑器用于人工介入，同时底层架构高度解耦以便于 AI 辅助开发”的场景，Estella 在开源 JS 引擎生态中是一个高度匹配的选择。唯一需要权衡的是编辑器闭源这一点——但它作为免费工具，在“人工善后处理”的使用场景中通常是可以接受的。