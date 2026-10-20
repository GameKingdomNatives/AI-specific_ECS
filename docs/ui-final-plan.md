# 最终 UI 方案（2026-10-21，Onlook 已排除）

- 状态：已定（替代 ADR-002 中的 Onlook 路线；实施依据 ADR-009 与提案 003）
- 适用：`apps/game` 的 DOM 覆盖层（控制条、状态、面板），不含 Pixi 战场绘制

## 1. 目标与非目标

目标：

1. 设计师**不离开 Figma**、不安装任何工程工具即可参与 UI 设计与验收；
2. 开发者以同一套组件契约实现，Storybook 作为双方共同验收面；
3. UI 与引擎**单向依赖**：UI 只读快照、只发意图，不能直接改世界；
4. 组件可独立运行（Storybook 不需要游戏、不需要 Docker）。

非目标：

- 不做「在浏览器里直接拖拽写回源码」的编辑器（Onlook 已排除，原因见 `docs/lessons/2026-10-ui-tooling.md`）；
- 不让设计师接触 Node/Bun/Docker/Supabase；
- 不在本轮重做战场渲染。

## 2. 架构

```
Pixi canvas（战场）          React 19 DOM 覆盖层（UI）
        │                            ▲
        │ 渲染表                      │ UiSnapshot（10Hz 只读）
        ▼                            │
   ECS 世界 ── 主循环 ── UiStore ─────┘
        ▲                            │
        └──── UiIntents（存档/读档/导出…）── controls.ts
```

- `apps/game/src/ui/**` 只允许 import `react` 与本地快照类型；**禁止** import `packages/**` 或应用控制器（depcruise 规则已强制）。
- 快照由主循环每 10 tick 推送一次（约 166ms），不参与逻辑 tick。
- 副作用（存档、导出、下载）集中在 `apps/game/src/controls.ts`。

## 3. 数据契约

`UiSnapshot`（`apps/game/src/ui/snapshot.ts`）：

| 字段 | 含义 |
|---|---|
| `tick` | 逻辑 tick |
| `entities` / `bullets` / `kills` / `bodies` | 世界计数 |
| `recordingTicks` / `dumps` | 录制长度 / 诊断条数 |
| `audioPlays` | 音频端口播放计数 |
| `hash` / `dataStatus` / `mode` | 确定性哈希 / 内容状态 / 运行模式 |
| `note` | 操作反馈（含隔离档计数） |

`UiIntents`：`save` / `load` / `clear` / `exportRecording` / `exportDumps`。

## 4. 组件清单与状态矩阵

| 组件 | 状态 | Storybook 故事 |
|---|---|---|
| `App`（控制条） | 就绪 / 有诊断 / 存档失败 | 已覆盖 3 个 |
| `App`（按钮） | hover / focus-visible / disabled | 待补 |
| `App`（状态行） | 普通 / 长文本截断 / 错误色 | 待补 |
| `Panel`、`List`、`Tooltip` | — | 待拆 |

## 5. 设计 token

| 类别 | 值 |
|---|---|
| 页面底色 | `#111111` |
| 文字 | `stone-200`（主）/ `stone-400`（次要）/ `stone-500`（弱） |
| 按钮 | 底 `stone-900`，边 `stone-700`，hover `stone-800`，圆角 6px |
| 字号 | 控制条 13px，统计行 12px，单行 |
| 间距 | 4 的倍数（gap-2 = 8px，内边距 5×10） |
| 字体 | 等宽（`font-mono`） |

新增 token 必须先改本文档，再改组件与 story。

## 6. 交付物

| 交付物 | 位置 | 面向 |
|---|---|---|
| 组件源码 | `apps/game/src/ui/` | 开发 |
| 故事 | `apps/game/src/ui/App.stories.tsx` | 设计+开发 |
| 静态 Storybook | `npm run storybook:build` → `artifacts/storybook-static` | 设计（浏览器直接打开） |
| 设计上手 | `docs/runbooks/05-设计师上手.md` | 设计 |
| 工程落地 | `docs/runbooks/06-UI工程落地.md` | 开发/合作方 |
| 交接清单 | 本文档 §4/§5 | 双方 |

## 7. 里程碑

- **M1（已完成）**：React 覆盖层 + Tailwind + Storybook 三故事 + 静态包可构建。
- **M2**：控制条拆成 `ControlBar`/`StatusNote`/`StatRow`，补齐 hover/disabled/空状态故事。
- **M3**：Figma Dev Mode（含 MCP）接入：设计稿上下文 → 组件实现；设计方需 Dev/Full seat。
- **M4（可选）**：视觉回归（截图基线比对），仅在组件数量上来后做。

## 8. 验收标准

1. `npm run storybook` 起得来，设计师能并排比对 Figma；
2. `npm run storybook:build` 产出静态包，可 zip 发给设计方；
3. `npm run gate` 全绿（含 storybook 构建步骤与 `ui/**` 依赖规则）；
4. 设计师无需安装 Node/Docker 即可参与（静态包路径已验证）。
