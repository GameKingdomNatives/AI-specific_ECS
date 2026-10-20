import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OUT = join(ROOT, 'artifacts', 'panel');
mkdirSync(OUT, { recursive: true });

function gitToFile(args, file) {
  const fd = openSync(join(OUT, file), 'w');
  spawnSync('git', args, { cwd: ROOT, stdio: ['ignore', fd, fd], windowsHide: true });
  closeSync(fd);
  const full = join(OUT, file);
  return existsSync(full) ? readFileSync(full, 'utf8') : '';
}

const head = gitToFile(['rev-parse', '--short', 'HEAD'], 'head.txt').trim();
const branch = gitToFile(['branch', '--show-current'], 'branch.txt').trim();
const statusRaw = gitToFile(['status', '--porcelain'], 'status.txt');
const changed = statusRaw.split('\n').filter((line) => line.trim().length > 0);

const gateRoot = join(ROOT, 'artifacts', 'gate');
const runs = existsSync(gateRoot) ? readdirSync(gateRoot).sort().reverse() : [];
let lastReport = null;
for (const run of runs) {
  const file = join(gateRoot, run, 'report.json');
  if (existsSync(file)) {
    lastReport = { run, ...JSON.parse(readFileSync(file, 'utf8')) };
    break;
  }
}

const stamps = existsSync('.gate/stamps') ? readdirSync('.gate/stamps') : [];
const waivers = existsSync('tools/waivers.json') ? JSON.parse(readFileSync('tools/waivers.json', 'utf8')) : [];

const qualityLog = existsSync('docs/quality-log.md') ? readFileSync('docs/quality-log.md', 'utf8') : '';
const trend = qualityLog
  .split('\n')
  .filter((line) => line.startsWith('| v'))
  .map((line) => line.split('|').map((cell) => cell.trim()).filter(Boolean));

const reviewLog = existsSync('docs/review-log.md') ? readFileSync('docs/review-log.md', 'utf8') : '';
const reviews = reviewLog
  .split('\n')
  .filter((line) => line.startsWith('| ') && !line.startsWith('| 时间'))
  .slice(-5);

const snapshot = {
  generatedAt: new Date().toISOString(),
  repo: {
    head: head || '(尚无提交)',
    branch: branch || '-',
    dirtyCount: changed.length,
    changed: changed.slice(0, 40),
  },
  gate: lastReport,
  stamps: stamps.length,
  waivers: waivers.length,
  trend,
  reviews,
  commands: [
    { label: '通过并推进', command: 'node tools/review.mjs accept --note "<理由>"' },
    { label: '退回并说明理由', command: 'node tools/review.mjs reject --note "<理由>"' },
    { label: '重跑全量门禁', command: 'node tools/gate.mjs' },
    { label: '撤销一次提交', command: 'git revert <sha>' },
    { label: '重新采集面板', command: 'node tools/panel/collect.mjs' },
  ],
};

writeFileSync(join(OUT, 'snapshot.json'), `${JSON.stringify(snapshot, null, 2)}\n`);
writeFileSync(join(OUT, 'snapshot.js'), `window.PANEL_SNAPSHOT = ${JSON.stringify(snapshot, null, 2)};\n`);
console.log(`面板数据已生成：artifacts/panel/snapshot.js（${changed.length} 个未提交文件）`);
