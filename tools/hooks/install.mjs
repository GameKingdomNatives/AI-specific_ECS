#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const hooks = ['.githooks/pre-commit', '.githooks/pre-push'];
for (const hook of hooks) {
  if (!existsSync(`${root}/${hook}`)) {
    console.error(`缺少 hook：${hook}`);
    process.exit(1);
  }
}
console.log('hooks 已安装：core.hooksPath=.githooks');
console.log('  pre-commit: node tools/gate.mjs --fast');
console.log('  pre-push  : node tools/hooks/pre-push.mjs（全量 gate + stamp + main 拦截 + 深检节奏）');
