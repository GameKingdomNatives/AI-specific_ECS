#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CONTRACT = join(ROOT, 'contracts', 'agent.json');
const serverInfo = { name: 'itb-agent-contract', version: '0.1.0' };

function reply(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

function fail(id, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32601, message } })}\n`);
}

function runItb(command) {
  const result = spawnSync(process.execPath, [join(ROOT, 'tools', 'itb.mjs'), command], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const text = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return { text, ok: result.status === 0 };
}

function handle(request) {
  const { id, method, params } = request;
  if (method === 'initialize') {
    reply(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo,
    });
    return;
  }
  if (method === 'tools/list') {
    const contract = JSON.parse(readFileSync(CONTRACT, 'utf8'));
    const tools = contract.capabilities.map((capability) => ({
      name: `itb_${capability.id.replaceAll('.', '_')}`,
      description: capability.summary,
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    }));
    tools.push({
      name: 'itb_contract',
      description: '返回 contracts/agent.json 原始契约',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    });
    reply(id, { tools });
    return;
  }
  if (method === 'tools/call') {
    const name = params?.name;
    if (name === 'itb_contract') {
      reply(id, {
        content: [{ type: 'text', text: readFileSync(CONTRACT, 'utf8') }],
        isError: false,
      });
      return;
    }
    const map = {
      itb_contracts_inspect: 'inspect',
      itb_change_impact: 'impact',
      itb_change_check: 'check',
      itb_gate_full: 'gate',
    };
    const command = map[name];
    if (command === undefined) {
      fail(id, `未知工具：${String(name)}`);
      return;
    }
    const result = runItb(command);
    reply(id, { content: [{ type: 'text', text: result.text }], isError: !result.ok });
    return;
  }
  fail(id, `未知方法：${String(method)}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    try {
      handle(JSON.parse(line));
    } catch {
      fail(null, '非法 JSON-RPC 请求');
    }
  }
});
process.stdin.on('end', () => process.exit(0));
