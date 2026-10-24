#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const license = join(ROOT, 'LICENSE');
if (!existsSync(license)) errors.push('缺少 LICENSE');
else if (!/Apache License\s+Version 2\.0/i.test(readFileSync(license, 'utf8'))) errors.push('LICENSE 不是 Apache-2.0 文本');
for (const file of ['package.json', 'packages/engine/package.json', 'packages/fixture/package.json']) {
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    errors.push(`缺少 ${file}`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  if (pkg.license !== 'Apache-2.0') errors.push(`${file} license 必须是 Apache-2.0`);
  if (pkg.private !== true) errors.push(`${file} 在 M4 前必须保持 private:true`);
}
if (errors.length > 0) {
  console.error(`license 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('license 检查通过：Apache-2.0，全部包保持 private');
