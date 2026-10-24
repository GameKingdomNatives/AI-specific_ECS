#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const strict = process.argv.includes('--strict');
const errors = [];
const tablePath = join(ROOT, 'contracts', 'harness.json');
const capabilitiesPath = join(ROOT, 'contracts', 'capabilities.json');

function readJson(path) {
  if (!existsSync(path)) {
    errors.push(`缺少 ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    errors.push(`${path} 不是合法 JSON`);
    return null;
  }
}

const table = readJson(tablePath);
const capabilities = readJson(capabilitiesPath);
if (table !== null) {
  if (!Array.isArray(table.rules) || table.rules.length === 0) errors.push('harness.rules 必须是非空数组');
  const ids = new Set();
  for (const rule of table.rules ?? []) {
    const required = ['id', 'title', 'guide', 'sensor', 'negativeTest', 'severity', 'approval', 'status', 'scope'];
    for (const field of required) {
      if (rule[field] === undefined) errors.push(`${rule.id ?? '?'} 缺少字段 ${field}`);
    }
    if (typeof rule.id !== 'string' || !/^[A-Z]+-\d{3}$/.test(rule.id)) errors.push(`规则 id 不合法：${rule.id}`);
    if (ids.has(rule.id)) errors.push(`规则 id 重复：${rule.id}`);
    ids.add(rule.id);
    if (typeof rule.guide === 'string' && !existsSync(join(ROOT, rule.guide))) errors.push(`${rule.id} guide 不存在：${rule.guide}`);
    if (rule.status === 'implemented') {
      if (typeof rule.sensor === 'string' && !existsSync(join(ROOT, rule.sensor))) errors.push(`${rule.id} sensor 不存在：${rule.sensor}`);
      if (typeof rule.negativeTest === 'string' && rule.negativeTest.includes('#')) {
        const [file, caseName] = rule.negativeTest.split('#');
        if (!existsSync(join(ROOT, file))) errors.push(`${rule.id} negativeTest 文件不存在：${file}`);
        else if (!readFileSync(join(ROOT, file), 'utf8').includes(caseName)) errors.push(`${rule.id} negativeTest 用例不存在：${caseName}`);
      } else if (typeof rule.negativeTest === 'string' && !existsSync(join(ROOT, rule.negativeTest))) {
        errors.push(`${rule.id} negativeTest 不存在：${rule.negativeTest}`);
      }
    }
    if (!['implemented', 'planned'].includes(rule.status)) errors.push(`${rule.id} status 只能是 implemented/planned`);
  }
  const implemented = (table.rules ?? []).filter((rule) => rule.status === 'implemented').length;
  const total = (table.rules ?? []).length;
  console.log(`规则闭环：implemented ${implemented}/${total}（planned ${total - implemented}）`);
  if (strict && implemented !== total) errors.push(`strict 模式要求全部 implemented（当前 ${implemented}/${total}）`);
}

if (capabilities !== null) {
  if (!Array.isArray(capabilities.systems) || capabilities.systems.length === 0) errors.push('capabilities.systems 必须是非空数组');
  for (const system of capabilities.systems ?? []) {
    if (typeof system.id !== 'string') errors.push('capability 缺少 id');
    if (typeof system.card === 'string' && !existsSync(join(ROOT, system.card))) errors.push(`${system.id} 系统卡不存在：${system.card}`);
    if (typeof system.contractTest === 'string' && !existsSync(join(ROOT, system.contractTest))) errors.push(`${system.id} 契约测试不存在：${system.contractTest}`);
    if (typeof system.scene === 'string' && !existsSync(join(ROOT, system.scene))) errors.push(`${system.id} scene 不存在：${system.scene}`);
  }
  console.log(`能力注册表：${(capabilities.systems ?? []).length} 个系统`);
}

if (errors.length > 0) {
  console.error(`Harness 规则检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('Harness 规则表通过');
