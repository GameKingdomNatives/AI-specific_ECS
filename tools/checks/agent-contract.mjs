#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const PATH = join(ROOT, 'contracts', 'agent.json');
const errors = [];

if (!existsSync(PATH)) {
  console.error('agent contract 检查失败：contracts/agent.json 不存在');
  process.exit(1);
}
let contract;
try {
  contract = JSON.parse(readFileSync(PATH, 'utf8'));
} catch {
  console.error('agent contract 检查失败：agent.json 不是合法 JSON');
  process.exit(1);
}

if (contract.version !== 1) errors.push('version 必须是 1');
if (typeof contract.name !== 'string' || contract.name.length === 0) errors.push('缺少 name');
if (!Array.isArray(contract.entrypoints) || contract.entrypoints.length === 0) errors.push('缺少 entrypoints');
const ids = new Set();
for (const entry of contract.entrypoints ?? []) {
  for (const field of ['id', 'command', 'output']) if (entry[field] === undefined) errors.push(`${entry.id ?? '?'} 缺少 ${field}`);
  if (ids.has(entry.id)) errors.push(`entrypoint id 重复：${entry.id}`);
  ids.add(entry.id);
  if (typeof entry.command === 'string' && !entry.command.includes('tools/itb.mjs')) errors.push(`${entry.id} command 必须走 tools/itb.mjs`);
}
if (!Array.isArray(contract.capabilities) || contract.capabilities.length === 0) errors.push('缺少 capabilities');
for (const capability of contract.capabilities ?? []) {
  for (const field of ['id', 'summary', 'command', 'inputs', 'outputs', 'errors']) {
    if (capability[field] === undefined) errors.push(`${capability.id ?? '?'} 缺少 ${field}`);
  }
  if (typeof capability.command === 'string' && !capability.command.includes('tools/itb.mjs')) errors.push(`${capability.id} command 必须走 tools/itb.mjs`);
}
for (const path of contract.contracts ?? []) {
  if (!existsSync(join(ROOT, path))) errors.push(`引用契约不存在：${path}`);
}

if (errors.length > 0) {
  console.error(`agent contract 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`agent contract 检查通过：${contract.entrypoints.length} entrypoints / ${contract.capabilities.length} capabilities`);
