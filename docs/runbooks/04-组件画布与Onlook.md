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

**Bun 是硬依赖**：仓库 `package.json` 写死 `packageManager: bun@1.3.1`，带 `bun.lock` 与 `bunfig.toml`（hoisted linker），官方全部命令都是 `bun`。没有 Bun 就先装。

### 2.1 安装 Bun（Windows，本机实测可用）

```powershell
cd $env:USERPROFILE
npm install -g bun --ignore-scripts=false
bun --version          # 本机实测输出 1.4.3
where.exe bun          # 应命中 %APPDATA%\npm\bun.cmd
```

- 若 `bun` 仍提示无法识别：重开一个终端（PATH 需要刷新）。
- 官方脚本（bun.sh 可达时）：`powershell -c "irm bun.sh/install.ps1 | iex"`；本次沙箱访问 bun.sh 超时，所以走 npm 方式。
- Onlook 固定 `bun@1.3.1`，1.4.x 实测可运行；若 `bun install --frozen-lockfile` 因版本报错，再装指定版本。

### 2.2 Onlook 官方本地步骤

来源：仓库 `docs/content/docs/developers/running-locally.mdx`（2026-10-21 克隆核对）。前置：Bun、Docker Desktop、Node ≥ 20.16。

```powershell
git clone https://github.com/onlook-dev/onlook.git
cd onlook
bun install

# 起后端（Docker 里跑 Supabase），记下输出里的 anon key 与 service role key
bun backend:start

# 准备三把钥匙：CodeSandbox API token、OpenRouter key、Morph 或 Relace 的 Fast Apply key
bun run setup:env        # 交互式写 .env；脚本在 packages/scripts

bun db:push              # 初始化 schema（提示交互时：cd packages/db && bun run db:push）
bun db:seed              # 测试用户与项目
bun dev                  # http://localhost:3000
```

命令含义（取自仓库 `package.json`）：`backend:start = bun --filter @onlook/backend start`、`setup:env = cd packages/scripts && bun run start`。

#### 若 `bun install` 卡在 `free-email-domains` postinstall

现象：

```
error: postinstall script from "free-email-domains" exited with 1
  Error: Request timed out   at simple-get/index.js:76
```

原因：该包的 postinstall 会联网刷新域名列表，超时时在 socket 回调里抛错而不是走它自己的回退分支。
**这个脚本是可选的**：`domains.js` 直接 `require('./domains.json')`，列表随包发布。

处理（实测可行）：

```powershell
cd E:\Onlook\onlook
bun install --ignore-scripts
```

验证包仍可用（2026-10-21 实测）：

```powershell
bun -e "import('free-email-domains').then(m => console.log((m.default||m).length))"
# 输出 31163
```

如果之后某一步提示缺少生成的产物（例如 esbuild/sharp 的本地产物），再在**网络可用时**补跑：

```powershell
bun install          # 或给代理：$env:HTTPS_PROXY="http://127.0.0.1:端口"
```

### 2.3 只用 Docker 部署可以吗

不行，至少仍需要 Bun：`docker-compose.yml` 只起 `web-client`（3000），需要 `apps/web/client/.env`，并依赖外部网络 `supabase_network_onlook-web`；官方文档的 compose 流程同样先 `bun install` + `bun run setup:env`。

### 2.4 接入本项目

1. 先把本仓库推到 GitHub（Onlook 通过 GitHub 授权读取/写回）。
2. Onlook 里连接该仓库，工作目录选仓库根。
3. 画布来源二选一：
   - 指向 Storybook（`npm run storybook` → `http://localhost:6006`）；
   - 或指向 `npm run dev` 的页面（`http://localhost:5173`），但注意 Onlook 编辑的是 **DOM 覆盖层**，战场 canvas 不在其编辑范围。
4. Onlook 写回的改动仍然走同一套门禁：`node tools/gate.mjs` 通过后才提交；`apps/game/src/ui/**` 的依赖规则（不得 import 引擎/控制器）会拦住越界改动。

## 3. 常见问题

| 现象 | 处理 |
|---|---|
| `bun` 无法识别 | `npm install -g bun --ignore-scripts=false`（本机实测 1.4.3），重开终端后 `where.exe bun` 确认 |
| `bun.sh` 安装脚本超时 | 用上面的 npm 方式；两者装的是同一个二进制 |
| `bun install` 因锁文件版本报错 | 仓库固定 `bun@1.3.1`，装指定版本或去掉 `--frozen-lockfile` |
| `setup:env` 交互脚本失败 | 按仓库 docs 的 appendix 手工填 `.env`（四个 `.env.example` 分别在 `apps/web/client`、`apps/backend`、`packages/db`、`packages/stripe`） |
| Storybook 起不来、提示 vite 版本不匹配 | 确认 `storybook` 与 `@storybook/react-vite` 都是 10.6.x（peer 写的是 `vite ^5 \|\| ^6 \|\| ^7 \|\| ^8`） |
| 改 `vite.config.ts` 后页面样式没变 | 重启 dev server（旧进程不重载配置） |
| Onlook 连不上仓库 | 检查 GitHub OAuth 回调地址与 `.env` 里的 `NEXT_PUBLIC_*` 变量 |
| Onlook 改完本地不生效 | 确认它写回的是你的工作区分支，然后 `git diff` 看改动、跑门禁 |
