#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const command = args[0] ?? 'status';

function run(args_, extraEnv = {}) {
  const started = performance.now();
  const result = spawnSync(process.execPath, args_, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  return { code: result.status ?? 1, ms: Math.round(performance.now() - started) };
}

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

function capabilities() {
  try {
    return readJson('contracts/capabilities.json').systems ?? [];
  } catch {
    return [];
  }
}

function rules() {
  try {
    return readJson('contracts/harness.json').rules ?? [];
  } catch {
    return [];
  }
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return (result.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((path) => path.length > 0 && !path.startsWith('.archify/') && !path.startsWith('engineering/audits/') && !path.startsWith('engineering/source/'));
}

function scopePrefix(scope) {
  return scope.endsWith('/**') ? `${scope.slice(0, -3)}/` : scope;
}

function matchesScope(file, scope) {
  const prefix = scopePrefix(scope);
  return file === scope || file.startsWith(prefix);
}

function affectedRules(files) {
  return rules()
    .filter((rule) => Array.isArray(rule.scope) && rule.scope.some((scope) => files.some((file) => matchesScope(file, scope))))
    .map((rule) => rule.id);
}

function suggestedTests(files) {
  const dir = join(ROOT, 'packages', 'engine', 'tests');
  if (!existsSync(dir)) return [];
  const tests = readdirSync(dir).filter((file) => file.endsWith('.test.ts'));
  const keywords = files.flatMap((file) => file.split(/[\\/]/).filter((part) => part.length > 2 && part !== 'src' && part !== 'engine' && part !== 'test.ts').slice(-2));
  const selected = tests.filter((test) => keywords.some((keyword) => test.toLowerCase().includes(keyword.toLowerCase())));
  if (selected.length > 0) return selected;
  return files.some((file) => file.startsWith('packages/engine/src/')) ? tests : [];
}

function inspect() {
  const table = rules();
  const impl = table.filter((rule) => rule.status === 'implemented').length;
  console.log(`rules      ${impl}/${table.length} implemented`);
  for (const rule of table) console.log(`  ${rule.id.padEnd(10)} ${rule.status.padEnd(11)} ${rule.title}`);
  console.log(`systems    ${capabilities().length}`);
  for (const system of capabilities()) console.log(`  ${system.id.padEnd(18)} ${system.phase.padEnd(10)} ${system.card}`);
}

function impact() {
  const files = changedFiles();
  const impacted = affectedRules(files);
  const tests = suggestedTests(files);
  const gateLevel = files.some((file) => file.startsWith('tools/') || file.startsWith('.githooks/') || file === 'package.json') ? 'full' : 'fast';
  const result = {
    changed: files,
    affectedRules: impacted,
    suggestedTests: tests,
    gateLevel,
    note: 'impact 是选择器，不替代 gate；未命中的情况自动降级全量。',
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

function latestReceipt() {
  const dir = join(ROOT, 'artifacts', 'receipts');
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((file) => file.endsWith('.json')).sort().reverse();
  return files[0] ?? null;
}

function status() {
  inspect();
  const receipt = latestReceipt();
  console.log(`receipt    ${receipt ?? '（无）'}`);
}

let code = 0;
if (command === 'inspect') {
  inspect();
} else if (command === 'impact') {
  impact();
} else if (command === 'check') {
  const result = run(['tools/check-changed.mjs']);
  console.log(`[itb] check --changed ${result.code === 0 ? 'PASS' : 'FAIL'} · ${result.ms}ms`);
  code = result.code;
} else if (command === 'gate') {
  const result = run(['tools/gate.mjs']);
  if (result.code === 0) {
    const receipt = run(['tools/receipt.mjs']);
    code = receipt.code;
    console.log(`[itb] gate PASS · ${result.ms}ms · receipt ${receipt.code === 0 ? 'PASS' : 'FAIL'}`);
  } else {
    console.log(`[itb] gate FAIL · ${result.ms}ms`);
    code = result.code;
  }
} else if (command === 'receipt') {
  const result = run(['tools/receipt.mjs']);
  code = result.code;
} else if (command === 'status') {
  status();
} else {
  console.error('用法：node tools/itb.mjs <inspect|impact|check|gate|receipt|status>');
  code = 2;
}
process.exit(code);
