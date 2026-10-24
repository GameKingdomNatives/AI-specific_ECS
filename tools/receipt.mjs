#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const explicitRun = process.argv[2];

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function latestGateRun() {
  if (explicitRun !== undefined) return explicitRun;
  const root = join(ROOT, 'artifacts', 'gate');
  if (!existsSync(root)) return null;
  return readdirSync(root)
    .filter((run) => existsSync(join(root, run, 'report.json')))
    .sort()
    .reverse()[0] ?? null;
}

function changedFiles() {
  return git(['status', '--porcelain'])
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim())
    .filter((path) => path.length > 0);
}

function ruleSummary() {
  try {
    const table = JSON.parse(readFileSync(join(ROOT, 'contracts', 'harness.json'), 'utf8'));
    const rules = Array.isArray(table.rules) ? table.rules : [];
    return {
      implemented: rules.filter((rule) => rule.status === 'implemented').length,
      planned: rules.filter((rule) => rule.status === 'planned').length,
      total: rules.length,
    };
  } catch {
    return { implemented: 0, planned: 0, total: 0 };
  }
}

const run = latestGateRun();
if (run === null) {
  console.error('[receipt] 找不到 gate 报告；先跑 node tools/gate.mjs');
  process.exit(1);
}
const reportPath = join(ROOT, 'artifacts', 'gate', run, 'report.json');
if (!existsSync(reportPath)) {
  console.error(`[receipt] 缺少 ${reportPath}`);
  process.exit(1);
}
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const head = git(['rev-parse', 'HEAD']);
const tree = git(['rev-parse', 'HEAD^{tree}']);
const receipt = {
  version: 1,
  head,
  tree,
  gateRun: run,
  gatePassed: report.passed === true,
  generatedAt: report.generatedAt ?? null,
  checks: Array.isArray(report.checks) ? report.checks.map((check) => ({ name: check.name, code: check.code })) : [],
  changedFiles: changedFiles(),
  rules: ruleSummary(),
};
const dir = join(ROOT, 'artifacts', 'receipts');
mkdirSync(dir, { recursive: true });
const target = join(dir, `${head}.json`);
writeFileSync(target, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(`[receipt] ${receipt.gatePassed ? 'PASS' : 'FAIL'} → ${target}`);
console.log(`[receipt] tree ${tree.slice(0, 10)} · rules ${receipt.rules.implemented}/${receipt.rules.total} implemented`);
process.exit(receipt.gatePassed ? 0 : 1);
