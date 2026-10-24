# ADR-053 可选 MCP 适配器

- 状态：已接受
- 日期：2026-10-24
- 相关：`tools/mcp-server.mjs`、`tools/checks/mcp-smoke.mjs`

## 背景

MCP 是可选表面；Agent 直接读源码/跑 CLI 是同等一等路径。适配器不能污染运行时内核。

## 决策

1. `tools/mcp-server.mjs`：stdio 行式 JSON-RPC，支持 initialize/tools/list/tools/call。
2. tools/list 从 `contracts/agent.json` 的 capabilities 派生；另加 `itb_contract` 原样返回契约。
3. tools/call 只代理 `itb inspect/impact/check/gate`；不直接 import 引擎。
4. gate 加 `mcp-smoke`：发 initialize/tools/list/itb_contract，校验响应。
5. MCP 仍然是可选路径；不要求 IDE/Agent 使用它。

## 验收

- `node tools/checks/mcp-smoke.mjs` PASS：5 tools，3 responses。
- 全量 gate PASS。

## 边界

- 行式 JSON-RPC，不是完整 MCP 传输实现；复杂客户端接入前需补 Content-Length/流式错误处理。
- 不把 MCP 依赖加进 `@itb/engine`。
