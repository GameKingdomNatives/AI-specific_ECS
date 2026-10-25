import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { capture } from './checks/spawn-capture.mjs';

/** 受限沙箱禁止管道子进程：git 调用统一走文件描述符重定向；失败时明确报「不可用」，不伪造值。 */
function git(args) {
  const result = capture('git', args);
  if (result.status !== 0) return null;
  return result.stdout.trim();
}

const head = git(['rev-parse', '--short', 'HEAD']);
const branch = git(['branch', '--show-current']);
const statusText = git(['status', '--porcelain']);

console.log(`HEAD      ${head ?? '(git 不可用)'}`);
console.log(`分支      ${branch === null ? '(git 不可用)' : branch}`);
if (statusText === null) {
  console.log('脏文件    (git 不可用，未统计)');
} else {
  console.log(`脏文件    ${statusText.split('\n').filter(Boolean).length}`);
}

const root = join(process.cwd(), 'artifacts', 'gate');
const runs = existsSync(root) ? readdirSync(root).sort().reverse() : [];
const last = runs.find((run) => existsSync(join(root, run, 'report.json')));
if (last !== undefined) {
  const report = JSON.parse(readFileSync(join(root, last, 'report.json'), 'utf8'));
  const failed = (report.checks ?? []).filter((check) => check.code !== 0).map((check) => check.name);
  const env = report.environment;
  console.log(`上次门禁  ${report.passed ? 'PASS' : `FAIL${failed.length > 0 ? '：' + failed.join(', ') : ''}`}  ${report.generatedAt}  ${last}`);
  if (env !== undefined) console.log(`环境      node ${env.node} · ${env.platform} · pipes ${env.pipes}`);
} else {
  console.log('上次门禁  无记录');
}
const stamps = existsSync('.gate/stamps') ? readdirSync('.gate/stamps').length : 0;
console.log(`stamp 数  ${stamps}`);
