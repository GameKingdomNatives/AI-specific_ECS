# into-the-battlefield / agent-native ECS

一个 **agent 原生、工具无关的双内核代码库**：运行时内核负责 ECS/确定性，工程内核负责能力自描述、影响分析、审计与回执。任何能读写代码、执行命令的 agent 都可以直接消费；不需要专用 IDE、SDK 或插件。

> 当前仍是 **private / 预发布**。M4 前不公开、不发 npm。

## 双内核

```text
packages/engine    运行时内核：ECS、端口、调度、确定性、场景
packages/fixture   fixture：demo 组件/系统，可替换，不属于运行时内核
tools/            工程内核：gate / harness / itb / drill / receipt
contracts/        机器可读契约：agent.json / capabilities / harness / export-policy
```

运行时内核不依赖 fixture；fixture 通过 `@itb/fixture` 被应用/测试消费。

## 快速开始

```bash
npm ci
node tools/gate.mjs          # 全量门禁
node tools/itb.mjs inspect   # 规则/能力
node tools/itb.mjs describe  # agent 契约 JSON
node tools/itb.mjs impact    # 当前变更影响
```

可选 MCP：

```bash
node tools/mcp-server.mjs    # stdio JSON-RPC；不是必需路径
```

## Agent 如何发现能力

1. 读 `contracts/agent.json`；
2. 或执行 `node tools/itb.mjs describe`；
3. 按 entrypoint 调用 `itb`，拿 JSON/文本与 receipt；
4. 不需要先读散文文档，也不需要特定客户端。

## 导出边界

`contracts/export-policy.json` 是唯一 allowlist：

- 导出：`packages/engine/dist/src` + `README.md`；
- 不导出：`tools/`、`contracts/`、`docs/`、`tests/`、`artifacts/`、fixture 的开发文件；
- 运行时 package 仍是 `private: true`，只在本地 pack 验证。

## 质量

- 10 条 harness 规则均有 guide/sensor/negativeTest；
- pre-push / stamp / safe-merge / drill / Receipt；
- 属性测试（fast-check）、World 黄金测试、pack/starter 冒烟；
- 全量 gate PASS 才提交。

## 许可证

Apache-2.0。公开前的 API 冻结与发布流程见 `docs/adr/055-m4-open-source-readiness.md`。
