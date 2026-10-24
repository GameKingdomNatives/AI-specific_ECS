# ADR-044 门禁 fail-open 修复（G1/G2/G4）

- 状态：已接受
- 日期：2026-10-24
- 批准：用户 2026-10-24 明确批准“修复”与 `tools/` 保护路径修改
- 相关：`docs/audits/gate-fail-open-2026-10-24.md`、DSH 审计报告

## 背景

DSH 独立审计发现三处 fail-open：

- G1：`gitfacts` 用不存在的 `origin/HEAD`，且不检查退出码，未盖章提交检查实际零检查；
- G2：`findings` 永不失败，depcruise 解析失败被静默跳过；
- G4：`drill` 把 `status=null`/启动失败当成“抓住违规”。

## 决策

1. **G1**：改用 `origin/main` 作为上游；`git rev-parse --verify origin/main` 失败即报错；待推送提交用文件重定向读取（避开沙箱管道）；`git diff`/`rev-list` 失败不再返回空数组。
2. **G2**：`findings` 作为门禁：eslint/depcruise/registry 输入缺失或解析失败即非零；`findings` 非空（含 warning）即非零；depcruise 缺 `summary.violations` 判失败。
3. **G4**：drill 记录 `started = error===undefined && status!==null`；只有 `started && status!==0 && 文本命中` 才算拦住；启动失败单独显示“没跑起来”。
4. **G3** 已在 `apps/game/src/scene-runtime.ts` 清理过期 disable；不在本 ADR 的 `tools/` 范围。
5. 本轮不改 G5–G9；它们保留在缺口清单。

## 验收

- `gitfacts` 在 `origin/main` 存在时能列出未盖章提交；上游缺失/命令失败时非零。
- `findings` 对合法输入输出 0；对损坏 JSON 或 warning 非零。
- `drill` 正常环境 5/5 PASS；沙箱启动失败显示“没跑起来”而不是误判。
- 全量 gate PASS；人为负例至少覆盖“缺上游”“坏 depcruise JSON”“drill 启动失败”。

## 边界

- 这些改动只加强门禁，不改变业务代码/端口/schema。
- DSH 沙箱仍可能因管道子进程限制导致 build/storybook/drill 假红；G6（环境指纹）另案处理。
