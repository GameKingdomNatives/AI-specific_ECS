#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = process.cwd();
const requests = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
  { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'itb_contract', arguments: {} } },
];
const run = spawnSync(process.execPath, [join(ROOT, 'tools', 'mcp-server.mjs')], {
  cwd: ROOT,
  encoding: 'utf8',
  input: `${requests.map((request) => JSON.stringify(request)).join('\n')}\n`,
});
if (run.status !== 0) {
  console.error('MCP smoke 失败：server 退出码', run.status);
  console.error((run.stderr ?? '').slice(-500));
  process.exit(1);
}
const replies = (run.stdout ?? '')
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const byId = new Map(replies.map((reply) => [reply.id, reply]));
if (!byId.has(1) || !byId.has(2) || !byId.has(3)) {
  console.error('MCP smoke 失败：缺少响应');
  process.exit(1);
}
if (byId.get(1).result.serverInfo.name !== 'itb-agent-contract') {
  console.error('MCP smoke 失败：initialize 响应异常');
  process.exit(1);
}
const tools = byId.get(2).result.tools;
if (!Array.isArray(tools) || !tools.some((tool) => tool.name === 'itb_contract')) {
  console.error('MCP smoke 失败：tools/list 缺少 itb_contract');
  process.exit(1);
}
const text = byId.get(3).result.content?.[0]?.text ?? '';
if (!text.includes('entrypoints')) {
  console.error('MCP smoke 失败：itb_contract 返回内容异常');
  process.exit(1);
}
console.log(`MCP smoke PASS：${tools.length} tools，${replies.length} responses`);
