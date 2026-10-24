#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const outIndex = args.indexOf('--out');
const outDir = resolve(ROOT, outIndex >= 0 ? (args[outIndex + 1] ?? 'artifacts/deep/latest') : `artifacts/deep/${new Date().toISOString().replace(/[:.]/g, '-')}`);

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
}

function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8').trim() : '';
}

function latestGateRun() {
  const root = join(ROOT, 'artifacts', 'gate');
  if (!existsSync(root)) return null;
  const runs = readdirSync(root).sort().reverse();
  return runs.find((run) => existsSync(join(root, run, 'report.json'))) ?? null;
}

function checkStamps(head) {
  const deepPath = join(ROOT, '.gate', 'deep-stamp.json');
  let commits;
  if (existsSync(deepPath)) {
    try {
      const previous = JSON.parse(readFileSync(deepPath, 'utf8')).head;
      commits = previous === undefined ? git('rev-list', '--max-count=5', 'HEAD').split('\n') : git('rev-list', `${previous}..HEAD`).split('\n').filter(Boolean);
    } catch {
      commits = git('rev-list', '--max-count=5', 'HEAD').split('\n').filter(Boolean);
    }
  } else {
    commits = git('rev-list', '--max-count=5', 'HEAD').split('\n').filter(Boolean);
  }
  const missing = commits.filter((sha) => !existsSync(join(ROOT, '.gate', 'stamps', `${sha}.json`)));
  return { checked: commits.length, missing, headHasDeepStamp: existsSync(join(ROOT, '.gate', 'stamps', `deep-${head}.json`)) };
}

function summarizeBench(text) {
  try {
    const parsed = JSON.parse(text);
    return `${parsed.entities} entities / ${parsed.ticks} ticks / ${parsed.msPerTick} ms per tick`;
  } catch {
    return text.split('\n').slice(0, 3).join(' | ');
  }
}

const head = git('rev-parse', 'HEAD');
const tree = git('rev-parse', 'HEAD^{tree}');
const branch = git('branch', '--show-current');
const dirty = git('status', '--porcelain', '--untracked-files=no');

console.log(`[deep] head ${head.slice(0, 10)} · ${branch} · dryRun=${dryRun}`);
let gatePassed = true;
if (!dryRun) {
  console.log('[deep] 全量门禁…');
  const gate = spawnSync(process.execPath, ['tools/gate.mjs'], { stdio: 'inherit', env: process.env });
  gatePassed = gate.status === 0;
}

const gateRun = latestGateRun();
const gateReport = gateRun === null ? '' : `artifacts/gate/${gateRun}/report.md`;
const coverage = gateRun === null ? '' : readIfExists(join(ROOT, 'artifacts', 'gate', gateRun, 'coverage.log'));
const replay = gateRun === null ? '' : readIfExists(join(ROOT, 'artifacts', 'gate', gateRun, 'replay.log'));
const bench = gateRun === null ? '' : readIfExists(join(ROOT, 'artifacts', 'gate', gateRun, 'bench.log'));
const stamps = checkStamps(head);
const verdict = gatePassed ? 'pass' : 'fail';

mkdirSync(outDir, { recursive: true });
const ranAt = new Date().toISOString();
const summary = {
  version: 1,
  head,
  tree,
  branch,
  dirty: dirty.length > 0,
  dryRun,
  verdict,
  gateRun,
  gateReport,
  coverage: coverage.split('\n').slice(-1)[0] ?? '',
  replay: replay.split('\n').slice(-2).join(' | '),
  bench: summarizeBench(bench),
  stamps,
  ranAt,
};
writeFileSync(join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

const lines = [
  `# Deep audit · ${ranAt}`,
  '',
  `- HEAD：\`${head}\``,
  `- tree：\`${tree}\``,
  `- 分支：${branch}`,
  `- 模式：${dryRun ? 'dry-run（未跑门禁/不写 stamp）' : 'full（全量门禁）'}`,
  `- 结论：**${verdict.toUpperCase()}**`,
  `- 门禁：${gateReport || '（无记录）'}`,
  `- 覆盖：${summary.coverage || '（无）'}`,
  `- 回放：${summary.replay || '（无）'}`,
  `- 基准：${summary.bench || '（无）'}`,
  `- 未盖章提交：${stamps.missing.length}/${stamps.checked}`,
  '',
  '## 未盖章提交（若有）',
  ...(stamps.missing.length === 0 ? ['- 无'] : stamps.missing.map((sha) => `- \`${sha.slice(0, 10)}\``)),
  '',
  '## 说明',
  '- Batch 0.2 的深检先复用 gate/coverage/replay/bench + 缺失 stamp 扫描。',
  '- 变异/属性/黄金/API/pack 在后续批次加入；当前报告不代表完整深检。',
  '- dry-run 不写 `.gate/deep-stamp.json`，不改变推送策略。',
  '',
];
writeFileSync(join(outDir, 'report.md'), lines.join('\n'));
console.log(lines.join('\n'));

if (verdict === 'pass' && !dryRun) {
  const record = { head, tree, run: outDir, at: ranAt, verdict };
  writeFileSync(join(ROOT, '.gate', 'deep-stamp.json'), `${JSON.stringify(record, null, 2)}\n`);
  mkdirSync(join(ROOT, '.gate', 'stamps'), { recursive: true });
  writeFileSync(join(ROOT, '.gate', 'stamps', `deep-${head}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(`[deep] PASS；已写 .gate/deep-stamp.json 与 deep-${head.slice(0, 10)} stamp`);
}
process.exit(verdict === 'pass' ? 0 : 1);
