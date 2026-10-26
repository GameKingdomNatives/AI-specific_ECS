# 游戏侧对引擎的反馈清单

> 来源：2026-10-25 首个游戏切片（`flux-core`）。游戏侧只记录、不擅自改引擎契约；每条进入评估后再决定归属与审批级别。

## F-01 · 引擎没有「标准变换组件」，游戏借用了测试夹具

- 现状：`Position` / `Box` / `Velocity` 定义在 `packages/fixture`（技术夹具），游戏系统为了复用渲染、插值、物理桥，只能从 `@itb/fixture` import。
- 问题：游戏是产品，夹具是测试替身；产品依赖测试替身，方向反了。
- 建议：把标准变换/尺寸组件上移为引擎的 `standard components`（新导出面 + ADR + api-surface 更新），fixture 改为 re-export。
- 级别：SOFT（新增导出）～HARD（动导出面/package.json）。
- 状态：待评估。

## F-02 · 工程内核按「单个样例场景」硬编码

- 现状：能力校验、结构扫描、契约测试扫描、测试根都写死了 demo/fixture 路径。
- 问题：真实游戏无法进门禁，只能假注册。
- 处理：已在 ADR-057 泛化（多场景、游戏测试根、游戏系统目录）。
- 状态：已处理。

## F-03 · 没有「按阵营/小队」的实体分组查询

- 现状：游戏用 `Mecha.faction` 字段 + 全量 `query(Mecha, Flux)` 过滤；实体量上千后每次系统都要扫全部机甲。
- 建议：评估「标签/分组」是否属于内核能力（`World.query` 的谓词过滤，或轻量 tag 存储）。
- 状态：待评估（当前量级无压力，先记录）。

## F-04 · 输入映射只覆盖键位动作，没有「按住/边沿」语义

- 现状：`InputSnapshot.keys` 是按下集合，系统自己判断边沿；护盾/排散/开火都靠每 tick 轮询。
- 建议：在数据层（非端口）提供 `pressed/held/released` 派生工具，避免每个游戏系统重复写边沿检测。
- 状态：待评估。

## F-05 · 渲染表没有「血条/资源条」这类 UI 图元

- 现状：辐能条由多个 `rect` 渲染项拼成，每帧重新生成、id 手工分配。
- 建议：评估是否提供「条形图元」或在 UI 层（DOM 覆盖层）提供标准组件；当前先用渲染表拼，等第二个游戏 HUD 需求出现再定。
- 状态：已绕过（记录原因，不做过度设计）。

## F-07 · 工程内核的检查脚本里有「管道子进程」旧写法

- 现状：`mcp-smoke`（stdin/out 捕获）、`package-surface`、`pack-smoke` 用 `spawnSync(..., { encoding: 'utf8' })` 走管道；受限沙箱下是 EPERM/EINVAL，且本机 `npm` 解析到需要 Node 22 的 shim，报「Node.js v22 is not installed」。
- 后果：这三步在沙箱会话里会假失败（不是代码问题），并可能被误读成「包面坏了」。
- 处理：新增 `tools/checks/spawn-capture.mjs`（stdin/out/err 全部走真实文件描述符），三处检查改用它；npm 调用加 `shell:true` 并走 `npm.cmd`。恢复 PASS。
- 状态：已处理（ADR-057 附注）。

## F-06 · 世界哈希没有「游戏状态」的约定

- 现状：应用自己把 `[Position, Box]`、`[Position, Bullet]`、`[Position, Flux]` 三组拼进哈希；换游戏就要改应用。
- 建议：引擎提供「哈希分组由产品声明」的入口（已有 `worldHashGroups`，但缺一个可配置的默认集合/文档约定）。
- 状态：待评估。
