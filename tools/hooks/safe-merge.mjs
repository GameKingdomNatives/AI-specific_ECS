#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
process.chdir(root);

const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
if (branch === 'main' || branch === 'master') {
  console.error('[safe-merge] 请在 feature 分支运行；当前在 main。');
  process.exit(1);
}
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (dirty.length > 0) {
  console.error('[safe-merge] 工作区有未提交改动；先提交再合并。');
  process.exit(1);
}

console.log(`[safe-merge] 全量门禁（${branch}）…`);
const gate = spawnSync(process.execPath, ['tools/gate.mjs'], { stdio: 'inherit', env: process.env });
if (gate.status !== 0) {
  console.error('[safe-merge] 门禁失败，未合并。');
  process.exit(gate.status ?? 1);
}

console.log(`[safe-merge] 合并 ${branch} → main（ff-only）…`);
execFileSync('git', ['checkout', 'main'], { stdio: 'inherit' });
const merge = spawnSync('git', ['merge', '--ff-only', branch], { stdio: 'inherit' });
if (merge.status !== 0) {
  execFileSync('git', ['checkout', branch], { stdio: 'inherit' });
  console.error('[safe-merge] ff-only 合并失败（main 可能已有分叉）；请先 rebase。');
  process.exit(merge.status ?? 1);
}

console.log('[safe-merge] 推送 main（带 ALLOW_MAIN_PUSH=1）…');
const push = spawnSync('git', ['push', 'origin', 'main'], {
  stdio: 'inherit',
  env: { ...process.env, ALLOW_MAIN_PUSH: '1' },
});
if (push.status !== 0) {
  console.error('[safe-merge] 推送失败；本地 main 已合并，远端未更新。修复后重试。');
  process.exit(push.status ?? 1);
}
console.log('[safe-merge] PASS：main 已合并并推送。');
