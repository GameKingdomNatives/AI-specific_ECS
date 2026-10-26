# ADR-055 M4 开源准备（private 阶段）

- 状态：已接受（准备，不公开）
- 日期：2026-10-24
- 相关：`LICENSE`、`README.md`、`contracts/api-surface.json`、`contracts/export-policy.json`

## 决定

1. 采用 **Apache-2.0**；添加根 `LICENSE`，根/engine/fixture 的 package.json 标记许可证。
2. 根 `README.md` 说明双内核、agent 契约、导出边界、可选 MCP、质量门禁。
3. 公开 API 仍由 `contracts/api-surface.json` 的声明哈希锁定；破坏性变更必须先改 ADR/契约。
4. **M4 之前保持 private，不执行 `npm publish`**；发布只允许本地 `npm pack` + 解包/安装冒烟。
5. 正式公开前的发布清单：
   - 全量 gate PASS；
   - `api-surface` 未漂移；
   - `export-policy` 只含 runtime；
   - LICENSE/README 审阅；
   - 用户明确批准后才移除 private/公开。

## 边界

- `private: true` 仍保留；Apache-2.0 只是许可证声明，不等于已公开。
- 不做 npm 发布，也不改远端可见性。
- 发布流程文档在真正公开时再补 dry-run 与 tag 步骤。
