# ADR 009 · 设计侧工具链改为 Figma 优先，Onlook 降为可选

- 日期：2026-10-21
- 状态：已接受（用户指出：工具要给设计方用，需贴合其 Figma 习惯）
- 影响：ADR-002 的「Onlook 自托管」结论降级；不改引擎代码

## 背景

ADR-002 曾把 Onlook 自托管定为 UI 可视化编辑方案。实际推进中发现：

1. Onlook 源码安装链在 Windows + 国内网络下连续失败（Bun → Supabase CLI → Docker → 迁移 0008 的 Storage 限制），且上游仓库存在配置与源码不一致（`[functions.stripe-webhook]` 指向未跟踪的文件）；
2. 稳定产物只有 GitHub Releases 的桌面安装包（最新 v0.2.32，2025-07），是否支持打开本地项目未验证；
3. 真正的使用者是**设计师**，其习惯是 Figma。让设计师为了改几个按钮去装 Bun/Docker/Supabase，是把工程成本转嫁给了错误的人。

## 决定

- **设计源仍是 Figma**：设计师不需要离开 Figma，也不需要安装任何工程工具。
- 代码侧接收设计的三条通道（按优先级）：
  1. **Figma Dev Mode**（含 Dev Mode MCP，若设计方有 Dev/Full seat）：AI/开发直接读取设计上下文，生成 `apps/game/src/ui/**` 的 React + Tailwind 组件；
  2. **手工/半自动转换**：设计给标注与切图，开发按现有 `UiSnapshot` + `UiIntents` 契约实现，Storybook 作为验收面；
  3. **Figma 插件导出**（Locofy / Anima 等，商业）作为补充，不进入关键路径。
- **Storybook 是设计-开发的共同验收面**：设计师看组件状态，开发看 props 契约；`npm run storybook` 无需 Docker。
- **Onlook 降为可选**：仅在「需要实时在真实组件上拖拽」时试用桌面安装包（v0.2.32）；不进里程碑，不阻塞引擎。
- 若未来重启 Onlook：固定 release tag（禁止 main）、固定 supabase 2.53.6 二进制（本机已验证 `%USERPROFILE%\tools\supabase\supabase.exe`，sha256 `2D4C36C2…`），并接受 0008 迁移的本地补丁。

## 设计师上手路径（目标：零工程环境）

1. 打开 Figma 里的本项目设计稿；组件命名与 `src/ui` 组件一一对应（按钮/状态行/面板）。
2. 用 Figma Dev Mode 查看间距、颜色、字号 token；改稿后通知开发。
3. 打开 Storybook（`http://localhost:6006`，由开发起）对照真实渲染，提交差异清单。
4. 不需要 Bun / Docker / Supabase / Node。

## 不做

- 不再把 Onlook 自托管作为交付前提。
- 不让设计方接触包管理器、数据库或迁移。

## 验证

- `npm run storybook` 在无 Docker 环境可用（本机已验证，三个故事）。
- 引擎门禁不依赖 Onlook（全量 gate 通过）。
