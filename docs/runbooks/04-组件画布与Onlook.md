# 04 · 组件画布（Storybook）与 Onlook 可视化编辑

本文是**在你自己的终端**里执行的步骤。沙箱内已验证的只有 Storybook；Onlook 需要网络授权与 Docker，沙箱内做不了。

## 0. 先分清两件事

| 目标 | 工具 | 能编辑什么 |
|---|---|---|
| 看/调 UI 组件（按钮、HUD、覆盖层） | Storybook | `apps/game/src/ui/**` 里的 React 组件 |
| 在画布上直接改真实组件并写回源码 | Onlook | 同一批 React 组件（DOM），**不能**编辑 Pixi 画布里的战场 |

战场表现（贴图、粒子、弹道）始终在 Pixi canvas，Onlook 不参与。

## 1. Storybook（已验证：10.6.3 + Vite 8）

```powershell
# 组件画布（热更新，默认 http://localhost:6006）
npm run storybook

# 一次性静态构建到 artifacts/storybook-static（门禁里同一命令）
npm run storybook:build
```

已接入：
- `apps/game/.storybook/main.ts`：stories 指向 `apps/game/src/ui/**/*.stories.tsx`，框架 `@storybook/react-vite`。
- `apps/game/.storybook/preview.ts`：`layout: fullscreen`、深色背景、引入 `app.css`（Tailwind）。
- 示例：`apps/game/src/ui/App.stories.tsx`（就绪 / 有诊断 / 存档失败 三个状态）。
- 门禁：`storybook` 步骤（全量 gate 的一部分），构建失败即红。

新增组件故事：在 `src/ui/` 旁边加 `Xxx.stories.tsx`，`meta.component` 指向组件，`args` 传入 `UiSnapshot` 与 `UiIntents`（都是纯数据/函数，不需要引擎实例）。

## 2. Onlook 自托管（需你终端执行）

以下命令按 Onlook 官方仓库的通用流程整理；**具体环境变量名以仓库根目录 `.env.example` 与 README 为准**（本次沙箱访问 docs.onlook.com 被拦，未能逐字核对）。

官方入口：
- 文档：<https://docs.onlook.com/self-hosting/single-machine>
- 仓库：<https://github.com/onlook-dev/onlook>

前置：Node 22+、Bun、Docker Desktop、一个 GitHub OAuth App（用于读取仓库）。

```powershell
git clone https://github.com/onlook-dev/onlook
cd onlook
bun install
Copy-Item .env.example .env      # 按 .env.example 填写数据库与 OAuth
docker compose up -d             # 本地 Postgres/Supabase（若 README 指定）
bun dev                          # 默认 http://localhost:3000
```

接入本项目：

1. 先把本仓库推到 GitHub（Onlook 通过 GitHub 授权读取/写回）。
2. Onlook 里连接该仓库，工作目录选仓库根。
3. 画布来源二选一：
   - 指向 Storybook（`npm run storybook` → `http://localhost:6006`）；
   - 或指向 `npm run dev` 的页面（`http://localhost:5173`），但注意 Onlook 编辑的是 **DOM 覆盖层**，战场 canvas 不在其编辑范围。
4. Onlook 写回的改动仍然走同一套门禁：`node tools/gate.mjs` 通过后才提交；`apps/game/src/ui/**` 的依赖规则（不得 import 引擎/控制器）会拦住越界改动。

## 3. 常见问题

| 现象 | 处理 |
|---|---|
| Storybook 起不来、提示 vite 版本不匹配 | 确认 `storybook` 与 `@storybook/react-vite` 都是 10.6.x（peer 写的是 `vite ^5 || ^6 || ^7 || ^8`） |
| 改 `vite.config.ts` 后页面样式没变 | 重启 dev server（旧进程不重载配置） |
| Onlook 连不上仓库 | 检查 GitHub OAuth 回调地址与 `.env` 里的 `NEXT_PUBLIC_*` 变量 |
| Onlook 改完本地不生效 | 确认它写回的是你的工作区分支，然后 `git diff` 看改动、跑门禁 |
