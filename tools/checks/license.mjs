#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const errors = [];
const license = join(ROOT, 'LICENSE');
if (!existsSync(license)) errors.push('缺少 LICENSE');
else if (!/Apache License\s+Version 2\.0/i.test(readFileSync(license, 'utf8'))) errors.push('LICENSE 不是 Apache-2.0 文本');
for (const file of ['package.json', 'packages/fixture/package.json']) {
  const path = join(ROOT, file);
  if (!existsSync(path)) {
    errors.push(`缺少 ${file}`);
    continue;
  }
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  if (pkg.license !== 'Apache-2.0') errors.push(`${file} license 必须是 Apache-2.0`);
  if (pkg.private !== true) errors.push(`${file} 在公开发布前必须保持 private:true`);
}
const enginePath = join(ROOT, 'packages/engine/package.json');
if (!existsSync(enginePath)) errors.push('缺少 packages/engine/package.json');
else {
  const engine = JSON.parse(readFileSync(enginePath, 'utf8'));
  if (engine.license !== 'Apache-2.0') errors.push('packages/engine/package.json license 必须是 Apache-2.0');
  if (engine.private === true) errors.push('packages/engine/package.json 必须可发布（private:false）');
  if (engine.publishConfig?.access !== 'public') errors.push('engine publishConfig.access 必须是 public');
  if (engine.publishConfig?.registry !== 'https://registry.npmjs.org/') errors.push('engine publishConfig.registry 必须是 npmjs');
}
if (errors.length > 0) {
  console.error(`license 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log('license 检查通过：Apache-2.0；engine 可发布，root/fixture 保持 private');
