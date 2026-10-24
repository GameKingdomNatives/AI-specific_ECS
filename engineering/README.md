# 夜间审计报告目录

本目录存放每晚 20:00 本地夜检的 Markdown/JSON 报告；由 `tools/nightly.mjs` 生成。

- `audits/<YYYY-MM-DD>/report.md`：深检摘要（门禁、覆盖、回放、bench、未盖章提交）。
- `audits/<YYYY-MM-DD>/summary.json`：机器可读摘要。
- `audits/<YYYY-MM-DD>/dsh-prompt.md`：给 DSH 独立会话的只读提示（当前由宿主 schedule 投递）。
- 原始大日志/覆盖率文件留在 `artifacts/`，不进本目录。

约束：

- 本目录是**工程产物**，不被引擎/应用 import；
- 夜间任务只读代码，不自动改代码/门禁/批准文件；
- `engineering/audits/`、`engineering/source/`、`nightly.log` 当前被 `.gitignore` 忽略，属于**本机产物**，不保证随仓库归档；需要长期留档时把摘要复制到 `docs/audits/` 或调整 ignore 策略。
