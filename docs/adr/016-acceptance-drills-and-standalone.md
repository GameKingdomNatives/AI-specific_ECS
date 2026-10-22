# ADR-016 验收补齐：删测试／改阈值演练与 engine 独立构建

- 状态：已接受（R6a）
- 日期：2026-10-22
- 相关：§19 验收标准、`tools/drill.mjs`、`tools/checks/registry.mjs`、`tools/gate.mjs`

## 背景

§19 要求「违规演练：越界 import、删测试、改阈值三种绕过全部被拦」，但此前只有越界 import、超预算、`as any` 三类；`registry` 里虽有一条契约测试检查，但它只扫描 `src/demo/*.ts`，而 demo 目录只有 `index.ts`，实际是**空转**——把 `hit.contract.test.ts` 移走，registry 仍然通过。另外 §19 的「删掉 apps/game 后 engine 仍可独立构建」也没有自动检查。

## 决策

1. **测试基线**（`tools/test-baseline.json` + registry `checkTestBaseline`）：
   - 测试文件数不得少于基线（当前 24）；
   - 四个关键契约测试（bridge/demo/hit/weapon）必须存在；
   - 删除测试需同步更新基线并在 ADR 说明，否则门禁红。
2. **演练扩到 5 类**（`tools/drill.mjs`）：
   - 越界 import（depcruise 包装器）；
   - 文件超预算（registry）；
   - `as any`（eslint）；
   - **删测试**：临时移走 `hit.contract.test.ts` → registry 必须报「少于基线」；
   - **改阈值**：临时给 `tools/gate.mjs` 追加内容 → `gitfacts` 在无 `ALLOW_PROTECTED` 时必须报「受保护路径」。
   每类都校验「退出码非 0 且命中预期文案」，避免命令因别的原因失败被误判为拦住。
3. **engine-standalone 步骤**：门禁运行 `tsc -p packages/engine/tsconfig.json --noEmit`，证明引擎不依赖 `apps/` 即可独立类型检查。
4. 本 ADR 同步记录 `tools/` 保护路径的改动（按 `ALLOW_PROTECTED=1` 执行）。

## 后果

- 正面：§19 的三类演练真正闭环；删测试不再是「静默降覆盖」；engine 独立性成为门禁事实。
- 代价：新增基线文件需随测试增长维护（只增不减，成本很低）。
- 回退：删除 drill 两条与 `engine-standalone` 步骤即可；测试基线可放宽。

## 验收

- `node tools/drill.mjs`：5/5「拦住了 PASS」。
- 全量门禁含 `engine-standalone PASS` 与 `drill PASS`（2026-10-22 实测）。
- 待续（R6b）：HMR 旧系统 dispose、脏局 invalid 标记。
