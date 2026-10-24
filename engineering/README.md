# 夜间审计报告目录

本目录存放每晚 20:00 本地夜检的 Markdown/JSON 报告；由 `tools/nightly.mjs` 生成。

- `audits/<YYYY-MM-DD>/report.md`：深检摘要（门禁、覆盖、回放、bench、未盖章提交）。
- `audits/<YYYY-MM-DD>/summary.json`：机器可读摘要。
- `audits/<YYYY-MM-DD>/dsh-prompt.md`：给 DSH 独立会话的只读提示（尚未自动投递）。
- 原始大日志/覆盖率文件留在 `artifacts/`，不进本目录。

约束：

- 本目录是**工程产物**，不被引擎/应用 import；
- 夜间任务只读代码，不自动改代码/门禁/批准文件；
- 报告可以入仓；如果体积变大，保留最近 N 天，旧报告归档。
