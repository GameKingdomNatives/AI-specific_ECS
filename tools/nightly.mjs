#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const date = new Date().toISOString().slice(0, 10);
const outDir = join(ROOT, 'engineering', 'audits', date);
mkdirSync(outDir, { recursive: true });

console.log(`[nightly] ${date} dryRun=${dryRun} → ${outDir}`);
const deep = spawnSync(process.execPath, ['tools/deep-audit.mjs', '--out', outDir, ...(dryRun ? ['--dry-run'] : [])], {
  stdio: 'inherit',
  env: process.env,
});
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const summary = {
  date,
  head,
  deepStatus: deep.status,
  dryRun,
  note: 'Batch 0.2 nightly：深检报告 + 未盖章提交；DSH 独立会话待验证/接入',
};
writeFileSync(join(outDir, 'nightly.json'), `${JSON.stringify(summary, null, 2)}\n`);
writeFileSync(
  join(outDir, 'dsh-prompt.md'),
  `# DSH 夜间只读会话提示\n\n仓库：${ROOT}\nHEAD：${head}\n报告：${outDir}\n\n请只读审计：读取 summary.json / report.md，归纳失败项、未盖章提交、规则缺口；不要修改代码、门禁或批准文件；只允许写 engineering/audits/ 下的报告。\n`,
);
console.log(`[nightly] 完成：${deep.status === 0 ? 'PASS' : 'FAIL'}；报告 ${outDir}`);
process.exit(deep.status ?? 1);
