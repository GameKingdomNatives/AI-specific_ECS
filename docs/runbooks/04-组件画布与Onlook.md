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

命令含义（取自仓库 `package.json`）：`backend:start = bun --filter @onlook/backend start`（内部是 `supabase start`）、`setup:env = cd packages/scripts && bun run start`。

#### 前置二：Supabase CLI（`supabase` 不在 Bun 里）

```powershell
cd $env:USERPROFILE
npm install -g supabase --ignore-scripts=false
supabase --version        # 本机实测 2.121.0
where.exe supabase        # %APPDATA%\npm\supabase.cmd
```

#### 前置三：Docker Desktop（`supabase start` 必须有）

`supabase start` 会在 Docker 里拉起 Postgres/Auth/Storage/Studio 等容器。没有 Docker 时的报错就是 `bun: command not found: supabase` 之后的下一条。

```powershell
winget install -e --id Docker.DockerDesktop
# 或手动下载：https://www.docker.com/products/docker-desktop/
```

安装后：重开终端 → 启动 Docker Desktop → 等到 Engine running → 验证：

```powershell
docker --version
docker info --format '{{.ServerVersion}}'
```

首次 `supabase start` 要拉约 2–3 GB 镜像，耗时取决于网络；仓库文档建议 8 GB+ 内存。

#### 没有 Docker 的替代：用云端 Supabase

`supabase start` 只是本地后端。若不想装 Docker，可以跳过 `bun backend:start`：

1. 在 <https://supabase.com> 新建项目（免费档即可），拿到：
   - Project URL
   - `anon` key
   - `service_role` key
   - 数据库连接串（Project Settings → Database → Connection string）
2. 跑 `bun run setup:env`，选择「使用已有 Supabase」/按提示填入上面的值；
   或按仓库 `apps/web/client/.env.example`、`apps/backend/.env.example`、`packages/db/.env.example` 手工填。
3. 继续：

```powershell
bun db:push      # 把 schema 推到云端数据库
bun db:seed      # 可选：测试数据
bun dev
```

注意：云端模式下 Storage/Auth 的 URL 要指向云端项目，不要残留 `http://127.0.0.1:54321` 之类的本地地址。

#### 若 `supabase start` 报 `stripe-webhook/index.ts` 不存在

现象：

```
failed to read file: open apps/backend/supabase/functions/stripe-webhook/index.ts:
no such file or directory
```

**根因（2026-10-21 核对上游仓库 HEAD）**：

- `.gitmodules` 只有 `apps/admin`（私有仓库，`onlook-dev/admin.git`，与 backend 无关）；
- `apps/backend` 不是子模块，但仓库里**没有跟踪任何 `functions/` 目录**；
- 而 `apps/backend/supabase/config.toml` 声明了 `[functions.stripe-webhook]`。

也就是说：**配置引用了仓库里不存在的函数源码**，这是上游自身的不一致，不是你的克隆方式问题。`git submodule update` 帮不上忙。

修法（任选其一，推荐 A）：

```powershell
cd E:\Onlook\onlook

# A. 在 config.toml 里把该函数禁用（Stripe webhook 与可视化编辑无关）
#    打开 apps/backend/supabase/config.toml，把
#      [functions.stripe-webhook]
#      verify_jwt = false
#    改成
#      [functions.stripe-webhook]
#      enabled = false
#      verify_jwt = false
#    或直接删掉这两行。
bun backend:start

# B. 仍然保留配置时，放一个最小桩函数（路径必须一字不差）
New-Item -ItemType Directory -Force apps\backend\supabase\functions\stripe-webhook | Out-Null
@'
Deno.serve(() => new Response(JSON.stringify({ ok: true }), {
  headers: { 'content-type': 'application/json' },
}))
'@ | Set-Content -Encoding UTF8 apps\backend\supabase\functions\stripe-webhook\index.ts
bun backend:start
```

