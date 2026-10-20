import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
  return result.status === 0 ? (result.stdout ?? '').trim() : '-';
}

const head = git(['rev-parse', '--short', 'HEAD']);
const branch = git(['branch', '--show-current']);
const dirty = git(['status', '--porcelain']).split('\n').filter(Boolean).length;
console.log(`HEAD      ${head === '-' ? '(尚无提交)' : head}`);
console.log(`分支      ${branch}`);
console.log(`脏文件    ${dirty}`);

const root = join(process.cwd(), 'artifacts', 'gate');
const runs = existsSync(root) ? readdirSync(root).sort().reverse() : [];
const last = runs.find((run) => existsSync(join(root, run, 'report.json')));
if (last !== undefined) {
  const report = JSON.parse(readFileSync(join(root, last, 'report.json'), 'utf8'));
  console.log(`上次门禁  ${report.passed ? 'PASS' : 'FAIL'}  ${report.generatedAt}  ${last}`);
} else {
  console.log('上次门禁  无记录');
}
const stamps = existsSync('.gate/stamps') ? readdirSync('.gate/stamps').length : 0;
console.log(`stamp 数  ${stamps}`);
