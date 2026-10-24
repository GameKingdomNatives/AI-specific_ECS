#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const started = performance.now();
const steps = [];

function run(label, args) {
  const at = performance.now();
  const result = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env: process.env });
  const ms = Math.round(performance.now() - at);
  steps.push({ label, code: result.status ?? 1, ms });
  return result.status === 0;
}

function changedFiles() {
  const result = spawnSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return [];
  return (result.stdout ?? '')
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((path) => path.length > 0 && !path.startsWith('.archify/') && !path.startsWith('engineering/'));
}

const changed = changedFiles();
const tsFiles = changed.filter((file) => file.endsWith('.ts') && existsSync(join(ROOT, file)));

console.log(`[check] changed ${changed.length} 个文件`);
let ok = true;
ok = run('harness', ['tools/checks/harness.mjs']) && ok;
ok = run('registry', ['tools/checks/registry.mjs']) && ok;
ok = run('tsc', ['node_modules/typescript/bin/tsc', '-b']) && ok;

if (tsFiles.length > 0) {
  ok = run('eslint', ['node_modules/eslint/bin/eslint.js', ...tsFiles]) && ok;
} else {
  console.log('[check] 没有改动的 .ts，跳过 eslint');
}

const testDir = join(ROOT, 'packages', 'engine', 'dist', 'tests');
const engineSource = changed.some((file) => file.startsWith('packages/engine/src/'));
if (engineSource && existsSync(testDir)) {
  const tests = readdirSync(testDir).filter((file) => file.endsWith('.test.js'));
  const keywords = changed
    .filter((file) => file.startsWith('packages/engine/src/'))
    .flatMap((file) => file.split('/').slice(-1)[0].replace(/\.ts$/, '').split('-'));
  const selected = tests.filter((test) => keywords.some((keyword) => keyword.length > 2 && test.includes(keyword)));
  const runnable = selected.length > 0 ? selected : tests;
  for (const test of runnable) {
    ok = run(`test ${test}`, [join(testDir, test)]) && ok;
  }
} else {
  console.log('[check] 没有引擎源码改动，跳过引擎测试');
}

const total = Math.round(performance.now() - started);
console.log(`[check] ${ok ? 'PASS' : 'FAIL'} · ${total}ms`);
for (const step of steps) console.log(`  ${step.label.padEnd(28)} ${step.code === 0 ? 'PASS' : 'FAIL'} ${step.ms}ms`);
process.exit(ok ? 0 : 1);
