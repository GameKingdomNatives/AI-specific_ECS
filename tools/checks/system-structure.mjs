#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIRS = [join(ROOT, 'packages', 'fixture', 'src'), join(ROOT, 'apps', 'game', 'src', 'game')];
const errors = [];
const PATTERN = /\bctx\.world\.(spawn|despawn|add|remove)\s*\(/;

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return entry.endsWith('.ts') ? [full] : [];
  });
}

for (const dir of DIRS) {
  if (!existsSync(dir)) {
    console.error(`结构变更检查失败：目录不存在 ${dir}`);
    process.exit(1);
  }
  for (const file of walk(dir)) {
    const source = readFileSync(file, 'utf8');
    if (PATTERN.test(source)) {
      errors.push(`${relative(ROOT, file).replaceAll('\\', '/')} 直接调用 ctx.world 做结构变更；必须走 CommandBuffer`);
    }
  }
}

if (errors.length > 0) {
  console.error(`结构变更检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('结构变更检查通过：系统代码没有 ctx.world 直接增删');
