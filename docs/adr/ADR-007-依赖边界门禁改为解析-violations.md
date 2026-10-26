# ADR 007 · 依赖边界门禁改为解析 violations

- 日期：2026-10-20
- 状态：已接受
- 影响：`tools/gate.mjs`、`tools/checks/depcruise.mjs`（新增）、`tools/drill.mjs`

## 背景

违规演练发现两个叠加问题，导致 `depcruise PASS` 长期是空转：

1. 无参数运行 dependency-cruiser 只打印 Usage 并退出 0；
2. 即便传了路径，`--output-type json` 下**有违规也退出 0**。

门禁只看退出码，于是边界检查从未真正生效（`depcruise.log` 里一直是 Usage 文本）。

## 决定

- 新增 `tools/checks/depcruise.mjs`：显式传入 `.`，解析 JSON 的 `summary.violations.length` 判定；
  JSON 解析失败同样判失败（杜绝「不知道跑没跑」也算通过）。
- `tools/gate.mjs` 的 depcruise 步骤改调该包装器；`depcruise.log` 仍写 JSON，供 `findings.mjs` 与面板读取。
- `tools/drill.mjs` 用 `-T err .`（该模式下违规退出 1），并在演练时清掉 `GATE_RUN`，避免把演练产生的临时 findings 写进门禁产物。

## 验证

- 无违规：`237 modules, 0 violations`，门禁 PASS。
- 演练注入 `core → impl`：包装器报 `依赖边界违规 1 项`，退出 1。
- 演练注入 312 行文件：registry 报 file-budget 并退出 1。

## 教训

「检查命令返回 0」不等于「检查通过」。凡是解析型检查，必须解析结果本身，并对「没有产出」判失败。
