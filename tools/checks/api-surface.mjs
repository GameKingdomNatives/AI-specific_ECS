#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SNAPSHOT = join(ROOT, 'contracts', 'api-surface.json');
const STARTER = join(ROOT, 'starters', 'ui-storybook-kit', 'package.json');
const errors = [];

if (!existsSync(SNAPSHOT)) {
  console.error('API surface 检查失败：缺少 contracts/api-surface.json');
  process.exit(1);
}
const snapshot = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
for (const [file, expected] of Object.entries(snapshot.files ?? {})) {
  const full = join(ROOT, file);
  if (!existsSync(full)) {
    errors.push(`缺少声明文件 ${file}`);
    continue;
  }
  const actual = createHash('sha256').update(readFileSync(full)).digest('hex');
  if (actual !== expected) errors.push(`API surface changed：${file}（更新快照需人工评审）`);
}
if (errors.length === 0 && !existsSync(STARTER)) errors.push('缺少 starter smoke 目标 starters/ui-storybook-kit');
if (errors.length > 0) {
  console.error(`API surface 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`API surface 检查通过：${Object.keys(snapshot.files ?? {}).length} 个公共声明 + starter`);