补充：

- 官方 README（`apps/backend/README.md`）的本地顺序是：Docker 就绪 → `bun install` → 在 `apps/backend` 里 `bun run start` → `bun run reset`。
- `supabase start -x edge-runtime` 只在容器层面排除，**不解决配置里声明的函数打包**，所以它不是可靠退路（已从首选降为备选）。
- 仍失败时跑 `supabase start --debug`；若报 Docker 连接失败，先确认 Docker Desktop 已启动（`docker info` 能返回 ServerVersion）。

#### 若迁移 0008 报 `Direct deletion from storage tables is not allowed`

现象（`supabase start` 应用迁移到 `0008_preview-img-storage.sql` 时中止）：

```
ERROR: Direct deletion from storage tables is not allowed. Use the Storage API instead. (SQLSTATE 42501)
At statement: 0
delete from storage.objects where bucket_id = 'preview_images'
```

根因：该迁移的第一条语句就是直接删 `storage.objects`，而较新的 Storage 版本禁止对 storage 表做直接 DML。
仓库 `bun.lock` 钉的是 **supabase `2.53.6`**，而本机全局装的是 `2.121.0` —— CLI 版本决定它拉起的 storage 镜像版本。

修法 A（推荐，版本对齐）：

```powershell
cd E:\Onlook\onlook\apps\backend
supabase stop --no-backup        # 清掉半初始化的容器/卷
cd ..\..
npm install -g supabase@2.53.6 --ignore-scripts=false
supabase --version               # 期望 2.53.6
bun backend:start
```

修法 B（版本对齐仍失败时，本地补丁 0008）：

编辑 `apps/backend/supabase/migrations/0008_preview-img-storage.sql`，把开头两条 `delete` 换成幂等 upsert：

```sql
-- 本地兼容新版 Storage：不直接删对象，bucket 用 upsert
insert into storage.buckets (id, name, public)
values ('preview_images', 'preview_images', true)
on conflict (id) do update set public = excluded.public;
```

后面 `create policy` 等语句保持不变；然后 `supabase db reset` 或重新 `bun backend:start`。
注意这是本地偏离上游的补丁，升级 CLI 后可以还原。

版本参考：`2.45.5`、`2.53.6`、`2.5x` 系列都可用；`3.0.0-next.*` 是预发布，不要用。

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
| `bun: command not found: supabase` | `npm install -g supabase --ignore-scripts=false`（实测 2.121.0），重开终端 |
| `docker` 无法识别 / `supabase start` 起不来 | 装 Docker Desktop 并先启动它；`docker info` 能返回 ServerVersion 再跑 `supabase start` |
| 不想装 Docker | 用云端 Supabase（见 2.2「没有 Docker 的替代」），跳过 `bun backend:start` |
| `bun.sh` 安装脚本超时 | 用上面的 npm 方式；两者装的是同一个二进制 |
| `bun install` 因锁文件版本报错 | 仓库固定 `bun@1.3.1`，装指定版本或去掉 `--frozen-lockfile` |
| `setup:env` 交互脚本失败 | 按仓库 docs 的 appendix 手工填 `.env`（四个 `.env.example` 分别在 `apps/web/client`、`apps/backend`、`packages/db`、`packages/stripe`） |
| Storybook 起不来、提示 vite 版本不匹配 | 确认 `storybook` 与 `@storybook/react-vite` 都是 10.6.x（peer 写的是 `vite ^5 \|\| ^6 \|\| ^7 \|\| ^8`） |
| 改 `vite.config.ts` 后页面样式没变 | 重启 dev server（旧进程不重载配置） |
| Onlook 连不上仓库 | 检查 GitHub OAuth 回调地址与 `.env` 里的 `NEXT_PUBLIC_*` 变量 |
| Onlook 改完本地不生效 | 确认它写回的是你的工作区分支，然后 `git diff` 看改动、跑门禁 |
