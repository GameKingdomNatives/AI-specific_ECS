#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const POLICY = join(ROOT, 'contracts', 'export-policy.json');
const errors = [];

if (!existsSync(POLICY)) {
  console.error('export policy 检查失败：contracts/export-policy.json 不存在');
  process.exit(1);
}
let policy;
try {
  policy = JSON.parse(readFileSync(POLICY, 'utf8'));
} catch {
  console.error('export policy 检查失败：不是合法 JSON');
  process.exit(1);
}
if (policy.version !== 1) errors.push('version 必须是 1');
const runtime = policy.runtimeKernel;
if (runtime === undefined) errors.push('缺少 runtimeKernel');
if (runtime !== undefined) {
  const pkgPath = join(ROOT, runtime.package, 'package.json');
  if (!existsSync(pkgPath)) errors.push(`运行时包不存在：${runtime.package}`);
  else {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const files = new Set(pkg.files ?? []);
    for (const include of runtime.include ?? []) {
      if (!files.has(include)) errors.push(`运行时 package.files 缺少 ${include}`);
    }
    for (const exclude of policy.engineeringKernel?.devOnly ?? []) {
      for (const file of files) {
        if (file === exclude || file.startsWith(`${exclude}/`)) errors.push(`运行时包不应包含 dev-only：${file}`);
      }
    }
  }
}
if (policy.engineeringKernel?.path === undefined) errors.push('缺少 engineeringKernel.path');

if (errors.length > 0) {
  console.error(`export policy 检查失败（${errors.length} 项）：`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`export policy 检查通过：runtime=${runtime.include.join(', ')}；工程内核仅 dev-only`);
