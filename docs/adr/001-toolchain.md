# ADR 001 · 工具链受环境约束的三处更正

- 日期：2026-10-20
- 状态：已接受（临时，条件解除后可复议）

## 背景

《最终指令》§1 原定 pnpm + Vite 8 + Vitest 5。实际落地时发现三处与本机沙箱冲突，均已实测：

1. `pnpm install` 在生命周期脚本（esbuild postinstall）处报 `EPERM: spawn`——沙箱禁止管道子进程；且 pnpm 的隔离链接在本机不完整（`eslint` 解析不到 `debug`）。
2. `vitest` / `vite` 依赖 esbuild 子进程，同样会 `EPERM`。
3. Git Bash / `sh.exe` 无法启动：`couldn't create signal pipe, Win32 error 5`。
4. 反过来，Node 的 `spawnSync` 在**把子进程输出重定向到文件描述符**（而非管道）时可用，`node:test` 进程内执行也可用。

## 决定

| 原定 | 改为 | 理由 |
|---|---|---|
| pnpm workspace | **npm workspaces**（`workspaces` 字段，包边界不变） | pnpm 在本机跑不起来 |
| Vite 8（构建/开发服务器） | **tsc -b**（构建）＋ 静态页（应用外壳） | 不依赖子进程 |
| Vitest 5 | **node:test**，逐文件直接执行 | 进程内运行，无 spawn |
| `bash tools/*.sh` | **`node tools/*.mjs`**（Git 数据由 Node 调 git，输出重定向到 fd） | bash 不可用；语义不变 |
| `core.hooksPath=.githooks` | 保留 | 在用户自己的终端里正常生效；沙箱内失效已在 `docs/handoff.md` 记录 |

## 影响

- 包边界、分层方向、门禁阈值、端口冻结**一律不变**——只是执行载体换了。
- `apps/game` 暂为 headless 组合根；渲染接入放在第二批，届时用 `IRenderer` 端口 + 浏览器可直接加载的产物。
- 若未来沙箱放开子进程或改在普通终端运行，可恢复 pnpm / Vite / Vitest，不影响 `src/` 代码。

## 验证

`node tools/gate.mjs` 全绿（含 tsc、eslint、自定义校验、4 个测试文件、git 事实、依赖边界）。

## 更正（2026-10-20 晚）

Vite **8.3.4 在本机可用**：它已从 esbuild 换成 rolldown（原生绑定，进程内），`vite build` 与 `vite preview` 均实测通过（3.3s 完成一次构建）。因此：

- 应用层恢复 **Vite** 作为开发与构建工具（`apps/game`），产物为 ESM。
- 门禁新增 `build` 步骤（`vite build`），构建失败同样拦住提交。
- `vitest` 仍不可用：它依赖 Vite 7 侧的 esbuild 子进程；测试继续用 `node:test`。
- 浏览器加载方式：**原生 ESM**，不使用任何自制静态服务器；开发用 `vite`，预览用 `vite preview`。
