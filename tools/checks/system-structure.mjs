#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const DIR = join(ROOT, 'packages', 'engine', 'src', 'demo');
const errors = [];
const PATTERN = /\bctx\.world\.(spawn|despawn|add|remove)\s*\(/;

if (!existsSync(DIR)) {
  console.error(`结构变更检查失败：目录不存在 ${DIR}`);
  process.exit(1);
}

for (const entry of readdirSync(DIR)) {
  if (!entry.endsWith('.ts')) continue;
  const file = join(DIR, entry);
  const source = readFileSync(file, 'utf8');
  if (PATTERN.test(source)) {
    errors.push(`${entry} 直接调用 ctx.world 做结构变更；必须走 CommandBuffer`);
  }
}

if (errors.length > 0) {
  console.error(`结构变更检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('结构变更检查通过：系统代码没有 ctx.world 直接增删');
