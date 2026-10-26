# ADR-052 Agent Contract v1（M1）

- 状态：已接受
- 日期：2026-10-24
- 相关：`contracts/agent.json`、`tools/checks/agent-contract.mjs`、`tools/itb.mjs`
- 方向：`docs/proposals/006-Agent-原生、工具无关的自描述能力内核.md`

## 决策

1. 新增 `contracts/agent.json`：6 个 entrypoints、4 个能力；每个能力有 id/summary/command/inputs/outputs/errors。
2. `itb describe` 直接输出契约 JSON；Agent 不需要读散文文档或特定 SDK。
3. gate 新步骤 `agent-contract` 校验字段、ID 唯一、command 必须走 `tools/itb.mjs`、引用契约存在。
4. `删Agent入口` drill 验证缺 entrypoints 会红。

## 验收

- `node tools/checks/agent-contract.mjs` PASS：6 entrypoints / 4 capabilities。
- `node tools/itb.mjs describe` 输出合法 JSON。
- `删Agent入口` drill PASS。
- 全量 gate PASS。

## 边界

- 这是 M1 契约，不是 MCP；MCP 适配器仍后置。
- 描述文本中英混合，后续可统一；schema 只有 version 1。
- Agent 仍需要能执行命令或读 JSON；不承诺“自然语言自动发现”。
